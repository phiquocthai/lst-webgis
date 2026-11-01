"""
ai_pipeline.py — Lọc dữ liệu -> huấn luyện -> phân tích sai số cho dự báo LST TP.HCM.

Chạy (trong thư mục backend_python):
    python ai_pipeline.py
    python ai_pipeline.py --csv dataset_lst_hcm_landsat_modis_2021_2025_nghiencuu.csv --out ai_output

Quy ước chống rò rỉ dữ liệu:
  * Chia theo THỜI GIAN: train <= 2023-12-31 < val <= 2024-12-31 < test (2025).
  * Mọi ngưỡng lọc, khí hậu theo trạm-tháng, chuẩn hoá đều chỉ tính trên TRAIN.
  * Bài toán: dự báo bước kế tiếp (16 ngày sau) từ quan sát trước đó (lag) + đặc trưng cùng ngày.
  * Chỉ đánh giá trên dòng có LST đo thật (dòng thiếu LST không bao giờ làm nhãn).
  * TVDI được tính từ chính LST nên mặc định KHÔNG đưa vào đặc trưng; có bảng đối chứng (ablation).

Mô hình: Persistence, Climatology (baseline), Ridge, Random Forest, HistGradientBoosting (sklearn),
và nếu máy có thư viện: XGBoost, ARIMA (statsmodels), GCN-LSTM (torch, gcn_lstm_torch.py).
Thư viện nào thiếu sẽ được bỏ qua và ghi rõ trong báo cáo.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

TRAIN_END = "2023-12-31"
VAL_END = "2024-12-31"
SEED = 42
KEY = "ma_khu_vuc"

SKIPPED: dict[str, str] = {}
try:
    import xgboost as xgb
except Exception as e:  # noqa
    xgb = None
    SKIPPED["XGBoost"] = f"thiếu thư viện ({e.__class__.__name__})"
try:
    from statsmodels.tsa.arima.model import ARIMA
except Exception as e:  # noqa
    ARIMA = None
    SKIPPED["ARIMA"] = f"thiếu thư viện ({e.__class__.__name__})"
try:
    from gcn_lstm_torch import train_gcn_lstm, TORCH_AVAILABLE
    if not TORCH_AVAILABLE:
        raise ImportError("torch")
except Exception as e:  # noqa
    train_gcn_lstm = None
    SKIPPED["GCN-LSTM"] = f"thiếu thư viện ({e.__class__.__name__})"


# ----------------------------------------------------------------------------- metrics
def metrics(y, p) -> dict:
    y, p = np.asarray(y, float), np.asarray(p, float)
    d = y - p
    ss_tot = np.sum((y - y.mean()) ** 2)
    return {
        "n": int(len(y)),
        "MAE": float(np.mean(np.abs(d))),
        "RMSE": float(np.sqrt(np.mean(d ** 2))),
        "R2": float(1 - np.sum(d ** 2) / ss_tot) if ss_tot > 1e-9 else float("nan"),
        "MAPE_%": float(np.mean(np.abs(d) / np.abs(y)) * 100),
        "Bias(y-p)": float(np.mean(d)),
    }


# ----------------------------------------------------------------------------- 1. lọc dữ liệu
def load_and_filter(csv: str):
    raw = pd.read_csv(csv, parse_dates=["ngay"])
    log = {"rows_raw": len(raw)}
    df = raw.rename(columns={"ngay": "date"}).sort_values([KEY, "date"]).reset_index(drop=True)

    # (a) trùng lặp
    dup = df.duplicated([KEY, "date"]).sum()
    df = df.drop_duplicates([KEY, "date"], keep="first")
    log["duplicates_removed"] = int(dup)

    # (b) giá trị ngoài miền vật lý -> NaN (không sửa thành biên, tránh bịa số)
    bounds = {"lst": (15, 60), "ndvi": (-0.2, 1), "tvdi": (0, 1), "luong_mua": (0, 1000), "do_am_dat": (0, 100)}
    oob = {}
    for c, (lo, hi) in bounds.items():
        m = (df[c] < lo) | (df[c] > hi)
        oob[c] = int(m.sum())
        df.loc[m, c] = np.nan
    log["out_of_physical_range"] = oob

    # (c) thiếu LST (nhãn): giữ dòng để làm đặc trưng lag nhưng KHÔNG làm nhãn
    log["lst_missing_before_outlier"] = int(df["lst"].isna().sum())

    # (d) ngoại lai thống kê: phần dư so với khí hậu trạm-tháng (chỉ tính trên TRAIN), ngưỡng MAD-z > 4
    df["month"] = df["date"].dt.month
    is_train = df["date"] <= TRAIN_END
    clim = df[is_train].groupby([KEY, "month"])["lst"].median().rename("clim_med")
    df = df.join(clim, on=[KEY, "month"])
    resid = df["lst"] - df["clim_med"]
    tr_res = resid[is_train].dropna()
    mad = np.median(np.abs(tr_res - tr_res.median()))
    z = (resid - tr_res.median()) / (1.4826 * mad)
    out_mask = z.abs() > 4
    log["statistical_outliers_flagged"] = int(out_mask.sum())
    log["statistical_outliers_by_split"] = {
        "train": int((out_mask & is_train).sum()),
        "val": int((out_mask & (df["date"] > TRAIN_END) & (df["date"] <= VAL_END)).sum()),
        "test": int((out_mask & (df["date"] > VAL_END)).sum()),
    }
    log["mad_threshold_resid_degC"] = round(float(4 * 1.4826 * mad), 2)
    # Chỉ loại ngoại lai khỏi TRAIN/VAL (để học sạch). TEST giữ nguyên để đánh giá trung thực.
    drop_label = out_mask & (df["date"] <= VAL_END)
    df["lst_clean"] = df["lst"].mask(drop_label)
    log["labels_dropped_train_val"] = int(drop_label.sum())
    df = df.drop(columns=["clim_med"])
    return df, log


# ----------------------------------------------------------------------------- 2. đặc trưng
LC_COLS = None


def build_features(df: pd.DataFrame, use_tvdi: bool = False):
    global LC_COLS
    d = df.sort_values([KEY, "date"]).copy()
    # lag trên LST đã lọc; thiếu thì nội suy theo thời gian trong từng trạm (chỉ dùng quá khứ: ffill)
    g = d.groupby(KEY)["lst_clean"]
    d["lst_ffill"] = g.ffill()
    d["lag1"] = d.groupby(KEY)["lst_ffill"].shift(1)
    d["lag2"] = d.groupby(KEY)["lst_ffill"].shift(2)
    d["lag1_missing"] = d.groupby(KEY)["lst_clean"].shift(1).isna().astype(int)  # lag1 là giá trị điền hay đo thật
    d["roll3"] = d.groupby(KEY)["lst_ffill"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean())
    d["ms"] = np.sin(2 * np.pi * d["month"] / 12)
    d["mc"] = np.cos(2 * np.pi * d["month"] / 12)
    doy = d["date"].dt.dayofyear
    d["ds"] = np.sin(2 * np.pi * doy / 365.25)
    d["dc"] = np.cos(2 * np.pi * doy / 365.25)

    tr = d["date"] <= TRAIN_END
    clim = d[tr].groupby([KEY, "month"])["lst_clean"].mean().rename("clim")
    d = d.join(clim, on=[KEY, "month"])
    d["clim"] = d["clim"].fillna(d[tr]["lst_clean"].mean())

    lc = pd.get_dummies(d["lop_phu_be_mat"], prefix="lc", dtype=int)
    LC_COLS = list(lc.columns)
    d = pd.concat([d, lc], axis=1)

    feats = ["kinh_do", "vi_do", "lag1", "lag2", "roll3", "lag1_missing", "ms", "mc", "ds", "dc", "clim",
             "ndvi", "luong_mua", "do_am_dat"] + LC_COLS
    if use_tvdi:
        feats.append("tvdi")
    # đặc trưng môi trường thiếu -> trung vị TRAIN
    for c in ["ndvi", "luong_mua", "do_am_dat", "tvdi"]:
        d[c] = d[c].fillna(d.loc[tr, c].median())
    d = d.dropna(subset=["lag1", "lag2"])  # 2 mốc đầu mỗi trạm chưa có lịch sử
    d["split"] = np.where(d["date"] <= TRAIN_END, "train", np.where(d["date"] <= VAL_END, "val", "test"))
    return d, feats


# ----------------------------------------------------------------------------- 3. mô hình
def fit_predict_sklearn(name, make, d, feats):
    """Chọn siêu tham số trên VAL, sau đó refit TRAIN+VAL và dự báo TEST."""
    lab = d["lst_clean"].notna() | (d["split"] == "test")
    tr, va, te = (d[(d.split == s) & d["lst"].notna() & lab] for s in ["train", "val", "test"])
    tr = tr[tr.lst_clean.notna()]
    va = va[va.lst_clean.notna()]
    best, best_rmse, grid = None, 1e9, make["grid"]
    for params in grid:
        m = make["cls"](**params)
        Xa, Xb = tr[feats], va[feats]
        if make.get("scale"):
            sc = StandardScaler().fit(Xa)
            Xa, Xb = sc.transform(Xa), sc.transform(Xb)
        m.fit(Xa, tr["lst_clean"])
        r = metrics(va["lst"], m.predict(Xb))["RMSE"]
        if r < best_rmse:
            best, best_rmse = params, r
    tv = pd.concat([tr, va])
    Xa, Xt = tv[feats], te[feats]
    sc = None
    if make.get("scale"):
        sc = StandardScaler().fit(Xa)
        Xa, Xt = sc.transform(Xa), sc.transform(Xt)
    m = make["cls"](**best)
    m.fit(Xa, tv["lst_clean"])
    pred = m.predict(Xt)
    imp = getattr(m, "feature_importances_", None)
    return te.assign(pred=pred), best, best_rmse, (dict(zip(feats, map(float, imp))) if imp is not None else None)


def run_models(d, feats):
    results, preds, info = {}, {}, {}
    te = d[(d.split == "test") & d["lst"].notna()]
    va = d[(d.split == "val") & d["lst"].notna()]

    # baselines
    preds["Persistence"] = te.assign(pred=te["lag1"])
    preds["Climatology"] = te.assign(pred=te["clim"])
    for name in ["Persistence", "Climatology"]:
        info[name] = {"val_RMSE": metrics(va["lst"], va["lag1"] if name == "Persistence" else va["clim"])["RMSE"]}

    specs = {
        "Ridge": {"cls": Ridge, "scale": True, "grid": [{"alpha": a} for a in (0.1, 1, 10, 100)]},
        "Random Forest": {"cls": RandomForestRegressor,
                          "grid": [dict(n_estimators=300, max_depth=md, min_samples_leaf=ml, random_state=SEED, n_jobs=-1)
                                   for md in (6, 10, None) for ml in (1, 3)]},
        "HistGradientBoosting": {"cls": HistGradientBoostingRegressor,
                                 "grid": [dict(learning_rate=lr, max_depth=md, max_iter=300, l2_regularization=1.0, random_state=SEED)
                                          for lr in (0.03, 0.1) for md in (3, 5)]},
    }
    if xgb is not None:
        specs["XGBoost"] = {"cls": xgb.XGBRegressor,
                            "grid": [dict(n_estimators=300, learning_rate=lr, max_depth=md, subsample=0.9, random_state=SEED)
                                     for lr in (0.03, 0.1) for md in (3, 5)]}
    for name, spec in specs.items():
        p, best, vr, imp = fit_predict_sklearn(name, spec, d, feats)
        preds[name] = p
        info[name] = {"best_params": {k: v for k, v in best.items() if k != "n_jobs"}, "val_RMSE": vr, "importances": imp}

    if ARIMA is not None:
        try:
            s = d.groupby("date")["lst"].mean().sort_index()
            tr_s, va_s, te_s = s[s.index <= TRAIN_END], s[(s.index > TRAIN_END) & (s.index <= VAL_END)], s[s.index > VAL_END]
            f = ARIMA(pd.concat([tr_s, va_s]), order=(2, 1, 1)).fit().forecast(len(te_s))
            # ARIMA chỉ dự báo trung bình toàn vùng => ghép theo ngày cho mọi trạm (không có tín hiệu theo trạm)
            mp = dict(zip(te_s.index, f.values))
            preds["ARIMA (mean-region)"] = te.assign(pred=te["date"].map(mp))
            info["ARIMA (mean-region)"] = {"note": "multi-step 25 mốc, chỉ trung bình toàn vùng"}
        except Exception as e:  # noqa
            SKIPPED["ARIMA"] = f"lỗi khi chạy: {e}"
    if train_gcn_lstm is not None:
        try:
            src = d.rename(columns={"date": "thoi_gian", "lst": "gia_tri_lst"})[
                ["thoi_gian", "kinh_do", "vi_do", "gia_tri_lst", "ndvi", "luong_mua", "do_am_dat"]]
            src = src.assign(gia_tri_lst=d["lst_clean"].where(d["split"] != "test", d["lst"]).values)
            r = train_gcn_lstm(src, TRAIN_END, VAL_END, seq_len=4, epochs=200, lr=0.01)
            dates = sorted(src["thoi_gian"].unique())
            stations = sorted(set(zip(src.kinh_do, src.vi_do)))
            tdates = [x for x in dates[4:] if x > pd.Timestamp(VAL_END)]
            grid = pd.DataFrame([(dt, s[0], s[1]) for dt in tdates for s in stations], columns=["date", "kinh_do", "vi_do"])
            grid["pred"] = r["test_pred"]
            m = te.merge(grid, on=["date", "kinh_do", "vi_do"], how="inner")  # chỉ chấm điểm dòng LST đo thật
            preds["GCN-LSTM"] = m
            info["GCN-LSTM"] = {"best_val_loss": r["best_val_loss"], "note": "dùng train_gcn_lstm của project (seq_len=4)"}
        except Exception as e:  # noqa
            SKIPPED["GCN-LSTM"] = f"lỗi khi chạy: {e}"
    return preds, info


# ----------------------------------------------------------------------------- 4. phân tích sai số
def bootstrap_ci(err, B=2000, seed=SEED):
    rng = np.random.default_rng(seed)
    a = np.abs(err)
    bs = [rng.choice(a, len(a)).mean() for _ in range(B)]
    return float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))


def analyse(preds, out):
    tab = {n: metrics(p["lst"], p["pred"]) for n, p in preds.items()}
    tab = pd.DataFrame(tab).T.sort_values("RMSE")
    tab["MAE_CI95_lo"], tab["MAE_CI95_hi"] = zip(*[bootstrap_ci((preds[n]["lst"] - preds[n]["pred"]).values) for n in tab.index])
    tab.to_csv(f"{out}/metrics_test.csv", float_format="%.4f")
    best = tab.index[0]
    return tab, best


def breakdowns(p, out, name):
    p = p.copy()
    p["err"] = p["lst"] - p["pred"]
    p["abs"] = p["err"].abs()
    p["season"] = np.where(p["month"].isin([12, 1, 2, 3, 4, 5]), "Mùa khô (12-5)", "Mùa mưa (6-11)")
    p["lst_bin"] = pd.cut(p["lst"], [0, 30, 33, 36, 39, 99], labels=["<30", "30-33", "33-36", "36-39", ">39"])
    res = {}
    for col in [KEY, "lop_phu_be_mat", "month", "season", "lst_bin"]:
        t = p.groupby(col, observed=True).agg(n=("abs", "size"), MAE=("abs", "mean"),
                                              RMSE=("err", lambda e: float(np.sqrt((e ** 2).mean()))),
                                              Bias=("err", "mean"))
        res[col] = t
        t.to_csv(f"{out}/error_by_{col}.csv", float_format="%.3f")
    p.sort_values("abs", ascending=False).head(15)[["date", KEY, "lop_phu_be_mat", "lst", "pred", "err"]].to_csv(
        f"{out}/worst_15_errors.csv", index=False, float_format="%.3f")
    return p, res


def make_plots(tab, best, p, res, preds, imp, out):
    plt.rcParams.update({"font.size": 10})
    # 1 so sánh mô hình
    fig, ax = plt.subplots(figsize=(7, 3.6))
    t = tab.sort_values("RMSE", ascending=False)
    ax.barh(t.index, t["RMSE"], color="#4C78A8", label="RMSE")
    ax.barh(t.index, t["MAE"], color="#F58518", height=0.4, label="MAE")
    ax.set_xlabel("Sai số trên tập TEST (°C)"); ax.legend(); ax.set_title("So sánh mô hình (2025)")
    fig.tight_layout(); fig.savefig(f"{out}/01_model_comparison.png", dpi=150); plt.close(fig)
    # 2 thực tế vs dự báo
    fig, ax = plt.subplots(1, 2, figsize=(10, 4))
    ax[0].scatter(p["lst"], p["pred"], s=10, alpha=.6)
    lo, hi = p["lst"].min() - 1, p["lst"].max() + 1
    ax[0].plot([lo, hi], [lo, hi], "k--", lw=1); ax[0].set_xlabel("LST thực (°C)"); ax[0].set_ylabel("LST dự báo (°C)")
    ax[0].set_title(f"{best}: thực vs dự báo")
    ax[1].hist(p["err"], bins=30, color="#54A24B"); ax[1].axvline(0, color="k", lw=1)
    ax[1].set_title("Phân bố sai số (thực − dự báo)"); ax[1].set_xlabel("°C")
    fig.tight_layout(); fig.savefig(f"{out}/02_pred_vs_actual.png", dpi=150); plt.close(fig)
    # 3 sai số theo trạm / lớp phủ / tháng
    fig, ax = plt.subplots(1, 3, figsize=(14, 3.8))
    for a, (col, ttl) in zip(ax, [(KEY, "Theo khu vực"), ("lop_phu_be_mat", "Theo lớp phủ"), ("month", "Theo tháng")]):
        r = res[col]
        a.bar(r.index.astype(str), r["MAE"], color="#4C78A8"); a.set_title(f"MAE {ttl} (°C)")
        a.tick_params(axis="x", rotation=60)
    fig.tight_layout(); fig.savefig(f"{out}/03_error_breakdown.png", dpi=150); plt.close(fig)
    # 4 chuỗi thời gian vài trạm
    sts = p.groupby(KEY)["abs"].mean().sort_values().index[[0, len(p[KEY].unique()) // 2, -1]]
    fig, ax = plt.subplots(len(sts), 1, figsize=(9, 7), sharex=True)
    for a, s in zip(ax, sts):
        q = p[p[KEY] == s].sort_values("date")
        a.plot(q["date"], q["lst"], "o-", ms=3, label="thực"); a.plot(q["date"], q["pred"], "s--", ms=3, label="dự báo")
        a.set_title(f"{s} (MAE {q['abs'].mean():.2f})", fontsize=9)
    ax[0].legend(); fig.tight_layout(); fig.savefig(f"{out}/04_timeseries_stations.png", dpi=150); plt.close(fig)
    # 5 importance
    if imp:
        s = pd.Series(imp).sort_values()
        fig, ax = plt.subplots(figsize=(6, 5)); ax.barh(s.index, s.values, color="#B279A2")
        ax.set_title("Độ quan trọng đặc trưng"); fig.tight_layout(); fig.savefig(f"{out}/05_feature_importance.png", dpi=150); plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=os.path.join(HERE, "dataset_lst_hcm_landsat_modis_2021_2025_nghiencuu.csv"))
    ap.add_argument("--out", default=os.path.join(HERE, "ai_output"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    df, flog = load_and_filter(a.csv)
    d, feats = build_features(df, use_tvdi=False)
    flog["rows_after_lag_dropna"] = int(len(d))
    flog["split_rows"] = d["split"].value_counts().to_dict()
    flog["test_rows_with_observed_lst"] = int(((d.split == "test") & d.lst.notna()).sum())

    preds, info = run_models(d, feats)
    tab, best = analyse(preds, a.out)
    p, res = breakdowns(preds[best], a.out, best)

    # ablation TVDI (cùng mô hình tốt nhất kiểu cây)
    abl = {}
    d2, feats2 = build_features(df, use_tvdi=True)
    pr2, _ = run_models(d2, feats2)
    for n in ("Random Forest", "HistGradientBoosting"):
        abl[n] = {"without_TVDI_RMSE": float(tab.loc[n, "RMSE"]), "with_TVDI_RMSE": metrics(pr2[n]["lst"], pr2[n]["pred"])["RMSE"]}

    imp = info.get(best, {}).get("importances") or info.get("Random Forest", {}).get("importances")
    make_plots(tab, best, p, res, preds, imp, a.out)
    p[["date", KEY, "lop_phu_be_mat", "lst", "pred", "err"]].to_csv(f"{a.out}/test_predictions_{best.replace(' ', '_')}.csv", index=False, float_format="%.3f")

    summary = {"filter_log": flog, "model_info": info, "best_model": best, "tvdi_ablation": abl,
               "skipped": SKIPPED, "features": feats,
               "split": {"train_end": TRAIN_END, "val_end": VAL_END}}
    with open(f"{a.out}/summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2, default=str)
    pd.set_option("display.width", 200)
    print(json.dumps(flog, ensure_ascii=False, indent=1, default=str))
    print(tab.round(3)); print("best:", best); print("skipped:", SKIPPED); print("tvdi ablation:", abl)
    for k, v in res.items():
        print(f"\n[{k}]"); print(v.round(3))


if __name__ == "__main__":
    main()
