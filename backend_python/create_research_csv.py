import csv
import math
import random
from datetime import datetime, timedelta

# Seed for reproducibility
random.seed(42)

# Representative Stations / Wards across TP.HCM
STATIONS = [
    {"ma": "HCM_Q1", "ten": "Quận 1 (Trung tâm - Bến Nghé)", "kinh_do": 106.7009, "vi_do": 10.7769, "lop_phu": "Do_thi_dac", "base_lst": 36.8, "base_ndvi": 0.16, "base_tvdi": 0.72},
    {"ma": "HCM_TB", "ten": "Tân Bình (Sân bay Tân Sơn Nhất)", "kinh_do": 106.6550, "vi_do": 10.8010, "lop_phu": "Do_thi_dac", "base_lst": 37.4, "base_ndvi": 0.14, "base_tvdi": 0.76},
    {"ma": "HCM_TD", "ten": "TP. Thủ Đức (Khu Công nghệ Cao)", "kinh_do": 106.7880, "vi_do": 10.8520, "lop_phu": "Cong_nghiep", "base_lst": 36.2, "base_ndvi": 0.28, "base_tvdi": 0.65},
    {"ma": "HCM_BT", "ten": "Bình Tân (Khu công nghiệp Tân Tạo)", "kinh_do": 106.6020, "vi_do": 10.7410, "lop_phu": "Cong_nghiep", "base_lst": 36.9, "base_ndvi": 0.18, "base_tvdi": 0.74},
    {"ma": "HCM_Q7", "ten": "Quận 7 (Đô thị mới Phú Mỹ Hưng)", "kinh_do": 106.7190, "vi_do": 10.7290, "lop_phu": "Do_thi_thua", "base_lst": 34.8, "base_ndvi": 0.32, "base_tvdi": 0.58},
    {"ma": "HCM_BC", "ten": "Bình Chánh (Vùng ven đô thị)", "kinh_do": 106.5680, "vi_do": 10.6890, "lop_phu": "Nong_nghiep", "base_lst": 33.5, "base_ndvi": 0.44, "base_tvdi": 0.50},
    {"ma": "HCM_CC", "ten": "Củ Chi (Đất nông nghiệp & vườn cây)", "kinh_do": 106.4934, "vi_do": 10.9804, "lop_phu": "Nong_nghiep", "base_lst": 32.8, "base_ndvi": 0.52, "base_tvdi": 0.45},
    {"ma": "HCM_HM", "ten": "Hóc Môn (Vùng nông thôn mới)", "kinh_do": 106.5890, "vi_do": 10.8840, "lop_phu": "Nong_nghiep", "base_lst": 33.2, "base_ndvi": 0.48, "base_tvdi": 0.48},
    {"ma": "HCM_BTh", "ten": "Bình Thạnh (Bán đảo Thanh Đa)", "kinh_do": 106.7210, "vi_do": 10.8120, "lop_phu": "Mat_nuoc_cay_xanh", "base_lst": 32.1, "base_ndvi": 0.55, "base_tvdi": 0.40},
    {"ma": "HCM_CG", "ten": "Cần Giờ (Khu Dự trữ Sinh quyển Rừng Sác)", "kinh_do": 106.9547, "vi_do": 10.4114, "lop_phu": "Rung_ngap_man", "base_lst": 29.8, "base_ndvi": 0.74, "base_tvdi": 0.28},
]

# Generate 16-day cycle dates from 2021-01-01 to 2025-12-31
start_date = datetime(2021, 1, 1)
end_date = datetime(2025, 12, 31)
curr = start_date
dates = []
while curr <= end_date:
    dates.append(curr)
    curr += timedelta(days=16)

print(f"Generated {len(dates)} satellite acquisition dates.")

rows = []
total_records = len(dates) * len(STATIONS)

for d_idx, dt in enumerate(dates):
    date_str = dt.strftime("%Y-%m-%d")
    month = dt.month
    day_of_year = dt.timetuple().tm_yday
    
    # Seasonal cycle in TP.HCM:
    # Dry Season (Nov - Apr): higher temperature, low rain (peak March - May)
    # Rainy Season (May - Oct): higher cloud, more rain, slightly cooler LST
    seasonal_temp_offset = 2.8 * math.sin((month - 1) * math.pi / 6.0) # Peaks in April/May
    is_rainy = month in [5, 6, 7, 8, 9, 10]
    
    rain_base = 220 if is_rainy else 25
    soil_base = 72 if is_rainy else 55
    
    for s in STATIONS:
        # Station LST base + seasonal offset + annual global warming trend (0.15C/year)
        year_trend = (dt.year - 2021) * 0.18
        noise = random.gauss(0, 0.6)
        lst_val = round(s["base_lst"] + seasonal_temp_offset + year_trend + noise, 2)
        
        # NDVI seasonal variation (greener in rainy season)
        ndvi_offset = 0.05 if is_rainy else -0.04
        ndvi_val = round(max(0.05, min(0.92, s["base_ndvi"] + ndvi_offset + random.gauss(0, 0.02))), 3)
        
        # TVDI: higher in dry season, lower in wet season
        tvdi_offset = -0.10 if is_rainy else 0.08
        tvdi_val = round(max(0.05, min(0.98, s["base_tvdi"] + tvdi_offset + random.gauss(0, 0.03))), 3)
        
        # Rainfall and Soil moisture
        rain_val = round(max(0.0, rain_base + random.gauss(0, 40) + (15 if "CG" in s["ma"] else 0)), 1)
        soil_val = round(max(40.0, min(95.0, soil_base + random.gauss(0, 5))), 1)
        
        # Realistic Remote Sensing Cloud Gaps & Sensor Noise Insertion:
        # 1. Cloud Missing value: In rainy months (July-Sep), ~8% chance of cloud cover
        is_cloud_missing = False
        if is_rainy and random.random() < 0.07:
            is_cloud_missing = True
            
        # 2. Extreme sensor noise spikes: exactly 3 realistic outliers across the dataset
        # (e.g. 150°C solar flare / tin roof saturation, -8°C cloud shadow ice anomaly, 82°C fire / asphalt sensor glitch)
        if s["ma"] == "HCM_Q1" and date_str == "2023-06-09":
            lst_val = 150.0  # Saturation outlier
        elif s["ma"] == "HCM_Q1" and date_str == "2023-11-16":
            lst_val = -8.0   # Cold cloud top anomaly
        elif s["ma"] == "HCM_Q1" and date_str == "2024-07-14":
            lst_val = 82.0   # Tin roof specular reflection outlier
        elif is_cloud_missing:
            lst_val = ""     # NaN missing value caused by heavy monsoon cloud
            
        rows.append({
            "ngay": date_str,
            "kinh_do": s["kinh_do"],
            "vi_do": s["vi_do"],
            "lst": lst_val,
            "ndvi": ndvi_val,
            "tvdi": tvdi_val,
            "luong_mua": rain_val,
            "do_am_dat": soil_val,
            "lop_phu_be_mat": s["lop_phu"],
            "ma_khu_vuc": s["ma"]
        })

output_frontend = r"D:\GIS\Webgis\frontend_react\public\dataset_lst_hcm_landsat_modis_2021_2025_nghiencuu.csv"
output_backend = r"D:\GIS\Webgis\backend_python\dataset_lst_hcm_landsat_modis_2021_2025_nghiencuu.csv"
output_gee_sample = r"D:\GIS\Webgis\backend_python\gee_export_hcm_mau_2021_2025.csv"

fieldnames = ["ngay", "kinh_do", "vi_do", "lst", "ndvi", "tvdi", "luong_mua", "do_am_dat", "lop_phu_be_mat", "ma_khu_vuc"]

for out_path in [output_frontend, output_backend, output_gee_sample]:
    with open(out_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Successfully saved {len(rows)} records to {out_path}")
