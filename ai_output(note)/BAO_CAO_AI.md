# Báo cáo AI – dự báo LST TP.HCM (10 khu vực, 115 mốc/16 ngày, 2021–2025)

## 1. Lọc dữ liệu (chỉ tính ngưỡng trên TRAIN)
- 1150 dòng, 0 trùng lặp, 0 giá trị ngoài miền vật lý.
- 36 dòng (3,1%) thiếu LST: giữ làm lịch sử (ffill) nhưng không bao giờ làm nhãn/đánh giá.
- 8 ngoại lai thống kê (phần dư so với khí hậu trạm-tháng, MAD-z>4, ngưỡng ±1,96°C): loại 5 nhãn ở train/val, GIỮ 3 ở test để đánh giá trung thực.
- Chia theo thời gian: train 2021–2023 (670), val 2024 (230), test 2025 (230; 222 có LST đo thật).
- TVDI được tính từ LST nên bị loại khỏi đặc trưng; đối chứng có/không TVDI không đổi RMSE (0,717 vs 0,720 RF).

## 2. Kết quả TEST 2025 (dự báo trước 16 ngày)
| Mô hình | MAE | RMSE | R² | MAPE % | Bias |
|---|---|---|---|---|---|
| Ridge | 0,540 | 0,695 | 0,953 | 1,54 | +0,24 |
| HistGradientBoosting | 0,558 | 0,714 | 0,950 | 1,59 | +0,32 |
| Random Forest | 0,571 | 0,717 | 0,950 | 1,63 | +0,34 |
| Climatology (baseline) | 0,635 | 0,795 | 0,938 | 1,81 | +0,47 |
| Persistence (baseline) | 0,945 | 1,191 | 0,861 | 2,72 | 0,00 |
MAE Ridge 95% CI (bootstrap): 0,48–0,60.

## 3. Phân tích sai số (mô hình tốt nhất)
- Lệch dương toàn cục (+0,24°C): mô hình dự báo thấp hơn thực tế. Nguyên nhân hợp lý: LST trung bình tăng đều 34,43→34,97°C (2021→2025) nhưng mô hình học từ giai đoạn lạnh hơn.
- Theo khu vực: kém nhất HCM_BT 0,67, HCM_TD 0,64, HCM_BC 0,62; tốt nhất HCM_TB 0,44, HCM_BTh 0,44. Theo lớp phủ: Công nghiệp 0,66 > Nông nghiệp 0,57 > còn lại ~0,44–0,49.
- Theo tháng: cao nhất tháng 3 (0,68), tháng 10 (0,61); mùa khô 0,56 vs mùa mưa 0,53.
- Theo mức nhiệt: LST >39°C MAE 0,71, bias +0,64 (đỉnh nóng bị đánh giá thấp, mô hình "co" về trung bình). 
- Lỗi lớn nhất (+2,2°C): 2025-03-01 BT, 2025-04-02 TD, 2025-01-12 TD – đều đợt nóng ở khu công nghiệp.

## 4. Kết luận và hạn chế
- R² 0,95 chủ yếu do mùa vụ: chỉ dùng khí hậu trạm-tháng đã đạt R² 0,94. ML cải thiện MAE ~15% so với Climatology; mức này có ý nghĩa nhưng nhỏ.
- Ridge ≈ HistGB ≈ RF (khoảng tin cậy chồng nhau) – với 10 trạm, ~670 mẫu train, mô hình phức tạp chưa chứng minh được ưu thế.
- Chỉ 1 năm test, 10 điểm lấy mẫu: kết luận về xu hướng/đỉnh nóng cần thêm dữ liệu.
- XGBoost, ARIMA, GCN-LSTM chưa chạy được trong môi trường này (thiếu thư viện, không có mạng pip) – code đã sẵn trong ai_pipeline.py, sẽ tự chạy khi máy bạn có thư viện.
