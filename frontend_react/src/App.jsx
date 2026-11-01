import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon,
  Cpu,
  BarChart3,
  Database,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Flame,
  Thermometer,
  CloudRain,
  Wind,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Filter,
  LogIn,
  UserPlus,
  Search,
  ArrowUpDown,
  FileText,
  Download,
  TrendingUp,
  Calendar,
  UploadCloud,
  Check,
  Lock,
  AlertTriangle,
  Sliders,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Globe,
  Maximize2,
  SlidersHorizontal,
  ListFilter,
  Crosshair,
  Compass,
  MapPin,
  Leaf,
  SunMedium,
  BookOpen,
  HelpCircle,
  Info,
  Activity,
  Zap,
  Radio
} from 'lucide-react';
import AuthModal from './AuthModal';
import UserProfilePopup from './UserProfilePopup';
import Map3DView from './Map3DView';
import WardListPanel from './WardListPanel';
import MapFrameModal from './MapFrameModal';

const API_BASE = '/api';

// 46 mốc quan sát chu kỳ 16 ngày Landsat qua 2 chu kỳ năm
const ACQUISITION_DATES = [
  '01-01', '01-17', '02-02', '02-18', '03-06', '03-21', '04-06', '04-22', '05-08', '05-24',
  '06-09', '06-25', '07-11', '07-27', '08-12', '08-28', '09-13', '09-29', '10-15', '10-31',
  '11-16', '12-02', '12-18', '01-03', '01-19', '02-04', '02-20', '03-08', '03-24', '04-09',
  '04-25', '05-11', '05-27', '06-12', '06-28', '07-14', '07-30', '08-15', '08-31', '09-16',
  '10-02', '10-18', '11-03', '11-19', '12-05', '12-21'
];

// Cấu hình vi khí hậu và chuỗi quan trắc 6 khu vực đặc trưng tại TP.HCM
const PREP_DISTRICT_CONFIGS = {
  'Quận 1': {
    name: 'Quận 1 (Trung tâm)',
    fullName: 'Quận 1 (Trung tâm - Bến Nghé)',
    desc: 'Lõi đô thị mật độ cao, hiệu ứng đảo nhiệt UHI mạnh, tỷ lệ bê tông hóa > 85%',
    baseLST: 34.6,
    seasonAmp: 2.8,
    outliers: [
      { date: '06-09', raw: 150.0, note: 'Bão hòa cảm biến nhiệt TIRS Band 10 (150.0 °C)' },
      { date: '11-16', raw: -8.0, note: 'Nhiễu âm do đỉnh mây đối lưu lạnh cao tầng (-8.0 °C)' },
      { date: '07-14', raw: 82.0, note: 'Bức xạ chói phản xạ từ mái tôn nhà cao tầng (82.0 °C)' }
    ],
    missingDates: ['06-25', '08-28', '10-15', '09-16']
  },
  'Tân Bình': {
    name: 'Tân Bình (Sân bay TSN)',
    fullName: 'Tân Bình (Sân bay Tân Sơn Nhất)',
    desc: 'Bề mặt đường băng và mái kho logistics hấp thụ nhiệt mạnh, nhiệt độ nền cao nhất thành phố',
    baseLST: 35.8,
    seasonAmp: 3.1,
    outliers: [
      { date: '05-08', raw: 142.0, note: 'Bức xạ nhiệt mặt đường băng bê tông TSN (142.0 °C)' },
      { date: '11-03', raw: -5.0, note: 'Bóng mây dông nhiệt làm suy giảm bức xạ (-5.0 °C)' },
      { date: '07-30', raw: 88.0, note: 'Phản xạ chói nhà kho logistics KCN (88.0 °C)' }
    ],
    missingDates: ['07-11', '08-12', '10-02']
  },
  'Thủ Đức': {
    name: 'TP. Thủ Đức (Khu CNC)',
    fullName: 'TP. Thủ Đức (Khu Công nghệ Cao)',
    desc: 'Đô thị công nghệ & công nghiệp kết hợp mảng xanh sinh thái ven sông Đồng Nai',
    baseLST: 34.2,
    seasonAmp: 2.7,
    outliers: [
      { date: '04-22', raw: 135.0, note: 'Mái xưởng bán dẫn bão hòa quang phổ (135.0 °C)' },
      { date: '10-31', raw: -6.0, note: 'Bóng đổ mây dông mùa mưa (-6.0 °C)' },
      { date: '06-28', raw: 78.0, note: 'Phản xạ mặt kính khu văn phòng (78.0 °C)' }
    ],
    missingDates: ['06-09', '08-28', '10-15']
  },
  'Bình Thạnh': {
    name: 'Bình Thạnh (Thanh Đa)',
    fullName: 'Bình Thạnh (Bán đảo Thanh Đa)',
    desc: 'Được bao bọc bởi sông Sài Gòn, vi khí hậu sông nước làm mát hơn trung tâm 2–3 °C',
    baseLST: 32.2,
    seasonAmp: 2.3,
    outliers: [
      { date: '07-11', raw: 110.0, note: 'Nhiễu gương phản xạ mặt nước sông (110.0 °C)' },
      { date: '11-16', raw: -7.0, note: 'Nhiễu nhiệt mây tầng thấp (-7.0 °C)' }
    ],
    missingDates: ['06-25', '07-27', '09-13', '10-15']
  },
  'Cần Giờ': {
    name: 'Cần Giờ (Rừng Sác)',
    fullName: 'Cần Giờ (Khu DTSQ Rừng Sác)',
    desc: 'Rừng ngập mặn diện tích lớn, độ che phủ thực vật > 75%, đóng vai trò lá phổi xanh làm mát',
    baseLST: 29.5,
    seasonAmp: 1.9,
    outliers: [
      { date: '06-12', raw: 95.0, note: 'Lỗi đo trạm bến phà ven cửa sông (95.0 °C)' },
      { date: '12-02', raw: -12.0, note: 'Nhiễu tầng mây biển cận duyên (-12.0 °C)' }
    ],
    missingDates: ['05-24', '06-25', '08-15', '09-29', '10-18']
  },
  'Củ Chi': {
    name: 'Củ Chi (Ven đô)',
    fullName: 'Củ Chi (Nông nghiệp ven đô)',
    desc: 'Đất vườn cây ăn trái, cao su và lúa nước, biên độ nhiệt ngày đêm lớn',
    baseLST: 32.0,
    seasonAmp: 2.5,
    outliers: [
      { date: '05-11', raw: 120.0, note: 'Nhiễu nhiệt đốt rơm rạ đồng ruộng (120.0 °C)' },
      { date: '11-19', raw: -5.0, note: 'Bóng mây che phủ viễn thám (-5.0 °C)' }
    ],
    missingDates: ['06-09', '07-11', '08-31', '10-02']
  }
};

// Hàm tính toán tiền xử lý chuỗi LST phản hồi tức thì
function computePreprocessingSeries(districtKey, missingMethod, outlierMethod, threshold, normMethod, trainEndYear) {
  const cfg = PREP_DISTRICT_CONFIGS[districtKey] || PREP_DISTRICT_CONFIGS['Quận 1'];
  
  // 1. Tạo chuỗi quan trắc thô 46 mốc
  const rawList = ACQUISITION_DATES.map((date, idx) => {
    const month = parseInt(date.slice(0, 2), 10);
    const seasonal = cfg.seasonAmp * Math.sin((month - 1) * Math.PI / 6.0);
    const noise = Math.sin(idx * 1.7) * 0.45;
    let val = Math.round((cfg.baseLST + seasonal + noise) * 10) / 10;
    
    const outlierObj = cfg.outliers.find(o => o.date === date);
    if (outlierObj) {
      return { date, raw: outlierObj.raw, note: outlierObj.note, isNaturalMissing: false };
    }
    if (cfg.missingDates.includes(date)) {
      return { date, raw: null, note: 'Khuyết mây mùa mưa nhiệt đới TP.HCM', isNaturalMissing: true };
    }
    return { date, raw: val, note: null, isNaturalMissing: false };
  });

  // 2. Nhận diện nhiễu ngoại lai theo thuật toán người dùng chọn
  const numericVals = rawList.map(p => p.raw).filter(v => v !== null);
  let lowerBound = 15.0;
  let upperBound = Number(threshold) || 60.0;
  
  if (outlierMethod === 'IQR') {
    const sorted = [...numericVals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    lowerBound = Math.round((q1 - 1.5 * iqr) * 10) / 10;
    upperBound = Math.round((q3 + 1.5 * iqr) * 10) / 10;
  } else if (outlierMethod === 'Z-score') {
    const mean = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
    const variance = numericVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericVals.length;
    const std = Math.sqrt(variance) || 1.0;
    lowerBound = Math.round((mean - 3.0 * std) * 10) / 10;
    upperBound = Math.round((mean + 3.0 * std) * 10) / 10;
  }

  const flaggedList = rawList.map(p => {
    if (p.raw === null) {
      return { ...p, isOutlier: false, isMissing: true };
    }
    const isOut = p.raw < lowerBound || p.raw > upperBound;
    return {
      ...p,
      isOutlier: isOut,
      isMissing: isOut || p.isNaturalMissing
    };
  });

  const outlierPoints = flaggedList.filter(p => p.isOutlier);
  const outlierValues = outlierPoints.map(p => `${p.raw} °C`);
  const missingCount = flaggedList.filter(p => p.isNaturalMissing).length;

  // 3. Xử lý dữ liệu thiếu và ngoại lai
  let cleanPoints = [];
  if (missingMethod === 'Loai_bo') {
    cleanPoints = flaggedList
      .filter(p => !p.isOutlier && !p.isNaturalMissing)
      .map(p => ({ ...p, clean: p.raw }));
  } else {
    cleanPoints = flaggedList.map((p, i) => {
      if (!p.isOutlier && !p.isNaturalMissing) {
        return { ...p, clean: p.raw };
      }
      let prevVal = null;
      for (let j = i - 1; j >= 0; j--) {
        if (!flaggedList[j].isOutlier && !flaggedList[j].isNaturalMissing) {
          prevVal = flaggedList[j].raw;
          break;
        }
      }
      let nextVal = null;
      for (let j = i + 1; j < flaggedList.length; j++) {
        if (!flaggedList[j].isOutlier && !flaggedList[j].isNaturalMissing) {
          nextVal = flaggedList[j].raw;
          break;
        }
      }
      const filled = prevVal !== null && nextVal !== null
        ? Math.round(((prevVal + nextVal) / 2) * 10) / 10
        : (prevVal ?? nextVal ?? cfg.baseLST);
      return { ...p, clean: filled };
    });
  }

  // 4. Chuẩn hóa đặc trưng dựa DUY NHẤT trên tập Train (chống rò rỉ dữ liệu)
  const trainCutoff = Math.floor(cleanPoints.length * 0.70);
  const trainSubset = cleanPoints.slice(0, trainCutoff);
  const trainValues = trainSubset.map(p => p.clean);
  const trainMin = trainValues.length > 0 ? Math.min(...trainValues) : 30.0;
  const trainMax = trainValues.length > 0 ? Math.max(...trainValues) : 38.0;
  const trainMean = trainValues.length > 0 ? (trainValues.reduce((a, b) => a + b, 0) / trainValues.length) : 34.0;
  const trainVariance = trainValues.length > 0 ? (trainValues.reduce((a, b) => a + Math.pow(b - trainMean, 2), 0) / trainValues.length) : 2.0;
  const trainStd = Math.sqrt(trainVariance) || 1.0;

  const finalPoints = cleanPoints.map(p => {
    let norm = p.clean;
    if (normMethod === 'Min-Max') {
      const denom = trainMax - trainMin || 1.0;
      norm = Math.round(((p.clean - trainMin) / denom) * 1000) / 1000;
    } else if (normMethod === 'Z-score') {
      norm = Math.round(((p.clean - trainMean) / trainStd) * 1000) / 1000;
    }
    return { ...p, normVal: norm };
  });

  return {
    cfg,
    points: finalPoints,
    missingCount,
    outlierCount: outlierPoints.length,
    outlierValues,
    cleanCount: finalPoints.length,
    lowerBound,
    upperBound,
    trainStats: {
      min: Math.round(trainMin * 100) / 100,
      max: Math.round(trainMax * 100) / 100,
      mean: Math.round(trainMean * 100) / 100,
      std: Math.round(trainStd * 100) / 100
    }
  };
}

// 1. LST Color Palette (Ảnh 1 chuẩn GEE: #0000FF -> #0066FF -> #00FFFF -> #00FF00 -> #FFFF00 -> #FFCC00 -> #FF6600 -> #FF0000)
const getLSTColor = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '#00FFFF';
  const num = Number(val);
  if (num < 28.0) return '#0000FF'; // Xanh dương đậm (< 28°C - Rất mát mẻ)
  if (num < 30.0) return '#0066FF'; // Xanh lam (28 - 30°C - Mát mẻ)
  if (num < 32.0) return '#00FFFF'; // Cyan (30 - 32°C - Dễ chịu)
  if (num < 34.0) return '#00FF00'; // Xanh lá cây (32 - 34°C - Ổn định)
  if (num < 35.5) return '#FFFF00'; // Vàng chanh (34 - 35.5°C - Ấm nóng vừa)
  if (num < 37.0) return '#FFCC00'; // Vàng cam (35.5 - 37°C - Nóng)
  if (num < 38.5) return '#FF6600'; // Cam (37 - 38.5°C - Rất nóng)
  return '#FF0000';                 // Đỏ rực (>= 38.5°C - Đảo nhiệt UHI cực nóng)
};

// 2. NDVI Color Palette (Ảnh 2 chuẩn GEE: #FF0000 -> #FF7F00 -> #FFFF00 -> #ADFF2F -> #00FF00 -> #00FFFF -> #007FFF -> #0000FF)
const getNDVIColor = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '#00FF00';
  const num = Number(val);
  if (num < 0.15) return '#FF0000'; // Đỏ (< 0.15 - Bê tông hóa dày đặc / Không thực vật)
  if (num < 0.25) return '#FF7F00'; // Cam (0.15 - 0.25 - Cây cối rất thưa)
  if (num < 0.35) return '#FFFF00'; // Vàng (0.25 - 0.35 - Thảm cỏ thưa / Đất trống)
  if (num < 0.45) return '#ADFF2F'; // Xanh vàng GreenYellow (0.35 - 0.45 - Cây bụi)
  if (num < 0.55) return '#00FF00'; // Xanh lá cây (0.45 - 0.55 - Cây xanh trung bình)
  if (num < 0.65) return '#00FFFF'; // Cyan (0.55 - 0.65 - Cây xanh tươi tốt)
  if (num < 0.75) return '#007FFF'; // Xanh lam Azure (0.65 - 0.75 - Rừng rậm rạp)
  return '#0000FF';                 // Xanh dương đậm (>= 0.75 - Rừng nguyên sinh Cần Giờ / Mặt nước)
};

// 3. TVDI Color Palette (Ảnh 4 chuẩn GEE: #066b00 -> #0bc400 -> #0ce100 -> #00ff00 -> #ffff00 -> #ffcc00 -> #ff6600 -> #ff0000)
const getTVDIColor = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '#00ff00';
  const num = Number(val);
  if (num < 0.25) return '#066b00'; // Xanh lục rất đậm (< 0.25 - Rất ẩm ướt / Đủ nước)
  if (num < 0.35) return '#0bc400'; // Xanh lục đậm (0.25 - 0.35 - Ẩm ướt)
  if (num < 0.45) return '#0ce100'; // Xanh lục sáng (0.35 - 0.45 - Đủ ẩm)
  if (num < 0.55) return '#00ff00'; // Xanh chanh tươi (0.45 - 0.55 - Bình thường)
  if (num < 0.65) return '#ffff00'; // Vàng (0.55 - 0.65 - Bắt đầu khô hạn)
  if (num < 0.75) return '#ffcc00'; // Vàng cam (0.65 - 0.75 - Khô hạn vừa)
  if (num < 0.85) return '#ff6600'; // Cam (0.75 - 0.85 - Khô hạn cao)
  return '#ff0000';                 // Đỏ rực (>= 0.85 - Khô hạn đặc biệt gay gắt)
};

// Danh sách 10 trạm quan trắc viễn thám & khí tượng bề mặt trọng điểm TP.HCM
const TRAM_VIEN_THAM_HCM = [
  {
    id: 'TSH',
    ten: 'Trạm Khí tượng Tân Sơn Hòa',
    ma: 'WMO-48900',
    khu_vuc: 'Quận Tân Bình',
    lat: 10.7984,
    lng: 106.6631,
    loai: 'Trạm Bề mặt Quốc gia WMO / Hiệu chuẩn Viễn thám',
    cam_bien: 'Landsat 8/9 Band 10 TIRS + AWS Davis Vantage Pro2',
    do_cao: '8.5 m',
    do_chinh_xac: '±0.4 °C (Chuẩn viễn thám)',
    dac_diem: 'Trạm gốc kiểm chuẩn đảo nhiệt viễn thám sân bay & KCN Tân Bình'
  },
  {
    id: 'TCV',
    ten: 'Trạm Quan trắc Lõi UHI Quận 1',
    ma: 'UHI-Q1',
    khu_vuc: 'Quận 1',
    lat: 10.7875,
    lng: 106.7053,
    loai: 'Trạm Vi khí hậu Đô thị Lõi',
    cam_bien: 'Landsat 8/9 TIRS + Cảm biến hồng ngoại nhiệt Testo',
    do_cao: '4.2 m',
    do_chinh_xac: '±0.5 °C',
    dac_diem: 'Đối chứng giữa lõi bê tông hóa cao tầng và mảng xanh công viên'
  },
  {
    id: 'SHTP',
    ten: 'Trạm Tháp Viễn thám Khu CNC',
    ma: 'FLUX-TD',
    khu_vuc: 'TP. Thủ Đức',
    lat: 10.8542,
    lng: 106.7905,
    loai: 'Tháp Thông lượng Eddy Covariance',
    cam_bien: 'Landsat 8/9 + MODIS/Terra + Tháp Flux Tower',
    do_cao: '22.0 m',
    do_chinh_xac: '±0.3 °C',
    dac_diem: 'Đo thông lượng nhiệt bề mặt, bức xạ mặt đất và chỉ số NDVI viễn thám'
  },
  {
    id: 'LMX',
    ten: 'Trạm Nông nghiệp Lê Minh Xuân',
    ma: 'AGR-BC',
    khu_vuc: 'Huyện Bình Chánh',
    lat: 10.7302,
    lng: 106.5304,
    loai: 'Trạm Sinh thái Nông nghiệp Tây Nam',
    cam_bien: 'Landsat 8/9 TIRS + Cảm biến độ ẩm đất SMAP 5cm',
    do_cao: '3.0 m',
    do_chinh_xac: '±0.5 °C',
    dac_diem: 'Quan trắc nhiệt độ đất canh tác, đất trống và vùng trũng Tây Nam'
  },
  {
    id: 'CG',
    ten: 'Trạm Sinh thái Rừng Cần Giờ',
    ma: 'ECO-CG',
    khu_vuc: 'Huyện Cần Giờ',
    lat: 10.4208,
    lng: 106.8702,
    loai: 'Trạm Sinh quyển UNESCO Viễn thám',
    cam_bien: 'Landsat 8/9 TIRS + Sentinel-3 SLSTR + Tháp khí tượng rừng',
    do_cao: '16.0 m',
    do_chinh_xac: '±0.4 °C',
    dac_diem: 'Đánh giá khả năng hạ nhiệt tự nhiên của tán rừng đước ngập mặn'
  },
  {
    id: 'CC',
    ten: 'Trạm Nông nghiệp Củ Chi',
    ma: 'AGR-CC',
    khu_vuc: 'Huyện Củ Chi',
    lat: 11.0005,
    lng: 106.5204,
    loai: 'Trạm Vi khí hậu Vùng đệm Tây Bắc',
    cam_bien: 'Landsat 8/9 TIRS + CHIRPS Rain Gauge + AWS',
    do_cao: '12.0 m',
    do_chinh_xac: '±0.5 °C',
    dac_diem: 'Theo dõi chỉ số khô hạn thực vật TVDI và nhiệt độ bề mặt đất nông thôn'
  },
  {
    id: 'BT',
    ten: 'Trạm Đô thị KCN Tân Tạo',
    ma: 'IND-BT',
    khu_vuc: 'Quận Bình Tân',
    lat: 10.7501,
    lng: 106.6002,
    loai: 'Trạm Đảo nhiệt Công nghiệp',
    cam_bien: 'Landsat 8/9 TIRS Band 10 + Thiết bị đo bức xạ phản xạ mái tôn',
    do_cao: '6.5 m',
    do_chinh_xac: '±0.6 °C',
    dac_diem: 'Giám sát hiện tượng phản xạ gương từ mái tôn mạ kẽm gây dị thường nhiệt'
  },
  {
    id: 'CTL',
    ten: 'Trạm Cảng Cát Lái - Logistics',
    ma: 'LOG-CTL',
    khu_vuc: 'TP. Thủ Đức',
    lat: 10.7603,
    lng: 106.7904,
    loai: 'Trạm Bề mặt Hạ tầng Logistics',
    cam_bien: 'Landsat 8/9 TIRS + Camera nhiệt quang học ven sông',
    do_cao: '10.0 m',
    do_chinh_xac: '±0.5 °C',
    dac_diem: 'Nhiệt bề mặt bãi container, mặt đường nhựa giao thông và sông Đồng Nai'
  },
  {
    id: 'NB',
    ten: 'Trạm Cửa sông Thủy văn Nhà Bè',
    ma: 'HYD-NB',
    khu_vuc: 'Huyện Nhà Bè',
    lat: 10.6805,
    lng: 106.7402,
    loai: 'Trạm Vi khí hậu Cửa sông - Ngập triều',
    cam_bien: 'Landsat 8/9 TIRS + Trạm đo triều ký tự động',
    do_cao: '3.0 m',
    do_chinh_xac: '±0.4 °C',
    dac_diem: 'Nghiên cứu tác động làm mát của chế độ bán nhật triều sông Soài Rạp'
  },
  {
    id: 'HM',
    ten: 'Trạm Vành đai Xanh Hóc Môn',
    ma: 'GRN-HM',
    khu_vuc: 'Huyện Hóc Môn',
    lat: 10.8804,
    lng: 106.5902,
    loai: 'Trạm Đệm Chuyển tiếp Ngoại thành',
    cam_bien: 'Landsat 8/9 TIRS + AWS vi khí hậu',
    do_cao: '5.5 m',
    do_chinh_xac: '±0.5 °C',
    dac_diem: 'Đo gradien giảm nhiệt độ từ khu vực nội thành ra vành đai xanh'
  }
];

const getStationsWithLST = (stations, khuVucData, pointsData, curDate) => {
  return stations.map(st => {
    let matchedLST = 34.5;
    let matchedNDVI = 0.35;
    let matchedTVDI = 0.55;
    let rain = 15;
    let humidity = 68;

    if (khuVucData && khuVucData.length > 0) {
      const cleanDistrict = st.khu_vuc.replace('Quận ', '').replace('Huyện ', '').replace('TP. ', '').trim();
      const found = khuVucData.find(k => k.ten_khu_vuc && k.ten_khu_vuc.includes(cleanDistrict));
      if (found) {
        matchedLST = Number(found.gia_tri_lst) || 34.5;
        matchedNDVI = Number(found.ndvi) || 0.35;
        matchedTVDI = Number(found.tvdi) || 0.55;
      }
    }

    if (st.id === 'TSH') matchedLST = Math.round((matchedLST + 1.2) * 10) / 10;
    if (st.id === 'CG') { matchedLST = Math.round((matchedLST - 2.8) * 10) / 10; matchedNDVI = 0.76; matchedTVDI = 0.28; }
    if (st.id === 'BT') matchedLST = Math.round((matchedLST + 1.8) * 10) / 10;
    if (st.id === 'TCV') { matchedLST = Math.round((matchedLST + 0.6) * 10) / 10; matchedNDVI = 0.22; }
    if (st.id === 'CC') { matchedLST = Math.round((matchedLST - 1.1) * 10) / 10; matchedNDVI = 0.58; }

    return {
      ...st,
      date: curDate || '2025-12-01',
      lst: matchedLST,
      ndvi: matchedNDVI,
      tvdi: matchedTVDI,
      rain,
      humidity
    };
  });
};

export default function App({ initialTab = 'gis', onHome, currentUser, setCurrentUser }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'gis' | 'training' | 'comparison' | 'datasets'
  const [selectedIndicator, setSelectedIndicator] = useState('LST'); // 'LST' | 'NDVI' | 'TVDI'
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [profileOpen, setProfileOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [khuVucList, setKhuVucList] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lstPoints, setLstPoints] = useState([]);
  const [khuVucLst, setKhuVucLst] = useState([]);
  const [forecastPoints, setForecastPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtSearchText, setDistrictSearchText] = useState('');

  // Layers Toggles (Ưu tiên hiển thị bản đồ phân vùng LST 167 xã/phường sau sáp nhập)
  const [showObservation, setShowObservation] = useState(false);
  const [stationMode, setStationMode] = useState('KEY'); // 'KEY' = 10 trạm trọng điểm | 'ALL' = 168 điểm lưới Landsat
  const [stationDrawerOpen, setStationDrawerOpen] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showProvinces, setShowProvinces] = useState(false);
  const [geoProvinces, setGeoProvinces] = useState(null);
  const [geoDistricts, setGeoDistricts] = useState(null);

  // 3D Map, 167 Ward Panel, A4 Frame & Threshold Filter
  const [mapMode, setMapMode] = useState('2D'); // '2D' | '3D'
  const [extrusionScale, setExtrusionScale] = useState(1.0); // 1.0 | 1.5 | 2.0
  const [wardListOpen, setWardListOpen] = useState(false);
  const [mapFrameOpen, setMapFrameOpen] = useState(false);
  const [thresholdFilter, setThresholdFilter] = useState({
    enabled: false,
    metric: 'LST',
    op: '>=',
    value: 35.0,
  });
  const [mouseCoords, setMouseCoords] = useState({ lat: 10.7760, lng: 106.7000 });

  // AI Training Form State
  const [modelsList, setModelsList] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(4); // GCN-LSTM default
  const [missingStrategy, setMissingStrategy] = useState('Noi_suy_tuyen_tinh');
  const [outlierStrategy, setOutlierStrategy] = useState('IQR');
  const [normMethod, setNormMethod] = useState('Min-Max');
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);

  // Benchmarks State
  const [benchmarkMetrics, setBenchmarkMetrics] = useState([]);

  // Tab Thống kê khu vực State (Ảnh 1, Ảnh 5)
  const [statsIndicator, setStatsIndicator] = useState('LST'); // LST | NDVI | TVDI
  const [statsMonth, setStatsMonth] = useState(''); // YYYY-MM
  const [statsSource, setStatsSource] = useState('GEE / AI dự báo');
  const [statsThreshold, setStatsThreshold] = useState(35.0);
  const [statsCondition, setStatsCondition] = useState('ALL'); // 'ALL' | 'GTE' | 'LTE'
  const [statsSearchText, setStatsSearchText] = useState('');
  const [statsData, setStatsData] = useState({ city_summary: null, items: [] });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsSortCol, setStatsSortCol] = useState('tb'); // 'tb' | 'min' | 'max' | 'khu_vuc' | 'dien_tich_km2'
  const [statsSortAsc, setStatsSortAsc] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Tab Chuỗi thời gian State (Chức năng 3: Xếp hạng phường/xã theo Ảnh 4)
  const [tsWardId, setTsWardId] = useState(''); // '' = Toàn TP.HCM
  const [tsMonth, setTsMonth] = useState(1); // 1 -> 12
  const [tsRankingOrder, setTsRankingOrder] = useState('DESC'); // 'DESC' = Nóng nhất | 'ASC' = Mát nhất
  const [tsData, setTsData] = useState(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsHoverPoint, setTsHoverPoint] = useState(null);

  // Tab Nạp dữ liệu & Tiền xử lý State
  const [datasetsList, setDatasetsList] = useState([]);
  const [tienXuLyList, setTienXuLyList] = useState([]);
  const [prepDistrict, setPrepDistrict] = useState('Quận 1');
  const [prepMissing, setPrepMissing] = useState('Noi_suy_tuyen_tinh');
  const [prepOutlier, setPrepOutlier] = useState('Nguong_hop_ly');
  const [prepThreshold, setPrepThreshold] = useState(60);
  const [prepSyncTime, setPrepSyncTime] = useState('Giu_nguyen');
  const [prepNorm, setPrepNorm] = useState('Z-score');
  const [prepTrainEndYear, setPrepTrainEndYear] = useState('2023');
  const [prepSaving, setPrepSaving] = useState(false);
  const [prepAlert, setPrepAlert] = useState(null);
  const [prepPointHover, setPrepPointHover] = useState(null);
  const [uploadingDataset, setUploadingDataset] = useState(false);
  const [quickLoadingResearch, setQuickLoadingResearch] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineReport, setPipelineReport] = useState(null);
  const [scienceTab, setScienceTab] = useState('cloud'); // 'cloud' | 'outlier' | 'norm'
  const [simTemp, setSimTemp] = useState(35.0);

  // Tính toán chuỗi tiền xử lý phản hồi tức thì theo khu vực và tham số
  const currentPrepData = useMemo(() => {
    return computePreprocessingSeries(
      prepDistrict,
      prepMissing,
      prepOutlier,
      prepThreshold,
      prepNorm,
      prepTrainEndYear
    );
  }, [prepDistrict, prepMissing, prepOutlier, prepThreshold, prepNorm, prepTrainEndYear]);

  // Phân quyền thực tế: Chỉ tài khoản đã đăng nhập có vai_tro === 'ADMIN' mới có quyền Admin
  const isAdmin = currentUser && currentUser.vai_tro === 'ADMIN';

  // Tự động xoá sạch thông tin cá nhân cũ trong localStorage nếu có
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.ten_dang_nhap && (u.ten_dang_nhap.includes('QUỐC') || u.ten_dang_nhap.includes('THÁI') || u.ten_dang_nhap.includes('khoi'))) {
          u.ten_dang_nhap = u.vai_tro === 'ADMIN' ? 'admin' : 'viewer';
          localStorage.setItem('auth_user', JSON.stringify(u));
          if (setCurrentUser) setCurrentUser(u);
        }
      }
    } catch (e) {}
  }, []);

  // Người dùng thường không được phép truy cập vào mục nạp dữ liệu hay huấn luyện AI
  useEffect(() => {
    if (!isAdmin && (activeTab === 'datasets' || activeTab === 'training')) {
      setActiveTab('gis');
    }
  }, [isAdmin, activeTab]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([10.776, 106.700], 11);
    }
  };

  const handleFlyToStation = (st) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([st.lat, st.lng], 13.5, { duration: 1.0 });
    }
    setSelectedDistrict(null);
    setSelectedPoint({
      type: `Trạm Quan Trắc Viễn Thám (${st.ma})`,
      name: st.ten,
      code: st.ma,
      date: st.date,
      lst: st.lst,
      ndvi: st.ndvi,
      tvdi: st.tvdi,
      rain: st.rain,
      humidity: st.humidity,
      sensor: st.cam_bien,
      note: st.dac_diem,
      lat: st.lat,
      lng: st.lng
    });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const loadDatasets = () => {
    fetch(`${API_BASE}/datasets`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDatasetsList(d); })
      .catch(console.error);
  };

  const loadTienXuLy = () => {
    fetch(`${API_BASE}/tien-xu-ly`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTienXuLyList(d); })
      .catch(console.error);
  };

  // Map Reference
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const districtLayerRef = useRef(null);
  const districtLayersMapRef = useRef({});
  const provinceLayerRef = useRef(null);
  const timerRef = useRef(null);

  // Load real administrative boundaries (static GeoJSON in /public/geo)
  useEffect(() => {
    // 167 phường/xã/đặc khu (sau sáp nhập, đã loại Côn Đảo) lấy trực tiếp từ bảng khu_vuc của PostGIS
    fetch(`${API_BASE}/khu-vuc?cha=HCM&geometry=true`)
      .then(r => r.json())
      .then(rows => setGeoDistricts({
        type: 'FeatureCollection',
        features: rows.filter(k => k.geojson && !k.ten_khu_vuc?.includes('Côn Đảo')).map(k => ({
          type: 'Feature',
          geometry: k.geojson,
          properties: {
            id: k.id,
            name: k.ten_khu_vuc,
            ma: k.ma_khu_vuc,
            loai: k.loai_khu_vuc,
            dien_tich_km2: k.dien_tich_km2
          }
        }))
      }))
      .catch(() => {});
  }, []);

  // Fetch initial system data
  useEffect(() => {
    fetch(`${API_BASE}/overview-stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(console.error);

    fetch(`${API_BASE}/khu-vuc`)
      .then(r => r.json())
      .then(d => setKhuVucList(d.filter(k => k.ten_khu_vuc && !k.ten_khu_vuc.includes('Côn Đảo'))))
      .catch(console.error);

    fetch(`${API_BASE}/lst-data/timeline`)
      .then(r => r.json())
      .then(d => {
        setTimeline(d);
        if (d && d.length > 0) {
          setSelectedDateIdx(d.length - 1); // latest
        }
      })
      .catch(console.error);

    fetch(`${API_BASE}/models`)
      .then(r => r.json())
      .then(d => setModelsList(d))
      .catch(console.error);

    fetch(`${API_BASE}/metrics/comparison`)
      .then(r => r.json())
      .then(d => setBenchmarkMetrics(d))
      .catch(console.error);

    fetch(`${API_BASE}/forecast`)
      .then(r => r.json())
      .then(d => setForecastPoints(d))
      .catch(console.error);

    loadDatasets();
    loadTienXuLy();
  }, []);

  // Fetch LST data for all 168 wards & point stations when date changes
  useEffect(() => {
    if (!timeline || timeline.length === 0) return;
    const curDate = timeline[selectedDateIdx]?.thoi_gian;
    if (!curDate) return;

    // 1. Phủ kín nhiệt độ cho toàn bộ 167 xã/phường sau sáp nhập
    fetch(`${API_BASE}/khu-vuc-lst?thoi_gian=${curDate}`)
      .then(r => r.json())
      .then(data => setKhuVucLst(Array.isArray(data) ? data.filter(k => k.ten_khu_vuc && !k.ten_khu_vuc.includes('Côn Đảo')) : []))
      .catch(console.error);

    // 2. Điểm trạm đo quan trắc viễn thám
    fetch(`${API_BASE}/lst-data?thoi_gian=${curDate}`)
      .then(r => r.json())
      .then(pts => setLstPoints(pts))
      .catch(console.error);
  }, [selectedDateIdx, timeline]);

  // Fetch dữ liệu Thống kê khu vực (Tab: statistics)
  useEffect(() => {
    if (activeTab !== 'statistics') return;
    setStatsLoading(true);

    const m = statsMonth || (timeline[selectedDateIdx]?.thoi_gian?.substring(0, 7)) || '2025-12';
    const params = new URLSearchParams({
      chi_so: statsIndicator,
      thoi_gian: m,
      nguon: statsSource
    });
    if (statsCondition && statsCondition !== 'ALL') {
      params.append('dieu_kien', statsCondition);
      params.append('nguong_tren', statsThreshold);
    }

    fetch(`${API_BASE}/thong-ke-khu-vuc?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setStatsData(d || { city_summary: null, items: [] });
      })
      .catch(err => {
        console.error('Lỗi lấy thống kê khu vực:', err);
      })
      .finally(() => {
        setStatsLoading(false);
      });
  }, [activeTab, statsIndicator, statsMonth, statsSource, statsThreshold, statsCondition, selectedDateIdx, timeline]);

  // Fetch dữ liệu Chuỗi thời gian (Tab: timeseries)
  useEffect(() => {
    if (activeTab !== 'timeseries') return;
    setTsLoading(true);

    const params = new URLSearchParams({
      thang: tsMonth,
      order: tsRankingOrder
    });
    if (tsWardId) {
      params.append('kv_id', tsWardId);
    }

    fetch(`${API_BASE}/timeseries-analysis?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setTsData(d);
      })
      .catch(err => {
        console.error('Lỗi lấy chuỗi thời gian:', err);
      })
      .finally(() => {
        setTsLoading(false);
      });
  }, [activeTab, tsWardId, tsMonth, tsRankingOrder]);

  // Handle Play/Pause Timeline Slider
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setSelectedDateIdx(prev => {
          if (prev >= timeline.length - 1) return 0;
          return prev + 1;
        });
      }, 1400);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeline.length]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (activeTab !== 'gis') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.776, 106.700],
        zoom: 11,
        zoomControl: false,
        attributionControl: false
      });

      // Nền bản đồ OpenStreetMap
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Custom Zoom Control top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      map.createPane('provincePane').style.zIndex = 350;
      map.createPane('districtPane').style.zIndex = 360;
      provinceLayerRef.current = L.layerGroup().addTo(map);
      districtLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      // Bắt sự kiện di chuột cập nhật toạ độ địa lý thời gian thực
      map.on('mousemove', (e) => {
        setMouseCoords({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      });

      mapInstanceRef.current = map;
    }
  }, [activeTab]);

  // Khắc phục triệt để lỗi chuyển tab sang tab khác rồi quay lại không load lại map
  useEffect(() => {
    if (activeTab === 'gis' && mapMode === '2D' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 120);
    }
  }, [activeTab, mapMode]);

  // Provinces (real boundaries) around TP.HCM
  useEffect(() => {
    if (!mapInstanceRef.current || !provinceLayerRef.current) return;
    provinceLayerRef.current.clearLayers();
    if (!showProvinces || !geoProvinces) return;

    const layer = L.geoJSON(geoProvinces, {
      pane: 'provincePane',
      style: f => f.properties.is_hcm
        ? { color: '#f97316', weight: 2.5, opacity: 0.95, fillColor: '#f97316', fillOpacity: 0.05 }
        : { color: '#64748b', weight: 1.5, opacity: 0.9, fillColor: '#475569', fillOpacity: 0.12 },
      onEachFeature: (f, lyr) => {
        lyr.bindTooltip(`<b>${f.properties.name}</b>`, { className: 'glass-panel', sticky: true });
        lyr.on('click', () => setSelectedDistrict({
          ten_khu_vuc: f.properties.name,
          loai_khu_vuc: f.properties.is_hcm ? 'Thành phố trực thuộc TW' : 'Tỉnh lân cận',
          mo_ta: f.properties.is_hcm
            ? 'Ranh giới hành chính TP.HCM (geoBoundaries).'
            : 'Tỉnh giáp ranh vùng TP.HCM, hiển thị để đối chiếu không gian.'
        }));
      }
    });
    provinceLayerRef.current.addLayer(layer);
  }, [geoProvinces, showProvinces, activeTab]);

  // Districts of TP.HCM (168 đơn vị hành chính sau sáp nhập, tô màu nhiệt độ LST dạng Choropleth)
  useEffect(() => {
    if (!mapInstanceRef.current || !districtLayerRef.current) return;
    districtLayerRef.current.clearLayers();
    if (!showDistricts || !geoDistricts) return;

    // Tạo bản đồ tra cứu LST theo ma_khu_vuc từ 168 xã/phường
    const lstByKhuVuc = {};
    khuVucLst.forEach(p => {
      if (p.id) {
        lstByKhuVuc[p.id] = p;
      }
    });

    const layer = L.geoJSON(geoDistricts, {
      pane: 'districtPane',
      style: (f) => {
        const p = f.properties;
        const info = lstByKhuVuc[p.id];
        let fillColor = '#38bdf8';
        if (info) {
          if (selectedIndicator === 'LST') {
            fillColor = getLSTColor(Number(info.gia_tri_lst));
          } else if (selectedIndicator === 'NDVI') {
            fillColor = getNDVIColor(Number(info.ndvi));
          } else if (selectedIndicator === 'TVDI') {
            fillColor = getTVDIColor(Number(info.tvdi));
          }
        }
        // Kiểm tra điều kiện lọc ngưỡng
        let isMatch = true;
        if (thresholdFilter && thresholdFilter.enabled) {
          const tVal = Number(thresholdFilter.value);
          const metricVal = thresholdFilter.metric === 'NDVI' ? Number(info?.ndvi || 0) : thresholdFilter.metric === 'TVDI' ? Number(info?.tvdi || 0) : Number(info?.gia_tri_lst || 0);
          if (thresholdFilter.op === '>') isMatch = metricVal > tVal;
          else if (thresholdFilter.op === '>=') isMatch = metricVal >= tVal;
          else if (thresholdFilter.op === '<') isMatch = metricVal < tVal;
          else if (thresholdFilter.op === '<=') isMatch = metricVal <= tVal;
        }

        const strokeColor = isMatch
          ? (selectedIndicator === 'NDVI' ? '#065f46' : selectedIndicator === 'TVDI' ? '#b45309' : '#0369a1')
          : '#94a3b8';

        return {
          color: strokeColor,
          weight: isMatch ? 1.1 : 0.4,
          opacity: isMatch ? 0.85 : 0.2,
          fillColor: isMatch ? fillColor : '#e2e8f0',
          fillOpacity: isMatch ? (info ? 0.72 : 0.20) : 0.1
        };
      },
      onEachFeature: (f, lyr) => {
        const p = f.properties;
        const info = lstByKhuVuc[p.id];
        const loaiTxt = { PHUONG: 'Phường', XA: 'Xã', DAC_KHU: 'Đặc khu', PHUONG_XA: 'Phường/Xã' }[p.loai] || p.loai;

        let valText = '';
        if (selectedIndicator === 'LST') {
          valText = `Nhiệt độ LST: <b style="color: #ea580c;">${info ? Number(info.gia_tri_lst).toFixed(1) + ' °C' : 'Chưa có'}</b>`;
        } else if (selectedIndicator === 'NDVI') {
          valText = `Chỉ số thực vật NDVI: <b style="color: #059669;">${info ? Number(info.ndvi).toFixed(3) : 'Chưa có'}</b>`;
        } else if (selectedIndicator === 'TVDI') {
          valText = `Chỉ số khô hạn TVDI: <b style="color: #d97706;">${info ? Number(info.tvdi).toFixed(3) : 'Chưa có'}</b>`;
        }

        lyr.bindTooltip(
          `<div style="font-size: 13px; line-height: 1.4;">
            <b style="color: #0891b2;">${p.name}</b> (${loaiTxt})<br/>
            <span>${valText}</span>
          </div>`,
          { className: 'glass-panel', sticky: true }
        );

        lyr.on('mouseover', () => lyr.setStyle({ fillOpacity: 0.88, weight: 2.2, color: '#f59e0b' }));
        lyr.on('mouseout', () => {
          let fillColor = '#38bdf8';
          if (info) {
            if (selectedIndicator === 'LST') fillColor = getLSTColor(Number(info.gia_tri_lst));
            else if (selectedIndicator === 'NDVI') fillColor = getNDVIColor(Number(info.ndvi));
            else if (selectedIndicator === 'TVDI') fillColor = getTVDIColor(Number(info.tvdi));
          }
          const defaultStroke = selectedIndicator === 'NDVI' ? '#065f46' : selectedIndicator === 'TVDI' ? '#b45309' : '#0369a1';
          lyr.setStyle({
            fillOpacity: info ? 0.68 : 0.20,
            weight: 0.9,
            color: defaultStroke,
            fillColor: fillColor
          });
        });

        // Lưu tham chiếu layer theo id để điều hướng từ Dropdown/Search
        districtLayersMapRef.current[p.id] = lyr;

        lyr.on('click', () => {
          setSelectedDistrict({
            id: p.id,
            ten_khu_vuc: p.name,
            loai_khu_vuc: loaiTxt,
            dien_tich_km2: p.dien_tich_km2,
            current_lst: info ? Number(info.gia_tri_lst).toFixed(1) : null,
            current_ndvi: info ? info.ndvi : null,
            current_tvdi: info ? info.tvdi : null,
            yearlyData: []
          });

          // Tải dữ liệu LST từng năm (2021 -> 2026) cho phường/xã này
          fetch(`${API_BASE}/khu-vuc/${p.id}/yearly-lst`)
            .then(r => r.json())
            .then(data => {
              setSelectedDistrict(prev => prev && prev.id === p.id ? { ...prev, yearlyData: data } : prev);
            })
            .catch(console.error);
        });
      }
    });
    districtLayerRef.current.addLayer(layer);

    // Tự động căn chỉnh bản đồ vừa vặn với vùng đô thị TP.HCM sau sáp nhập (bỏ qua huyện Côn Đảo ở xa ngoài biển để không bị kéo xa)
    if (!mapInstanceRef.current._hasFitBounds && layer.getLayers().length > 0) {
      const mainlandLayers = layer.getLayers().filter(l => l.feature?.properties?.name !== 'Côn Đảo');
      if (mainlandLayers.length > 0) {
        const group = L.featureGroup(mainlandLayers);
        mapInstanceRef.current.fitBounds(group.getBounds(), {
          paddingTopLeft: [340, 40], // chừa khoảng trống cho panel bên trái
          paddingBottomRight: [390, 80], // chừa khoảng trống cho panel bên phải và timeline dưới
          maxZoom: 12
        });
        mapInstanceRef.current._hasFitBounds = true;
      }
    }
  }, [geoDistricts, khuVucLst, selectedIndicator, showDistricts, activeTab, thresholdFilter]);

  // Hàm chọn Phường/Xã từ Select/Search: zoom tới ranh giới và mở popup chi tiết
  const handleSelectWard = (wardId) => {
    if (!wardId) {
      setSelectedDistrict(null);
      return;
    }
    const targetId = Number(wardId);
    const wardFeature = geoDistricts?.features?.find(f => f.properties.id === targetId);
    const wardKhuVuc = khuVucList.find(k => k.id === targetId);
    const info = khuVucLst.find(k => k.id === targetId);

    const name = wardFeature?.properties?.name || wardKhuVuc?.ten_khu_vuc || `Khu vực #${targetId}`;
    const loai = wardFeature?.properties?.loai || wardKhuVuc?.loai_khu_vuc || 'PHUONG_XA';
    const loaiTxt = { PHUONG: 'Phường', XA: 'Xã', DAC_KHU: 'Đặc khu', PHUONG_XA: 'Phường/Xã' }[loai] || loai;
    const dienTich = wardFeature?.properties?.dien_tich_km2 || wardKhuVuc?.dien_tich_km2;

    setSelectedDistrict({
      id: targetId,
      ten_khu_vuc: name,
      loai_khu_vuc: loaiTxt,
      dien_tich_km2: dienTich,
      current_lst: info ? Number(info.gia_tri_lst).toFixed(1) : null,
      current_ndvi: info ? info.ndvi : null,
      current_tvdi: info ? info.tvdi : null,
      yearlyData: []
    });

    // Zoom và mở tooltip trên bản đồ nếu layer tồn tại
    const targetLayer = districtLayersMapRef.current[targetId];
    if (targetLayer && mapInstanceRef.current) {
      try {
        const bounds = targetLayer.getBounds();
        mapInstanceRef.current.flyToBounds(bounds, {
          paddingTopLeft: [320, 50],
          paddingBottomRight: [360, 80],
          maxZoom: 14,
          duration: 1.2
        });
        targetLayer.fire('mouseover');
        setTimeout(() => targetLayer.openTooltip(), 600);
      } catch (e) {
        console.error(e);
      }
    }

    // Tải dữ liệu LST theo năm (2021-2026)
    fetch(`${API_BASE}/khu-vuc/${targetId}/yearly-lst`)
      .then(r => r.json())
      .then(data => {
        setSelectedDistrict(prev => prev && prev.id === targetId ? { ...prev, yearlyData: data } : prev);
      })
      .catch(console.error);
  };

  // Update Observation & Forecast Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // 1. Observations
    if (showObservation) {
      const activeStations = stationMode === 'KEY'
        ? getStationsWithLST(TRAM_VIEN_THAM_HCM, khuVucLst, lstPoints, timeline[selectedDateIdx]?.thoi_gian)
        : lstPoints.map((p, idx) => ({
            id: `LST-GRID-${idx + 1}`,
            ten: `Điểm Lưới Landsat #${idx + 1}`,
            ma: `GRID-${p.ma_lst || idx + 1}`,
            khu_vuc: 'Toạ độ Lưới Landsat',
            lat: p.vi_do,
            lng: p.kinh_do,
            loai: 'Điểm Lưới Chu kỳ 16 ngày',
            cam_bien: 'Landsat 8/9 Band 10 TIRS',
            do_cao: 'Vệ tinh 705 km',
            do_chinh_xac: 'Pixel 30m x 30m',
            dac_diem: 'Quan trắc chuỗi thời gian GEE Landsat 8/9',
            date: p.thoi_gian,
            lst: Math.round(p.gia_tri_lst * 10) / 10,
            ndvi: p.ndvi !== null && p.ndvi !== undefined ? Math.round(p.ndvi * 1000) / 1000 : 0.35,
            tvdi: 0.55,
            rain: p.luong_mua,
            humidity: p.do_am_dat
          }));

      activeStations.forEach(st => {
        const color = getLSTColor(st.lst);
        const isKey = stationMode === 'KEY';

        const html = `
          <div class="station-radar-marker" style="${isKey ? '' : 'transform: scale(0.72);'}">
            <div class="station-radar-pulse" style="background: ${color};"></div>
            <div class="station-radar-pill" style="background: rgba(15, 23, 42, 0.88); border-color: ${color}; box-shadow: 0 0 10px ${color};">
              <span style="font-size: 11px;">📡</span>
              <span style="color: ${color}; font-weight: 800;">${st.lst}°C</span>
              ${isKey ? `<span style="font-size: 9.5px; opacity: 0.85; margin-left: 2px;">${st.id}</span>` : ''}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'station-radar-icon',
          html: html,
          iconSize: isKey ? [90, 32] : [60, 26],
          iconAnchor: isKey ? [45, 16] : [30, 13]
        });

        const marker = L.marker([st.lat, st.lng], { icon, zIndexOffset: isKey ? 1000 : 500 });

        // Tooltip khi hover
        marker.bindTooltip(`
          <div style="font-family: system-ui; font-size: 11.5px; line-height: 1.45; color: #f8fafc; padding: 2px 4px;">
            <div style="display: flex; align-items: center; gap: 5px; font-weight: 700; color: #38bdf8;">
              <span>📡</span> ${st.ten}
            </div>
            <div style="font-size: 10.5px; color: #94a3b8;">Mã: ${st.ma} · ${st.khu_vuc}</div>
            <div style="margin-top: 4px; display: flex; gap: 8px; font-weight: 600;">
              <span>LST: <b style="color: ${color}">${st.lst} °C</b></span>
              <span>NDVI: <b style="color: #10b981">${st.ndvi}</b></span>
            </div>
            <div style="font-size: 10px; color: #cbd5e1; margin-top: 3px;">${st.cam_bien}</div>
          </div>
        `, { className: 'glass-panel', sticky: true, opacity: 0.96 });

        // Popup đầy đủ khi click
        const popupContent = `
          <div class="station-popup-card">
            <div class="station-popup-header">
              <span style="font-size: 20px;">📡</span>
              <div>
                <h4 class="station-popup-name">${st.ten}</h4>
                <span style="font-size: 11px; color: #94a3b8;">${st.ma} · ${st.loai}</span>
              </div>
            </div>
            <div class="station-popup-grid">
              <div class="station-popup-cell">
                <span class="station-popup-cell-label">Nhiệt độ LST</span>
                <span class="station-popup-cell-val" style="color: ${color};">${st.lst} °C</span>
              </div>
              <div class="station-popup-cell">
                <span class="station-popup-cell-label">Chỉ số thực vật NDVI</span>
                <span class="station-popup-cell-val" style="color: #10b981;">${st.ndvi}</span>
              </div>
              <div class="station-popup-cell">
                <span class="station-popup-cell-label">Khô hạn TVDI</span>
                <span class="station-popup-cell-val" style="color: #f59e0b;">${st.tvdi}</span>
              </div>
              <div class="station-popup-cell">
                <span class="station-popup-cell-label">Độ ẩm đất</span>
                <span class="station-popup-cell-val" style="color: #06b6d4;">${st.humidity || 68}%</span>
              </div>
            </div>
            <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
              • <b>Cảm biến:</b> ${st.cam_bien}<br/>
              • <b>Độ cao & Vị trí:</b> ${st.do_cao} · (${st.lat.toFixed(4)}°N, ${st.lng.toFixed(4)}°E)<br/>
              • <b>Đặc điểm:</b> ${st.dac_diem}
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
              <span style="font-size: 10.5px; color: #38bdf8; font-style: italic;">Đã đồng bộ quan trắc ${st.date}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: 'station-popup',
          maxWidth: 320,
          closeButton: true
        });

        // Bắt sự kiện click
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedDistrict(null);
          setSelectedPoint({
            type: `Trạm Quan Trắc Viễn Thám (${st.ma})`,
            name: st.ten,
            code: st.ma,
            date: st.date,
            lst: st.lst,
            ndvi: st.ndvi,
            tvdi: st.tvdi,
            rain: st.rain,
            humidity: st.humidity,
            sensor: st.cam_bien,
            note: st.dac_diem,
            lat: st.lat,
            lng: st.lng
          });
        });

        markersLayerRef.current.addLayer(marker);
      });
    }

    // 2. AI Forecasts (if enabled and on 2026 dates)
    if (showForecast && forecastPoints.length > 0) {
      const targetDate = timeline[selectedDateIdx]?.thoi_gian;
      // show forecast if latest date or filtered
      const pts = forecastPoints.slice(0, 12); // sample future
      pts.forEach(fp => {
        const color = getLSTColor(fp.gia_tri_lst_du_bao);
        const icon = L.divIcon({
          className: 'forecast-heat-pin',
          html: `<div class="heat-point-marker" style="background:${color}; width:24px; height:24px; border:2px dashed #ffffff; box-shadow:0 0 10px ${color}">✦${Math.round(fp.gia_tri_lst_du_bao)}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([fp.vi_do, fp.kinh_do], { icon });
        marker.on('click', () => {
          setSelectedPoint({
            type: `Dự báo (${fp.ten_model || 'GCN-LSTM'})`,
            date: fp.thoi_gian_du_bao,
            lst: fp.gia_tri_lst_du_bao,
            ndvi: 0.28,
            district: fp.ten_khu_vuc,
            lat: fp.vi_do,
            lng: fp.kinh_do
          });
        });

        markersLayerRef.current.addLayer(marker);
      });
    }
  }, [lstPoints, khuVucLst, forecastPoints, showObservation, stationMode, showForecast, selectedDateIdx]);

  // Execute AI Training (Yêu cầu quyền ADMIN)
  const handleStartTraining = async () => {
    if (!isAdmin) {
      alert('🔒 Từ chối truy cập: Chỉ Quản trị viên (ADMIN) mới có quyền khởi chạy huấn luyện mô hình.');
      return;
    }
    setTrainingLoading(true);
    setTrainingResult(null);

    try {
      const resp = await fetch(`${API_BASE}/training/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          ma_dataset: 1,
          ma_model: Number(selectedModelId),
          cach_xu_ly_thieu: missingStrategy,
          cach_xu_ly_nhieu: outlierStrategy,
          phuong_phap_chuan_hoa: normMethod,
          tham_so: {}
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Lỗi huấn luyện');
      setTrainingResult(data);

      // Refresh benchmarks
      fetch(`${API_BASE}/metrics/comparison`)
        .then(r => r.json())
        .then(d => setBenchmarkMetrics(d));
    } catch (err) {
      alert(`Huấn luyện thất bại: ${err.message}`);
    } finally {
      setTrainingLoading(false);
    }
  };

  // Lưu cấu hình tiền xử lý (Yêu cầu quyền ADMIN)
  const handleSaveTienXuLy = async () => {
    if (!isAdmin) {
      setPrepAlert({ type: 'error', msg: '🔒 Từ chối truy cập: Chỉ Quản trị viên (ADMIN) mới có quyền lưu cấu hình tiền xử lý.' });
      return;
    }
    setPrepSaving(true);
    setPrepAlert(null);
    try {
      const res = await fetch(`${API_BASE}/tien-xu-ly/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          ma_dataset: 1,
          cach_xu_ly_thieu: prepMissing,
          cach_xu_ly_nhieu: prepOutlier,
          phuong_phap_chuan_hoa: prepNorm,
          ngay_ket_thuc_train: `${prepTrainEndYear}-12-31`,
          ngay_ket_thuc_val: `${Number(prepTrainEndYear) + 1}-12-31`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi khi lưu cấu hình tiền xử lý');
      setPrepAlert({ type: 'success', msg: `✅ ${data.message || 'Lưu cấu hình tiền xử lý thành công!'}` });
      loadTienXuLy();
    } catch (err) {
      setPrepAlert({ type: 'error', msg: err.message });
    } finally {
      setPrepSaving(false);
    }
  };

  // Nạp tệp CSV thật lên CSDL (Yêu cầu quyền ADMIN)
  const [csvReport, setCsvReport] = useState(null);
  const handleUploadCsv = async (file, validateOnly = false) => {
    if (!isAdmin) {
      setPrepAlert({ type: 'error', msg: '🔒 Yêu cầu quyền ADMIN: Chỉ Quản trị viên mới được nạp bộ dữ liệu mới.' });
      return;
    }
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPrepAlert({ type: 'error', msg: 'Chỉ nhận tệp .csv' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setPrepAlert({ type: 'error', msg: 'Tệp vượt quá 50MB.' });
      return;
    }
    setUploadingDataset(true);
    setPrepAlert(null);
    setCsvReport(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ten_dataset', file.name.replace(/\.csv$/i, ''));
      fd.append('chi_kiem_tra', validateOnly ? 'true' : 'false');
      const res = await fetch(`${API_BASE}/datasets/upload-csv`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Lỗi nạp CSV');
      setCsvReport(data.report);
      setPrepAlert({ type: 'success', msg: `✅ ${data.message}` });
      if (!validateOnly) loadDatasets();
    } catch (err) {
      setPrepAlert({ type: 'error', msg: err.message });
    } finally {
      setUploadingDataset(false);
    }
  };

  // Nạp nhanh bộ dữ liệu nghiên cứu chuẩn GEE (1,150 dòng, 10 trạm TP.HCM)
  const handleQuickLoadResearch = async () => {
    if (!isAdmin) {
      setPrepAlert({ type: 'error', msg: '🔒 Yêu cầu quyền ADMIN: Chỉ Quản trị viên mới được nạp bộ dữ liệu mới.' });
      return;
    }
    setQuickLoadingResearch(true);
    setPrepAlert(null);
    try {
      const res = await fetch(`${API_BASE}/datasets/quick-load-research`, {
        method: 'POST',
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi nạp bộ dữ liệu nghiên cứu');
      setCsvReport(data.report);
      setPrepAlert({ type: 'success', msg: `✅ ${data.message}` });
      loadDatasets();
    } catch (err) {
      setPrepAlert({ type: 'error', msg: err.message });
    } finally {
      setQuickLoadingResearch(false);
    }
  };

  // Chạy thử nghiệm Tiền xử lý trên CSDL thật (10,080 dòng)
  const handleRunPipelineTest = async () => {
    if (!isAdmin) {
      setPrepAlert({ type: 'error', msg: '🔒 Yêu cầu quyền ADMIN: Chỉ Quản trị viên mới được kích hoạt pipeline trên CSDL.' });
      return;
    }
    setPipelineLoading(true);
    setPrepAlert(null);
    try {
      const q = new URLSearchParams({
        ma_dataset: '1',
        cach_xu_ly_thieu: prepMissing,
        cach_xu_ly_nhieu: prepOutlier,
        phuong_phap_chuan_hoa: prepNorm,
        nguong_lst_max: String(prepThreshold),
        train_end_year: String(prepTrainEndYear)
      });
      const res = await fetch(`${API_BASE}/tien-xu-ly/pipeline?${q.toString()}`, {
        method: 'POST',
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi chạy thử nghiệm tiền xử lý');
      setPipelineReport(data);
      setPrepAlert({
        type: 'success',
        msg: `🧪 Thử nghiệm tiền xử lý thành công trên ${data.data_split?.total_records?.toLocaleString() || 10080} bản ghi CSDL! Tỷ lệ phân chia: ${data.data_split?.split_ratio}`
      });
    } catch (err) {
      setPrepAlert({ type: 'error', msg: err.message });
    } finally {
      setPipelineLoading(false);
    }
  };

  // Lọc danh sách phường/xã theo điều kiện ngưỡng và từ khóa tìm kiếm (phản hồi tức thì)
  const getFilteredStatsItems = () => {
    let list = statsData.items || [];
    // Lọc theo ngưỡng nếu người dùng chọn GTE hoặc LTE
    if (statsCondition === 'GTE' && statsThreshold !== undefined && statsThreshold !== '') {
      list = list.filter(it => Number(it.tb) >= Number(statsThreshold));
    } else if (statsCondition === 'LTE' && statsThreshold !== undefined && statsThreshold !== '') {
      list = list.filter(it => Number(it.tb) <= Number(statsThreshold));
    }
    // Lọc theo từ khóa tìm kiếm
    if (statsSearchText && statsSearchText.trim()) {
      const q = statsSearchText.trim().toLowerCase();
      list = list.filter(it => it.khu_vuc.toLowerCase().includes(q));
    }
    return list;
  };

  const currentDateInfo = timeline[selectedDateIdx] || {};

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Navigation */}
      <header className="app-header">
        <div className="brand-wrapper" onClick={onHome} role="button" tabIndex={0} title="Về trang chủ" style={{ cursor: onHome ? 'pointer' : 'default' }}>
          <div className="brand-icon">
            <Flame size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">LST-HCM AI WebGIS</h1>
            <div className="brand-subtitle">
              <Sparkles size={12} />
              Dự báo Nhiệt độ Bề mặt Đất & Đảo nhiệt Đô thị TP.HCM
            </div>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'gis' ? 'active' : ''}`}
            onClick={() => setActiveTab('gis')}
          >
            <MapIcon size={16} />
            Bản đồ LST
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'timeseries' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeseries')}
          >
            <TrendingUp size={16} />
            Chuỗi thời gian
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            <BarChart3 size={16} />
            Thống kê khu vực
          </button>
          {isAdmin && (
            <>
              <button
                className={`nav-tab-btn ${activeTab === 'datasets' ? 'active' : ''}`}
                onClick={() => setActiveTab('datasets')}
              >
                <Database size={16} />
                Nạp dữ liệu & Tiền xử lý
              </button>
              <button
                className={`nav-tab-btn ${activeTab === 'training' ? 'active' : ''}`}
                onClick={() => setActiveTab('training')}
              >
                <Cpu size={16} />
                Huấn luyện AI Lab
              </button>
            </>
          )}
          <button
            className={`nav-tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            <BarChart3 size={16} />
            So sánh mô hình
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <div
                className="user-badge clickable"
                onClick={() => setProfileOpen(!profileOpen)}
                title="Bấm để xem thông tin tài khoản"
              >
                <div
                  className="user-avatar"
                  style={{
                    backgroundColor: isAdmin ? '#ef4444' : '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700
                  }}
                >
                  {isAdmin ? 'AD' : 'ND'}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                    {isAdmin ? 'Quản trị viên' : 'Người dùng'}
                  </div>
                  <div style={{ fontSize: '10px', color: isAdmin ? '#ef4444' : 'var(--accent-emerald)', fontWeight: 600 }}>
                    ● {isAdmin ? 'Quyền Admin' : 'Khách xem'}
                  </div>
                </div>
              </div>
              <UserProfilePopup
                user={currentUser}
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onLogout={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('auth_user');
                  setCurrentUser(null);
                  setProfileOpen(false);
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="app-auth-btn app-auth-login"
                onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
              >
                <LogIn size={13} />
                Đăng nhập
              </button>
              <button
                className="app-auth-btn app-auth-register"
                onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
              >
                <UserPlus size={13} />
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* 2. Main Body Tabs */}
      <main className="app-content">
        {/* ================= TAB 1: WEBGIS VIEW (BẢN ĐỒ CHỦ ĐẠO LUÔN GIỮ TRONG DOM) ================= */}
        <div className="gis-container" style={{ display: activeTab === 'gis' ? 'flex' : 'none' }}>
          {/* Top Map Toolbar - Chuẩn theo thiết kế ảnh giao diện */}
          <div className="gis-top-toolbar">
            <div className="gis-toolbar-scope">
              <MapPin size={13} color="#f97316" />
              <span><strong>Phạm vi:</strong> TP.HCM (167 phường/xã) | <strong>Chuỗi dữ liệu:</strong> 2015 – 2026 (Landsat 8/9 & GEE)</span>
            </div>

            <div className="gis-toolbar-controls">
              {/* Nút chuyển đổi 2D / 3D */}
              <div className="map-mode-toggle">
                <button
                  type="button"
                  className={`map-mode-btn ${mapMode === '2D' ? 'active' : ''}`}
                  onClick={() => setMapMode('2D')}
                >
                  <MapIcon size={13} />
                  <span>Bản đồ 2D</span>
                </button>
                <button
                  type="button"
                  className={`map-mode-btn ${mapMode === '3D' ? 'active mode-3d' : ''}`}
                  onClick={() => setMapMode('3D')}
                >
                  <Globe size={13} />
                  <span>Bản đồ 3D</span>
                </button>
              </div>

              {/* Hệ số độ đùn 3D Extrusion Factor */}
              {mapMode === '3D' && (
                <div className="extrusion-toggle">
                  <span className="extrusion-label">Độ đùn:</span>
                  {[1.0, 1.5, 2.0].map(sc => (
                    <button
                      key={sc}
                      type="button"
                      className={`extrusion-btn ${extrusionScale === sc ? 'active' : ''}`}
                      onClick={() => setExtrusionScale(sc)}
                    >
                      {sc}x
                    </button>
                  ))}
                </div>
              )}

              {/* Nút Toàn cảnh */}
              <button
                type="button"
                className="gis-action-btn"
                onClick={handleResetView}
                title="Góc nhìn toàn cảnh TP.HCM"
              >
                <Maximize2 size={13} />
                <span>Toàn cảnh</span>
              </button>

              {/* Nút Khung Bản đồ A4 */}
              <button
                type="button"
                className="gis-action-btn frame"
                onClick={() => setMapFrameOpen(true)}
                title="Khung bản đồ chuẩn A4 in ấn / xuất báo cáo"
              >
                <Compass size={13} />
                <span>Khung Bản đồ A4</span>
              </button>

              {/* Nút 167 Phường & Lọc ngưỡng */}
              <button
                type="button"
                className={`gis-action-btn wards ${wardListOpen ? 'active' : ''}`}
                onClick={() => setWardListOpen(true)}
                title="Danh sách 167 phường & Lọc ngưỡng"
              >
                <ListFilter size={13} />
                <span>167 Phường</span>
                {thresholdFilter.enabled && <span className="filter-dot" />}
              </button>
            </div>
          </div>

          {/* Khung bản đồ 2D Leaflet */}
          <div
            ref={mapContainerRef}
            className="leaflet-container"
            style={{ display: mapMode === '2D' ? 'block' : 'none' }}
          />

          {/* Khung bản đồ 3D Three.js đùn đa giác */}
          {mapMode === '3D' && (
            <div className="map-3d-wrapper">
              <Map3DView
                geoDistricts={geoDistricts}
                khuVucLst={khuVucLst}
                selectedIndicator={selectedIndicator}
                extrusionScale={extrusionScale}
                selectedWard={selectedDistrict}
                onSelectWard={(w) => handleSelectWard(w.id || w.ma_khu_vuc)}
                thresholdFilter={thresholdFilter}
                currentDate={currentDateInfo.thoi_gian}
                showObservation={showObservation}
                stations={getStationsWithLST(TRAM_VIEN_THAM_HCM, khuVucLst, lstPoints, currentDateInfo.thoi_gian)}
              />
            </div>
          )}

          {/* Thanh hiển thị Toạ độ, Thước tỷ lệ và Thang màu trực tiếp trên bản đồ */}
          <div className="in-map-cartography-bar">
            <div className="in-map-coords">
              <Compass size={13} color="#0891b2" />
              <span>{mouseCoords.lat.toFixed(4)}° N, {mouseCoords.lng.toFixed(4)}° E</span>
            </div>
            <div className="in-map-scale">
              <div className="mini-scale-ruler" />
              <span>0 — 5 — 10 km</span>
            </div>
            <div className="in-map-legend">
              <span className="in-map-legend-title">
                {selectedIndicator === 'LST' ? 'Thang nhiệt LST (°C):' : selectedIndicator === 'NDVI' ? 'Thang NDVI:' : 'Thang TVDI:'}
              </span>
              <div className="in-map-legend-gradient">
                <div
                  className="legend-grad-bar"
                  style={{
                    background: selectedIndicator === 'LST'
                      ? 'linear-gradient(90deg, #0000FF 0%, #0066FF 14.3%, #00FFFF 28.6%, #00FF00 42.9%, #FFFF00 57.1%, #FFCC00 71.4%, #FF6600 85.7%, #FF0000 100%)'
                      : selectedIndicator === 'NDVI'
                      ? 'linear-gradient(90deg, #FF0000 0%, #FF7F00 14.3%, #FFFF00 28.6%, #ADFF2F 42.9%, #00FF00 57.1%, #00FFFF 71.4%, #007FFF 85.7%, #0000FF 100%)'
                      : 'linear-gradient(90deg, #066b00 0%, #0bc400 14.3%, #0ce100 28.6%, #00ff00 42.9%, #ffff00 57.1%, #ffcc00 71.4%, #ff6600 85.7%, #ff0000 100%)'
                  }}
                />
                <div className="legend-grad-ticks">
                  {selectedIndicator === 'LST' ? (
                    <>
                      <span>&lt;28°</span>
                      <span>30°</span>
                      <span>32°</span>
                      <span>34°</span>
                      <span>35.5°</span>
                      <span>37°</span>
                      <span>&gt;38.5°C</span>
                    </>
                  ) : selectedIndicator === 'NDVI' ? (
                    <>
                      <span>&lt;0.15</span>
                      <span>0.25</span>
                      <span>0.35</span>
                      <span>0.45</span>
                      <span>0.55</span>
                      <span>0.65</span>
                      <span>&gt;0.75</span>
                    </>
                  ) : (
                    <>
                      <span>&lt;0.25</span>
                      <span>0.35</span>
                      <span>0.45</span>
                      <span>0.55</span>
                      <span>0.65</span>
                      <span>0.75</span>
                      <span>&gt;0.85</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* La bàn chỉ hướng Bắc trong khung bản đồ */}
          <div className="in-map-compass">
            <div className="north-arrow">
              <span className="north-letter">N</span>
              <div className="north-pointer">▲</div>
            </div>
          </div>

            {/* Floating Left GIS Panel: Controls & Layers */}
            <div className="gis-left-panel">
              {/* CHỌN CHỈ SỐ LST / NDVI / TVDI (Giống Ảnh 3, 4) */}
              <div className="glass-panel" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    CHỈ SỐ
                  </span>
                  <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedIndicator('LST')}
                      style={{
                        border: 0,
                        padding: '5px 14px',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: selectedIndicator === 'LST' ? '#ffffff' : 'transparent',
                        color: selectedIndicator === 'LST' ? '#0891b2' : '#64748b',
                        boxShadow: selectedIndicator === 'LST' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      LST
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIndicator('NDVI')}
                      style={{
                        border: 0,
                        padding: '5px 14px',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: selectedIndicator === 'NDVI' ? '#ffffff' : 'transparent',
                        color: selectedIndicator === 'NDVI' ? '#059669' : '#64748b',
                        boxShadow: selectedIndicator === 'NDVI' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      NDVI
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIndicator('TVDI')}
                      style={{
                        border: 0,
                        padding: '5px 14px',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: selectedIndicator === 'TVDI' ? '#ffffff' : 'transparent',
                        color: selectedIndicator === 'TVDI' ? '#ea580c' : '#64748b',
                        boxShadow: selectedIndicator === 'TVDI' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      TVDI
                    </button>
                  </div>
                </div>
              </div>

              {/* Layer Controller */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Layers size={14} color="#22d3ee" />
                    Lớp Bản đồ GIS
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, color: '#0891b2' }}>
                    <input
                      type="checkbox"
                      checked={showDistricts}
                      onChange={e => setShowDistricts(e.target.checked)}
                    />
                    <span>
                      {selectedIndicator === 'LST' ? '🔥 Bản đồ phân vùng nhiệt LST (168 Phường/Xã)' :
                       selectedIndicator === 'NDVI' ? '🌿 Bản đồ phân vùng thực vật NDVI (168 Phường/Xã)' :
                       '☀️ Bản đồ phân vùng khô hạn TVDI (168 Phường/Xã)'}
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showObservation}
                      onChange={e => setShowObservation(e.target.checked)}
                    />
                    <span style={{ fontWeight: showObservation ? 700 : 400, color: showObservation ? '#38bdf8' : 'inherit' }}>
                      Hiển thị thêm điểm trạm quan trắc viễn thám
                    </span>
                  </label>

                  {/* Bảng điều khiển phụ xuất hiện khi tick vào checkbox trạm quan trắc */}
                  {showObservation && (
                    <div className="station-subcontrols-panel">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Radio size={13} />
                          Chế độ quan trắc viễn thám:
                        </span>
                        <span style={{ fontSize: '10.5px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
                          {stationMode === 'KEY' ? '10 Trạm Trọng Điểm' : '168 Điểm Lưới'}
                        </span>
                      </div>

                      <div className="station-mode-toggle">
                        <button
                          type="button"
                          className={`station-mode-btn ${stationMode === 'KEY' ? 'active' : ''}`}
                          onClick={() => setStationMode('KEY')}
                          title="10 trạm khí tượng & viễn thám mặt đất trọng điểm TP.HCM"
                        >
                          ⭐ 10 Trạm Trọng Điểm
                        </button>
                        <button
                          type="button"
                          className={`station-mode-btn ${stationMode === 'ALL' ? 'active' : ''}`}
                          onClick={() => setStationMode('ALL')}
                          title="168 điểm đo lưới viễn thám Landsat 8/9"
                        >
                          🌐 168 Điểm Lưới Landsat
                        </button>
                      </div>

                      <div style={{ fontSize: '10.5px', color: '#94a3b8', lineHeight: '1.4' }}>
                        {stationMode === 'KEY'
                          ? '• Hiển thị 10 đài quan trắc chuẩn GEE & AWS với cảm biến Landsat 8/9 Band 10 TIRS, hiệu ứng radar phát sóng.'
                          : '• Hiển thị 168 điểm ảnh viễn thám Landsat phủ kín các xã/phường.'}
                      </div>

                      {/* Danh sách nhanh 10 trạm để click zoom tới */}
                      {stationMode === 'KEY' && (
                        <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-dim)' }}>
                              Tra cứu nhanh trạm:
                            </span>
                            <button
                              type="button"
                              onClick={() => setStationDrawerOpen(!stationDrawerOpen)}
                              style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '10.5px', cursor: 'pointer', padding: 0 }}
                            >
                              {stationDrawerOpen ? 'Thu gọn ▲' : 'Xem danh sách ▼'}
                            </button>
                          </div>

                          {stationDrawerOpen && (
                            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '2px' }}>
                              {getStationsWithLST(TRAM_VIEN_THAM_HCM, khuVucLst, lstPoints, timeline[selectedDateIdx]?.thoi_gian).map(st => {
                                const c = getLSTColor(st.lst);
                                return (
                                  <div
                                    key={st.id}
                                    onClick={() => handleFlyToStation(st)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '4px 6px',
                                      background: 'rgba(30, 41, 59, 0.6)',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'}
                                    title={`Click để phóng to đến ${st.ten}`}
                                  >
                                    <span style={{ color: 'var(--text-main)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                      📡 {st.ten}
                                    </span>
                                    <span style={{ color: c, fontWeight: 800, fontFamily: 'JetBrains Mono', fontSize: '10.5px' }}>
                                      {st.lst}°C
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showForecast}
                      onChange={e => setShowForecast(e.target.checked)}
                    />
                    <span>Dự báo Tương lai (GCN-LSTM / XGB)</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Heat / Vegetation / Drought Scale Legend */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Thermometer size={14} color={selectedIndicator === 'NDVI' ? '#059669' : selectedIndicator === 'TVDI' ? '#ea580c' : '#f97316'} />
                    {selectedIndicator === 'LST' ? 'Thang Đo Nhiệt Bề Mặt LST (°C)' :
                     selectedIndicator === 'NDVI' ? 'Thang Đo Chỉ Số Thực Vật (NDVI)' :
                     'Thang Đo Chỉ Số Khô Hạn (TVDI)'}
                  </span>
                </div>
                <div className="card-body">
                  <div
                    className="legend-bar"
                    style={{
                      background: selectedIndicator === 'LST'
                        ? 'linear-gradient(90deg, #0000FF 0%, #0066FF 14.3%, #00FFFF 28.6%, #00FF00 42.9%, #FFFF00 57.1%, #FFCC00 71.4%, #FF6600 85.7%, #FF0000 100%)'
                        : selectedIndicator === 'NDVI'
                        ? 'linear-gradient(90deg, #FF0000 0%, #FF7F00 14.3%, #FFFF00 28.6%, #ADFF2F 42.9%, #00FF00 57.1%, #00FFFF 71.4%, #007FFF 85.7%, #0000FF 100%)'
                        : 'linear-gradient(90deg, #066b00 0%, #0bc400 14.3%, #0ce100 28.6%, #00ff00 42.9%, #ffff00 57.1%, #ffcc00 71.4%, #ff6600 85.7%, #ff0000 100%)'
                    }}
                  />
                  {selectedIndicator === 'LST' && (
                    <>
                      <div className="legend-labels">
                        <span>&lt;28°C</span>
                        <span>32°C</span>
                        <span>35.5°C</span>
                        <span>&gt;38.5°C</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ color: '#0066FF', fontWeight: 600 }}>Rất mát mẻ</span>
                        <span>Ổn định</span>
                        <span style={{ color: '#FF0000', fontWeight: 700 }}>Đảo nhiệt UHI</span>
                      </div>
                    </>
                  )}
                  {selectedIndicator === 'NDVI' && (
                    <>
                      <div className="legend-labels">
                        <span>&lt;0.15</span>
                        <span>0.35</span>
                        <span>0.55</span>
                        <span>&gt;0.75</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ color: '#FF0000', fontWeight: 600 }}>Bê tông / Đất trống</span>
                        <span style={{ color: '#0000FF', fontWeight: 700 }}>Rừng rậm / Cây xanh dày</span>
                      </div>
                    </>
                  )}
                  {selectedIndicator === 'TVDI' && (
                    <>
                      <div className="legend-labels">
                        <span>&lt;0.25</span>
                        <span>0.45</span>
                        <span>0.65</span>
                        <span>&gt;0.85</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ color: '#066b00', fontWeight: 600 }}>Rất ẩm / Đủ nước</span>
                        <span style={{ color: '#ff0000', fontWeight: 700 }}>Khô hạn gay gắt</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Real-time Observation Quick KPI */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Clock size={14} color="#10b981" />
                    Thời điểm: {currentDateInfo.thoi_gian || 'Đang tải...'}
                  </span>
                </div>
                <div className="card-body">
                  <div className="metrics-grid">
                    <div className="metric-box">
                      <div className="metric-name">LST Trung Bình</div>
                      <div className="metric-val" style={{ color: '#ca8a04' }}>{currentDateInfo.avg_lst || '--'}°C</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-name">LST Cực Đại</div>
                      <div className="metric-val" style={{ color: '#ef4444' }}>{currentDateInfo.max_lst || '--'}°C</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-name">Chỉ số NDVI TB</div>
                      <div className="metric-val" style={{ color: '#10b981' }}>{currentDateInfo.avg_ndvi || '--'}</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-name">Điểm trạm</div>
                      <div className="metric-val" style={{ color: '#0891b2' }}>{currentDateInfo.points_count || 12}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Right GIS Panel: Point & District Inspector */}
            <div className="gis-right-panel">
              {/* KHỐI CHỌN & TRA CỨU PHƯỜNG / XÃ (168 đơn vị hành chính) */}
              <div className="glass-panel" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapIcon size={14} color="#0891b2" />
                    Khu vực (Phường / Xã)
                  </label>
                  <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 600 }}>
                    {khuVucList.length > 0 ? `${khuVucList.length} đơn vị` : '168 phường/xã'}
                  </span>
                </div>

                {/* Dropdown danh sách toàn bộ Phường/Xã */}
                <select
                  className="styled-select"
                  value={selectedDistrict?.id || ''}
                  onChange={(e) => handleSelectWard(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #0891b2',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(8, 145, 178, 0.12)'
                  }}
                >
                  <option value="">-- Chọn Phường / Xã để định vị & tra cứu --</option>
                  {khuVucList
                    .slice()
                    .sort((a, b) => a.ten_khu_vuc.localeCompare(b.ten_khu_vuc, 'vi'))
                    .map((kv) => {
                      const loai = { PHUONG: 'Phường', XA: 'Xã', DAC_KHU: 'Đặc khu', PHUONG_XA: 'Phường/Xã' }[kv.loai_khu_vuc] || kv.loai_khu_vuc;
                      return (
                        <option key={kv.id} value={kv.id}>
                          {kv.ten_khu_vuc} ({loai})
                        </option>
                      );
                    })}
                </select>

                {/* Ô tìm kiếm nhanh phường/xã */}
                <div style={{ position: 'relative', marginTop: '8px' }}>
                  <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Gõ tên tìm nhanh (vd: Bến Nghé, Tân Thới Nhất...)"
                    value={districtSearchText}
                    onChange={(e) => setDistrictSearchText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      background: '#f8fafc',
                      outline: 'none'
                    }}
                  />
                  {districtSearchText && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}
                    >
                      {khuVucList
                        .filter(k => k.ten_khu_vuc.toLowerCase().includes(districtSearchText.toLowerCase()))
                        .slice(0, 15)
                        .map(kv => (
                          <div
                            key={kv.id}
                            onClick={() => {
                              handleSelectWard(kv.id);
                              setDistrictSearchText('');
                            }}
                            style={{
                              padding: '7px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{kv.ten_khu_vuc}</span>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{kv.loai_khu_vuc}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedPoint ? (
                <div className="glass-panel">
                  <div className="card-header">
                    <span className="card-title">
                      <Thermometer size={14} color="#f97316" />
                      Chi tiết Tọa độ Trạm Quan trắc
                    </span>
                    <button
                      onClick={() => setSelectedPoint(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Phân loại:</span>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--accent-sky)' }}>{selectedPoint.type}</span>
                    </div>
                    {selectedPoint.name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Tên trạm:</span>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: '#f8fafc' }}>{selectedPoint.name}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Thời gian:</span>
                      <span style={{ fontWeight: 600, fontSize: '12px' }}>{selectedPoint.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Nhiệt độ LST:</span>
                      <span style={{ fontWeight: 800, fontSize: '16px', color: getLSTColor(selectedPoint.lst) }}>
                        {selectedPoint.lst}°C
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chỉ số thực vật (NDVI):</span>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: '#10b981' }}>{selectedPoint.ndvi}</span>
                    </div>
                    {selectedPoint.tvdi !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Khô hạn (TVDI):</span>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#f59e0b' }}>{selectedPoint.tvdi}</span>
                      </div>
                    )}
                    {selectedPoint.sensor && (
                      <div style={{ fontSize: '11px', color: '#cbd5e1', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Cảm biến viễn thám:</span>
                        <b>{selectedPoint.sensor}</b>
                      </div>
                    )}
                    {selectedPoint.note && (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        {selectedPoint.note}
                      </div>
                    )}
                    {selectedPoint.rain !== undefined && selectedPoint.rain !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Lượng mưa:</span>
                        <span style={{ fontWeight: 600, fontSize: '12px' }}>{selectedPoint.rain} mm</span>
                      </div>
                    )}
                    {selectedPoint.humidity !== undefined && selectedPoint.humidity !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Độ ẩm đất:</span>
                        <span style={{ fontWeight: 600, fontSize: '12px' }}>{selectedPoint.humidity}%</span>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Tọa độ WGS84: {selectedPoint.lat.toFixed(4)}°N, {selectedPoint.lng.toFixed(4)}°E
                    </div>
                  </div>
                </div>
              ) : selectedDistrict ? (
                <div className="glass-panel">
                  <div className="card-header">
                    <span className="card-title">
                      <MapIcon size={14} color="#22d3ee" />
                      Thông tin Khu vực Hành chính
                    </span>
                    <button
                      onClick={() => setSelectedDistrict(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '16px', color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>{selectedDistrict.ten_khu_vuc}</h3>
                      <span style={{ fontSize: '11px', color: '#0891b2', background: 'rgba(8, 145, 178, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {selectedDistrict.loai_khu_vuc}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      {selectedDistrict.dien_tich_km2 && (
                        <span>Diện tích: <b>{Number(selectedDistrict.dien_tich_km2).toFixed(2)} km²</b></span>
                      )}
                      {selectedDistrict.current_lst && (
                        <span>LST hiện tại: <b style={{ color: '#ea580c' }}>{selectedDistrict.current_lst}°C</b></span>
                      )}
                    </div>

                    {/* Bảng Diễn biến LST theo từng năm */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Thermometer size={14} color="#f97316" />
                        Diễn biến LST qua các năm (2021 – 2026):
                      </div>

                      {selectedDistrict.yearlyData && selectedDistrict.yearlyData.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedDistrict.yearlyData.map((y) => (
                            <div
                              key={y.nam}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              <span style={{ fontWeight: 700, color: '#0f172a', width: '45px' }}>{y.nam}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, padding: '0 8px' }}>
                                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', flex: 1, overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${Math.min(100, Math.max(10, ((y.lst_trung_binh - 25) / 18) * 100))}%`,
                                      background: getLSTColor(y.lst_trung_binh),
                                      borderRadius: '4px'
                                    }}
                                  />
                                </div>
                              </div>
                              <span style={{ fontWeight: 700, color: getLSTColor(y.lst_trung_binh), width: '55px', textAlign: 'right' }}>
                                {y.lst_trung_binh}°C
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                          Đang tải số liệu chuỗi thời gian...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-sky)', fontSize: '13px', fontWeight: 600 }}>
                    <ShieldAlert size={16} />
                    Chỉ dẫn Thao tác GIS
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                    • Nhấp vào bất kỳ điểm trạm nào để xem nhiệt độ LST, chỉ số NDVI, lượng mưa và độ ẩm.<br />
                    • Nhấp vào ranh giới quận để tra cứu đặc điểm đảo nhiệt đô thị.<br />
                    • Sử dụng thanh trượt thời gian bên dưới để phát chuỗi thời gian 2021-2026.
                  </div>
                </div>
              )}

              {/* Best Model Overview Card */}
              {stats?.best_model && (
                <div className="glass-panel">
                  <div className="card-header">
                    <span className="card-title">
                      <Sparkles size={14} color="#a855f7" />
                      Mô hình Đạt Chuẩn Cao Nhất
                    </span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-sky)' }}>
                        {stats.best_model.ten_model}
                      </span>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Tối ưu nhất
                      </span>
                    </div>
                    <div className="metrics-grid">
                      <div className="metric-box">
                        <div className="metric-name">RMSE (Kiểm tra)</div>
                        <div className="metric-val">{stats.best_model.rmse}</div>
                      </div>
                      <div className="metric-box">
                        <div className="metric-name">R² Score</div>
                        <div className="metric-val" style={{ color: '#10b981' }}>{stats.best_model.r2}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Time Slider Controller at bottom (Thiết kế chuẩn giống Ảnh 1) */}
            {timeline && timeline.length > 0 && (
              <div className="time-slider-card">
                {/* Nút Play / Dừng */}
                <button
                  type="button"
                  className="time-slider-play-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={15} />
                      <span>Dừng</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} style={{ marginLeft: '2px' }} />
                      <span>Phát</span>
                    </>
                  )}
                </button>

                {/* Nhãn Tháng MM/YYYY hiện tại */}
                <div className="time-slider-cur-label">
                  Tháng <span className="time-slider-date-txt">
                    {(() => {
                      const d = currentDateInfo.thoi_gian;
                      if (!d) return '--/----';
                      const parts = d.split('-');
                      return `${parts[1]}/${parts[0]}`;
                    })()}
                  </span>
                </div>

                {/* Thanh kéo Timeline trực quan với phần fill đã chạy */}
                <div className="time-slider-track-wrap">
                  <input
                    type="range"
                    min="0"
                    max={timeline.length - 1}
                    value={selectedDateIdx}
                    onChange={e => {
                      setIsPlaying(false);
                      setSelectedDateIdx(Number(e.target.value));
                    }}
                    className="time-range-slider"
                    style={{
                      '--slider-progress': `${(selectedDateIdx / Math.max(1, timeline.length - 1)) * 100}%`
                    }}
                  />
                </div>

                {/* Khoảng thời gian Bắt đầu -> Kết thúc (ví dụ 01/2021 -> 12/2026) */}
                <div className="time-slider-bounds">
                  <div>01/2021 &rarr;</div>
                  <div>12/2026</div>
                </div>
              </div>
            )}
          </div>

        {/* ================= TAB: THỐNG KÊ KHU VỰC (Làm lại logic theo Ảnh 5) ================= */}
        {activeTab === 'statistics' && (
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
            
            {/* 1. Hàng bộ lọc trên cùng (Chỉ số, Tháng, Nguồn, Điều kiện, Ngưỡng, Tìm kiếm) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                
                {/* Chỉ số */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Chỉ số quan trắc</label>
                  <select
                    value={statsIndicator}
                    onChange={(e) => {
                      const newInd = e.target.value;
                      setStatsIndicator(newInd);
                      if (newInd === 'LST') setStatsThreshold(35);
                      else if (newInd === 'NDVI') setStatsThreshold(0.25);
                      else setStatsThreshold(0.60);
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                      cursor: 'pointer',
                      minWidth: '100px'
                    }}
                  >
                    <option value="LST">LST (Nhiệt độ °C)</option>
                    <option value="NDVI">NDVI (Thực vật)</option>
                    <option value="TVDI">TVDI (Khô hạn)</option>
                  </select>
                </div>

                {/* Tháng */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tháng quan trắc</label>
                  <select
                    value={statsMonth || (timeline[selectedDateIdx]?.thoi_gian?.substring(0, 7)) || '2025-12'}
                    onChange={(e) => setStatsMonth(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    {timeline && timeline.length > 0 ? (
                      Array.from(new Set(timeline.map(t => t.thoi_gian?.substring(0, 7)).filter(Boolean)))
                        .sort()
                        .reverse()
                        .map(m => {
                          const [y, mon] = m.split('-');
                          return (
                            <option key={m} value={m}>
                              Tháng {mon}/{y}
                            </option>
                          );
                        })
                    ) : (
                      <option value="2025-12">Tháng 12/2025</option>
                    )}
                  </select>
                </div>

                {/* Nguồn */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nguồn viễn thám</label>
                  <select
                    value={statsSource}
                    onChange={(e) => setStatsSource(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                      cursor: 'pointer',
                      minWidth: '160px'
                    }}
                  >
                    <option value="GEE / AI dự báo">GEE / AI dự báo</option>
                    <option value="Landsat/MODIS">Landsat/MODIS Gốc</option>
                    <option value="Mô hình GCN-LSTM">Mô hình GCN-LSTM</option>
                  </select>
                </div>

                {/* Điều kiện lọc ngưỡng */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Điều kiện lọc</label>
                  <select
                    value={statsCondition}
                    onChange={(e) => setStatsCondition(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                      cursor: 'pointer',
                      minWidth: '140px'
                    }}
                  >
                    <option value="ALL">Tất cả (167 phường)</option>
                    <option value="GTE">Lớn hơn hoặc bằng (≥)</option>
                    <option value="LTE">Nhỏ hơn hoặc bằng (≤)</option>
                  </select>
                </div>

                {/* Giá trị ngưỡng (chỉ bật khi không chọn ALL) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    Ngưỡng {statsIndicator === 'LST' ? '(°C)' : '(0.0 - 1.0)'}
                  </label>
                  <input
                    type="number"
                    step={statsIndicator === 'LST' ? '0.5' : '0.05'}
                    min={statsIndicator === 'LST' ? '20' : '0.0'}
                    max={statsIndicator === 'LST' ? '50' : '1.0'}
                    disabled={statsCondition === 'ALL'}
                    value={statsThreshold}
                    onChange={(e) => setStatsThreshold(Number(e.target.value))}
                    style={{
                      width: '90px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: statsCondition === 'ALL' ? '#94a3b8' : '#0f172a',
                      background: statsCondition === 'ALL' ? '#f1f5f9' : '#ffffff'
                    }}
                  />
                </div>

                {/* Ô tìm kiếm nhanh phường/xã */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tìm tên phường/xã</label>
                  <input
                    type="text"
                    placeholder="Gõ tên để tìm nhanh..."
                    value={statsSearchText}
                    onChange={(e) => setStatsSearchText(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      background: '#ffffff'
                    }}
                  />
                </div>

                {statsLoading && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0891b2', fontWeight: 600 }}>
                    <div className="spinner" style={{ width: '14px', height: '14px' }} />
                    Đang tổng hợp...
                  </div>
                )}
              </div>

              {/* Hàng nút gợi ý ngưỡng nhanh khoa học (Presets) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Gợi ý ngưỡng:</span>
                
                {statsIndicator === 'LST' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('ALL'); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #cbd5e1',
                        background: statsCondition === 'ALL' ? '#0891b2' : '#ffffff',
                        color: statsCondition === 'ALL' ? '#ffffff' : '#334155'
                      }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('GTE'); setStatsThreshold(35); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #facc15',
                        background: statsCondition === 'GTE' && statsThreshold === 35 ? '#facc15' : '#fffbeb',
                        color: '#b45309'
                      }}
                    >
                      ≥ 35.0 °C (Ấm áp)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('GTE'); setStatsThreshold(37); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #fb923c',
                        background: statsCondition === 'GTE' && statsThreshold === 37 ? '#fb923c' : '#fff7ed',
                        color: statsCondition === 'GTE' && statsThreshold === 37 ? '#ffffff' : '#c2410c'
                      }}
                    >
                      ≥ 37.0 °C (Nắng nóng)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('GTE'); setStatsThreshold(38); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #f87171',
                        background: statsCondition === 'GTE' && statsThreshold === 38 ? '#ef4444' : '#fef2f2',
                        color: statsCondition === 'GTE' && statsThreshold === 38 ? '#ffffff' : '#b91c1c'
                      }}
                    >
                      ≥ 38.0 °C (Đảo nhiệt cao)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('LTE'); setStatsThreshold(33); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #60a5fa',
                        background: statsCondition === 'LTE' && statsThreshold === 33 ? '#3b82f6' : '#eff6ff',
                        color: statsCondition === 'LTE' && statsThreshold === 33 ? '#ffffff' : '#1d4ed8'
                      }}
                    >
                      ≤ 33.0 °C (Vùng dịu mát)
                    </button>
                  </>
                )}

                {statsIndicator === 'NDVI' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('ALL'); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #cbd5e1',
                        background: statsCondition === 'ALL' ? '#0891b2' : '#ffffff',
                        color: statsCondition === 'ALL' ? '#ffffff' : '#334155'
                      }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('LTE'); setStatsThreshold(0.20); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #f87171',
                        background: statsCondition === 'LTE' && statsThreshold === 0.20 ? '#ef4444' : '#fef2f2',
                        color: statsCondition === 'LTE' && statsThreshold === 0.20 ? '#ffffff' : '#b91c1c'
                      }}
                    >
                      ≤ 0.20 (Bê tông hóa nặng / Thiếu cây)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('LTE'); setStatsThreshold(0.30); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #fbbf24',
                        background: statsCondition === 'LTE' && statsThreshold === 0.30 ? '#f59e0b' : '#fffbeb',
                        color: statsCondition === 'LTE' && statsThreshold === 0.30 ? '#ffffff' : '#b45309'
                      }}
                    >
                      ≤ 0.30 (Mảng xanh thưa)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('GTE'); setStatsThreshold(0.45); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #34d399',
                        background: statsCondition === 'GTE' && statsThreshold === 0.45 ? '#10b981' : '#ecfdf5',
                        color: statsCondition === 'GTE' && statsThreshold === 0.45 ? '#ffffff' : '#047857'
                      }}
                    >
                      ≥ 0.45 (Cây xanh bao phủ tốt)
                    </button>
                  </>
                )}

                {statsIndicator === 'TVDI' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('ALL'); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #cbd5e1',
                        background: statsCondition === 'ALL' ? '#0891b2' : '#ffffff',
                        color: statsCondition === 'ALL' ? '#ffffff' : '#334155'
                      }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('GTE'); setStatsThreshold(0.60); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #fbbf24',
                        background: statsCondition === 'GTE' && statsThreshold === 0.60 ? '#f59e0b' : '#fffbeb',
                        color: statsCondition === 'GTE' && statsThreshold === 0.60 ? '#ffffff' : '#b45309'
                      }}
                    >
                      ≥ 0.60 (Khô hạn vừa)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('GTE'); setStatsThreshold(0.70); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #fb923c',
                        background: statsCondition === 'GTE' && statsThreshold === 0.70 ? '#ea580c' : '#fff7ed',
                        color: statsCondition === 'GTE' && statsThreshold === 0.70 ? '#ffffff' : '#c2410c'
                      }}
                    >
                      ≥ 0.70 (Khô hạn nặng)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('GTE'); setStatsThreshold(0.80); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #f87171',
                        background: statsCondition === 'GTE' && statsThreshold === 0.80 ? '#dc2626' : '#fef2f2',
                        color: statsCondition === 'GTE' && statsThreshold === 0.80 ? '#ffffff' : '#991b1b'
                      }}
                    >
                      ≥ 0.80 (Cực kỳ khô cằn)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatsCondition('LTE'); setStatsThreshold(0.40); }}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #38bdf8',
                        background: statsCondition === 'LTE' && statsThreshold === 0.40 ? '#0284c7' : '#f0f9ff',
                        color: statsCondition === 'LTE' && statsThreshold === 0.40 ? '#ffffff' : '#0369a1'
                      }}
                    >
                      ≤ 0.40 (Đủ độ ẩm đất)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 2. Bố cục 2 cột chính: Cột trái (Biểu đồ thanh ngang) & Cột phải (Bảng thống kê) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '20px', flex: 1, minHeight: '620px' }}>
              
              {/* CỘT TRÁI: GIÁ TRỊ TRUNG BÌNH THEO KHU VỰC (HORIZONTAL BAR CHART) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Giá trị trung bình theo khu vực ({statsIndicator})
                  </h3>
                  {(() => {
                    const filtered = getFilteredStatsItems();
                    return (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2', background: '#ecfeff', padding: '3px 8px', borderRadius: '12px' }}>
                        {filtered.length} / 167 phường {statsCondition !== 'ALL' ? `(${statsCondition === 'GTE' ? '≥' : '≤'} ${statsThreshold}${statsIndicator === 'LST' ? '°C' : ''})` : ''}
                      </span>
                    );
                  })()}
                </div>

                {/* Container biểu đồ thanh ngang cuộn */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const items = getFilteredStatsItems();

                    if (items.length === 0) {
                      return (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '30px 10px', textAlign: 'center' }}>
                          Không có phường/xã nào thỏa mãn điều kiện lọc {statsCondition !== 'ALL' ? `(${statsCondition === 'GTE' ? '≥' : '≤'} ${statsThreshold}${statsIndicator === 'LST' ? '°C' : ''})` : ''}.
                        </div>
                      );
                    }

                    // Thang đo khoa học theo từng chỉ số
                    let domainMin = 0;
                    let domainMax = 1;
                    if (statsIndicator === 'LST') {
                      domainMin = 24;
                      domainMax = 42;
                    } else if (statsIndicator === 'NDVI') {
                      domainMin = 0.0;
                      domainMax = 0.9;
                    } else { // TVDI
                      domainMin = 0.0;
                      domainMax = 1.0;
                    }
                    const range = domainMax - domainMin;

                    return items.map((item, idx) => {
                      const val = Number(item.tb);
                      const pct = Math.max(6, Math.min(100, ((val - domainMin) / range) * 100));
                      const isHovered = hoveredBar === item.id;

                      // Màu sắc thanh ngang theo từng chỉ số
                      let barColor = '#0284c7';
                      if (statsIndicator === 'LST') {
                        if (val >= 37.0) barColor = '#ef4444';
                        else if (val >= 35.5) barColor = '#f97316';
                        else if (val >= 33.5) barColor = '#eab308';
                        else if (val >= 31.0) barColor = '#60a5fa';
                        else barColor = '#38bdf8';
                      } else if (statsIndicator === 'NDVI') {
                        if (val >= 0.45) barColor = '#10b981';
                        else if (val >= 0.30) barColor = '#34d399';
                        else if (val >= 0.20) barColor = '#eab308';
                        else barColor = '#cbd5e1';
                      } else { // TVDI
                        if (val >= 0.75) barColor = '#dc2626';
                        else if (val >= 0.60) barColor = '#ea580c';
                        else if (val >= 0.45) barColor = '#f59e0b';
                        else barColor = '#0284c7';
                      }

                      return (
                        <div
                          key={item.id || idx}
                          onMouseEnter={() => setHoveredBar(item.id)}
                          onMouseLeave={() => setHoveredBar(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '12px',
                            gap: '12px',
                            position: 'relative',
                            padding: '2px 0'
                          }}
                        >
                          {/* Tên khu vực */}
                          <div
                            style={{
                              width: '125px',
                              textAlign: 'right',
                              fontWeight: isHovered ? 700 : 500,
                              color: isHovered ? '#0891b2' : '#334155',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={item.khu_vuc}
                          >
                            {item.khu_vuc}
                          </div>

                          {/* Thanh Bar */}
                          <div style={{ flex: 1, height: '18px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: barColor,
                                borderRadius: '4px',
                                transition: 'width 0.4s ease',
                                opacity: isHovered ? 1 : 0.88
                              }}
                            />
                          </div>

                          {/* Tooltip khi hover thanh */}
                          {isHovered && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `calc(137px + ${pct * 0.55}%)`,
                                top: '-28px',
                                background: '#0f172a',
                                color: '#ffffff',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                zIndex: 20,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span style={{ color: '#38bdf8' }}>{item.khu_vuc}:</span> {val} {statsIndicator === 'LST' ? '°C' : ''} · Diện tích: {item.dien_tich_km2} km²
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Trục X số liệu dưới chân biểu đồ */}
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', paddingLeft: '137px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {statsIndicator === 'LST' ? (
                    <>
                      <span>24°C</span>
                      <span>28°C</span>
                      <span>32°C</span>
                      <span>36°C</span>
                      <span>40°C</span>
                    </>
                  ) : (
                    <>
                      <span>0.0</span>
                      <span>0.25</span>
                      <span>0.50</span>
                      <span>0.75</span>
                      <span>1.0</span>
                    </>
                  )}
                </div>
              </div>

              {/* CỘT PHẢI: BẢNG THỐNG KÊ CHI TIẾT (TABLE VIEW) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Bảng thống kê chi tiết
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Đơn vị: <b>{statsIndicator === 'LST' ? '°C' : 'Chỉ số (0-1)'}</b>
                  </div>
                </div>

                {/* Table Scrollable Container */}
                <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1.5px solid #e2e8f0', userSelect: 'none' }}>
                        <th
                          onClick={() => { setStatsSortCol('khu_vuc'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          KHU VỰC {statsSortCol === 'khu_vuc' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th
                          onClick={() => { setStatsSortCol('tb'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: '#0f172a' }}
                        >
                          TB {statsSortCol === 'tb' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th
                          onClick={() => { setStatsSortCol('min'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          MIN {statsSortCol === 'min' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th
                          onClick={() => { setStatsSortCol('max'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          MAX {statsSortCol === 'max' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th style={{ padding: '10px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>ĐỘ LỆCH</th>
                        <th
                          onClick={() => { setStatsSortCol('dien_tich_km2'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          DIỆN TÍCH (KM²) {statsSortCol === 'dien_tich_km2' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th style={{ padding: '10px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>% DIỆN TÍCH</th>
                        <th style={{ padding: '10px 10px', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'center' }}>MỨC ĐỘ</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>Δ CÙNG KỲ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Dòng tổng hợp đặc biệt: Toàn TP.HCM */}
                      {statsData.city_summary && !statsSearchText && (
                        <tr style={{ background: '#f1f5f9', fontWeight: 700, color: '#0f172a', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                          <td style={{ padding: '10px 14px', textAlign: 'left', color: '#0891b2' }}>
                            {statsData.city_summary.khu_vuc}
                          </td>
                          <td style={{ padding: '10px 10px', color: '#ea580c' }}>
                            {statsData.city_summary.tb} {statsIndicator === 'LST' ? '°C' : ''}
                          </td>
                          <td style={{ padding: '10px 8px' }}>{statsData.city_summary.min}</td>
                          <td style={{ padding: '10px 8px' }}>{statsData.city_summary.max}</td>
                          <td style={{ padding: '10px 8px' }}>{statsData.city_summary.do_lech}</td>
                          <td style={{ padding: '10px 10px' }}>{statsData.city_summary.dien_tich_km2}</td>
                          <td style={{ padding: '10px 10px' }}>100%</td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>
                              ĐÔ THỊ
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: statsData.city_summary.delta_cung_ky >= 0 ? '#ef4444' : '#10b981' }}>
                            {statsData.city_summary.delta_cung_ky > 0 ? `+${statsData.city_summary.delta_cung_ky}` : statsData.city_summary.delta_cung_ky}
                          </td>
                        </tr>
                      )}

                      {/* Danh sách từng phường / xã */}
                      {(() => {
                        const items = getFilteredStatsItems().slice();

                        items.sort((a, b) => {
                          let va = a[statsSortCol];
                          let vb = b[statsSortCol];
                          if (typeof va === 'string') {
                            return statsSortAsc ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
                          }
                          va = Number(va) || 0;
                          vb = Number(vb) || 0;
                          return statsSortAsc ? va - vb : vb - va;
                        });

                        if (items.length === 0) {
                          return (
                            <tr>
                              <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                Không có phường/xã nào thỏa mãn điều kiện lọc {statsCondition !== 'ALL' ? `(${statsCondition === 'GTE' ? '≥' : '≤'} ${statsThreshold}${statsIndicator === 'LST' ? '°C' : ''})` : ''}.
                              </td>
                            </tr>
                          );
                        }

                        return items.map((row, idx) => {
                          const areaVal = Number(row.dien_tich_km2);
                          const areaFormatted = isNaN(areaVal) ? row.dien_tich_km2 : areaVal.toFixed(2);
                          const pctArea = row.phan_tram_dien_tich ? `${row.phan_tram_dien_tich}%` : `${row.phan_tram_nguy_co || 0}%`;

                          // Mức độ cảnh báo
                          const warn = row.muc_do_canh_bao || 'AN_TOAN';
                          const warnBadge = warn === 'CAO' ? (
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>
                              NGUY CƠ CAO
                            </span>
                          ) : warn === 'TRUNG_BINH' ? (
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>
                              CẢNH BÁO
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: '#ecfdf5', color: '#047857' }}>
                              AN TOÀN
                            </span>
                          );

                          return (
                            <tr
                              key={row.id || idx}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                                {row.khu_vuc}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                                {row.tb}
                              </td>
                              <td style={{ padding: '8px 8px', color: '#64748b' }}>{row.min}</td>
                              <td style={{ padding: '8px 8px', color: '#64748b' }}>{row.max}</td>
                              <td style={{ padding: '8px 8px', color: '#64748b' }}>{row.do_lech}</td>
                              <td style={{ padding: '8px 10px', color: '#475569', fontWeight: 500 }}>{areaFormatted}</td>
                              <td style={{ padding: '8px 10px', color: '#0284c7', fontWeight: 600 }}>{pctArea}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {warnBadge}
                              </td>
                              <td style={{ padding: '8px 14px', fontWeight: 600, color: row.delta_cung_ky >= 0 ? '#ef4444' : '#10b981' }}>
                                {row.delta_cung_ky > 0 ? `+${row.delta_cung_ky}` : row.delta_cung_ky}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Footer Chú thích */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Dữ liệu tính toán từ 167 phường/xã TP.HCM. Bấm tiêu đề cột để sắp xếp.</span>
                  <span style={{ fontWeight: 600, color: '#0891b2' }}>
                    Hiển thị: {getFilteredStatsItems().length} / 167 phường/xã {statsCondition !== 'ALL' ? `(${statsCondition === 'GTE' ? '≥' : '≤'} ${statsThreshold}${statsIndicator === 'LST' ? '°C' : ''})` : ''}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB: CHUỖI THỜI GIAN (Time-series Dashboard theo Ảnh 1 & Ảnh 2) ================= */}
        {activeTab === 'timeseries' && (
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', background: '#f8fafc' }}>
            
            {/* 1. KHỐI TRÊN: LST THÁNG CỤ THỂ QUA CÁC NĂM (Khớp hoàn toàn nửa trên Ảnh 2) */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>LST tháng {tsMonth} qua các năm · {tsData?.ten_khu_vuc || 'TP.HCM'}</span>
                  </h2>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    {tsData?.insight_text || `Từ 2021 đến 2025 LST tháng ${tsMonth} đang tải...`}
                  </div>
                </div>

                {/* Bộ chọn Phường/Xã và Tháng */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Chọn Phường / Xã */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Khu vực:</span>
                    <select
                      value={tsWardId}
                      onChange={(e) => setTsWardId(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0f172a',
                        background: '#ffffff',
                        cursor: 'pointer',
                        maxWidth: '180px'
                      }}
                    >
                      <option value="">Toàn TP. Hồ Chí Minh</option>
                      {khuVucList
                        .slice()
                        .sort((a, b) => a.ten_khu_vuc.localeCompare(b.ten_khu_vuc, 'vi'))
                        .map(kv => (
                          <option key={kv.id} value={kv.id}>
                            {kv.ten_khu_vuc}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Chọn Tháng */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Tháng:</span>
                    <select
                      value={tsMonth}
                      onChange={(e) => setTsMonth(Number(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#0f172a',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BIỂU ĐỒ LINE CHART SVG CHUỖI NĂM (2021 -> 2027) */}
              <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '16px' }}>
                {(() => {
                  const items = tsData?.years_data || [];
                  if (items.length === 0) {
                    return <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '80px' }}>{tsData ? 'Chưa có dữ liệu LST trong CSDL cho lựa chọn này. Hãy nạp CSV ở tab Dữ liệu.' : 'Đang tải biểu đồ...'}</div>;
                  }

                  const minLST = Math.floor(Math.min(...items.map(i => i.lst)) * 2) / 2 - 0.5;
                  const maxLST = Math.ceil(Math.max(...items.map(i => i.lst)) * 2) / 2 + 0.5;
                  const svgWidth = 860;
                  const svgHeight = 200;
                  const padLeft = 45;
                  const padRight = 30;
                  const padTop = 15;
                  const padBottom = 30;

                  const getX = (idx) => padLeft + (idx / Math.max(1, items.length - 1)) * (svgWidth - padLeft - padRight);
                  const getY = (val) => padTop + (1 - (val - minLST) / (maxLST - minLST)) * (svgHeight - padTop - padBottom);

                  // Chia làm 2 path: Quá khứ (nét liền xanh đậm #0f766e) & Tương lai (nét đứt cam đỏ #ea580c)
                  const pastPoints = [];
                  const futurePoints = [];

                  items.forEach((item, idx) => {
                    const pt = { x: getX(idx), y: getY(item.lst), item, idx };
                    if (!item.is_forecast) {
                      pastPoints.push(pt);
                    } else {
                      if (futurePoints.length === 0 && pastPoints.length > 0) {
                        futurePoints.push(pastPoints[pastPoints.length - 1]); // Nối điểm giáp ranh 2025
                      }
                      futurePoints.push(pt);
                    }
                  });

                  const pastD = pastPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const futureD = futurePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  const yTicks = [minLST, (minLST + maxLST) / 2, maxLST];

                  return (
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {/* Grid ngang & Nhãn trục Y */}
                      {yTicks.map(t => {
                        const yPos = getY(t);
                        return (
                          <g key={t}>
                            <line x1={padLeft} y1={yPos} x2={svgWidth - padRight} y2={yPos} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <text x={padLeft - 8} y={yPos + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight="500">
                              {t.toFixed(1).replace('.', ',')}
                            </text>
                          </g>
                        );
                      })}

                      {/* Trục X nhãn năm */}
                      {items.map((it, idx) => {
                        if (it.nam % 2 !== 1 && it.nam !== 2027) return null; // hiện các năm lẻ: 2021, 2023, 2025, 2027
                        const xPos = getX(idx);
                        return (
                          <g key={it.nam}>
                            <line x1={xPos} y1={svgHeight - padBottom} x2={xPos} y2={svgHeight - padBottom + 4} stroke="#94a3b8" />
                            <text x={xPos} y={svgHeight - padBottom + 16} textAnchor="middle" fontSize="11" fill="#64748b">
                              {it.nam}
                            </text>
                          </g>
                        );
                      })}

                      {/* Đường quá khứ (Nét liền màu xanh lục đậm #0d9488) */}
                      {pastD && <path d={pastD} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                      {/* Đường dự báo (Nét đứt màu cam gạch #ea580c) */}
                      {futureD && <path d={futureD} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />}

                      {/* Các điểm tròn (dots) */}
                      {items.map((it, idx) => {
                        const cx = getX(idx);
                        const cy = getY(it.lst);
                        const isFc = it.is_forecast;
                        const isHovered = tsHoverPoint?.nam === it.nam;

                        return (
                          <g key={it.nam} style={{ cursor: 'pointer' }} onMouseEnter={() => setTsHoverPoint(it)} onMouseLeave={() => setTsHoverPoint(null)}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isHovered ? 6 : 4}
                              fill={isFc ? '#ea580c' : '#0f766e'}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                            {isHovered && (
                              <g>
                                <rect x={cx - 38} y={cy - 28} width="76" height="22" rx="4" fill="#1e293b" />
                                <text x={cx} y={cy - 14} textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="700">
                                  {it.lst}°C ({it.nam})
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* 2. KHỐI DƯỚI: CHIA 2 CỘT (Khớp nửa dưới Ảnh 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '20px', minHeight: '380px' }}>
              
              {/* CỘT TRÁI: LST THEO THÁNG (CHUỖI LIÊN TỤC 12 THÁNG/NĂM CÓ DẢI BÓNG DỰ BÁO) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    LST theo tháng · {tsData?.ten_khu_vuc || 'TP.HCM'}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Bấm vào biểu đồ để chọn tháng</span>
                </div>

                {/* SVG Line Chart Monthly Cycle */}
                <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '220px', marginTop: '10px' }}>
                  {(() => {
                    const series = tsData?.monthly_series || [];
                    if (series.length === 0) return <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '60px' }}>{tsData ? 'Chưa có dữ liệu chuỗi thời gian.' : 'Đang nạp chuỗi thời gian...'}</div>;

                    const allVals = series.flatMap(x => [x.lst_obs, x.lst_forecast, x.lst_scenario, x.upper_bound, x.lower_bound]).filter(v => v !== null && v !== undefined);
                    const minVal = Math.floor(Math.min(...allVals)) - 1;
                    const maxVal = Math.ceil(Math.max(...allVals)) + 1;
                    const yStep = Math.max(1, Math.round((maxVal - minVal) / 5));
                    const yTickList = [];
                    for (let t = Math.ceil(minVal); t <= maxVal; t += yStep) yTickList.push(t);
                    const w = 680;
                    const h = 200;
                    const pL = 35;
                    const pR = 20;
                    const pT = 15;
                    const pB = 30;

                    const tOf = (i) => (series[i].nam - series[0].nam) * 12 + series[i].thang - 1;
                    const tMax = Math.max(1, tOf(series.length - 1));
                    const getX = (idx) => pL + (tOf(idx) / tMax) * (w - pL - pR);
                    const getY = (val) => pT + (1 - (val - minVal) / (maxVal - minVal)) * (h - pT - pB);

                    // Phân chia dữ liệu Hiện trạng (trước 2026) và Dự báo (từ 2026 trở đi)
                    const obsPts = [];
                    const fcPts = [];
                    const scPts = [];
                    const upperPts = [];
                    const lowerPts = [];

                    series.forEach((it, idx) => {
                      const x = getX(idx);
                      if (it.lst_obs !== null) {
                        obsPts.push(`${obsPts.length === 0 ? 'M' : 'L'} ${x} ${getY(it.lst_obs)}`);
                      }
                      if (it.lst_forecast !== null) {
                        fcPts.push(`${fcPts.length === 0 ? 'M' : 'L'} ${x} ${getY(it.lst_forecast)}`);
                      }
                      if (it.lst_scenario !== null) {
                        scPts.push(`${scPts.length === 0 ? 'M' : 'L'} ${x} ${getY(it.lst_scenario)}`);
                      }
                      if (it.upper_bound !== null && it.lower_bound !== null) {
                        upperPts.push(`${x},${getY(it.upper_bound)}`);
                        lowerPts.unshift(`${x},${getY(it.lower_bound)}`);
                      }
                    });

                    // Vị trí vạch ngăn "dự báo"
                    const fcStartIdx = series.findIndex(s => s.lst_forecast !== null && s.lst_obs === null);
                    const hasFc = fcStartIdx >= 0;
                    const fcStartX = hasFc ? getX(fcStartIdx) : w - pR;

                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Vùng bóng dự báo đỏ nhạt (Forecast Shaded Zone) */}
                        {hasFc && <rect x={fcStartX} y={pT} width={w - pR - fcStartX} height={h - pT - pB} fill="rgba(239, 68, 68, 0.08)" />}
                        {hasFc && <line x1={fcStartX} y1={pT} x2={fcStartX} y2={h - pB} stroke="#ea580c" strokeWidth="1.5" />}
                        {hasFc && <text x={fcStartX + 6} y={pT + 12} fontSize="11" fill="#ea580c" fontWeight="600">dự báo</text>}

                        {/* Dải bóng tin cậy confidence band */}
                        {upperPts.length > 0 && (
                          <polygon
                            points={`${upperPts.join(' ')} ${lowerPts.join(' ')}`}
                            fill="rgba(234, 88, 12, 0.15)"
                          />
                        )}

                        {/* Đường lưới ngang Y */}
                        {yTickList.map(t => {
                          const yPos = getY(t);
                          return (
                            <g key={t}>
                              <line x1={pL} y1={yPos} x2={w - pR} y2={yPos} stroke="#f1f5f9" />
                              <text x={pL - 6} y={yPos + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                                {t}
                              </text>
                            </g>
                          );
                        })}

                        {/* Đường Hiện trạng GEE (Xanh đậm #0f766e) */}
                        <path d={obsPts.join(' ')} fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />

                        {/* Đường Dự báo AI GCN-LSTM (Đỏ cam nét đứt) */}
                        <path d={fcPts.join(' ')} fill="none" stroke="#ea580c" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />

                        {/* Đường Giả lập kịch bản (Xanh rêu nét đứt) */}
                        <path d={scPts.join(' ')} fill="none" stroke="#16a34a" strokeWidth="1.8" strokeDasharray="3 3" />

                        {/* Nhãn năm trục X */}
                        {[2021, 2022, 2023, 2024, 2025, 2026, 2027].map(yr => {
                          const idx = series.findIndex(s => s.nam === yr);
                          if (idx < 0) return null;
                          const x = getX(idx);
                          return (
                            <text key={yr} x={x} y={h - pB + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                              {yr}
                            </text>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>

                {/* Chú giải đường line */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b', marginTop: '12px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '3px', background: '#0f766e', borderRadius: '2px' }} />
                    <span>Hiện trạng GEE</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '0px', borderTop: '2px dashed #ea580c' }} />
                    <span style={{ color: '#ea580c', fontWeight: 600 }}>Dự báo AI (GCN-LSTM)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '0px', borderTop: '2px dashed #16a34a' }} />
                    <span>Giả lập kịch bản</span>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: XẾP HẠNG PHƯỜNG / XÃ (Làm lại kỹ theo Ảnh 4) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={16} color="#0891b2" />
                    <span>Xếp hạng phường/xã</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setTsRankingOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#0891b2',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Bấm để chuyển đổi giữa 15 phường nóng nhất và 15 phường mát nhất"
                  >
                    <ArrowUpDown size={12} />
                    <span>{tsRankingOrder === 'DESC' ? 'Xem mát nhất' : 'Xem nóng nhất'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
                  LST trung bình {tsData?.forecast_period || `tháng ${tsMonth.toString().padStart(2, '0')}/2025`}, Hiện trạng ({tsRankingOrder === 'DESC' ? '15 phường/xã nóng nhất' : '15 phường/xã mát nhất'})
                </div>

                {/* Danh sách thanh progress bar xếp hạng */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {tsLoading && (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      <div className="spinner" style={{ width: '16px', height: '16px', margin: '0 auto 8px auto' }} />
                      Đang cập nhật bảng xếp hạng...
                    </div>
                  )}
                  {!tsLoading && (tsData?.rankings || []).length === 0 && (
                    <div style={{ color: '#94a3b8', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
                      Chưa có dữ liệu phường/xã cho tháng này.
                    </div>
                  )}
                  {!tsLoading && (tsData?.rankings || []).map((rk, idx) => {
                    const rankNum = rk.rank || (idx + 1);
                    const rankBg = rankNum === 1 ? '#f59e0b' : rankNum === 2 ? '#94a3b8' : rankNum === 3 ? '#d97706' : '#e2e8f0';
                    const rankColor = rankNum <= 3 ? '#ffffff' : '#475569';

                    // Màu thanh bar theo dải nhiệt độ thực tế
                    let barColor = '#38bdf8';
                    if (rk.lst >= 37.0) barColor = '#ea580c';
                    else if (rk.lst >= 35.5) barColor = '#f97316';
                    else if (rk.lst >= 34.0) barColor = '#eab308';
                    else if (rk.lst >= 32.0) barColor = '#60a5fa';
                    else barColor = '#34d399';

                    return (
                      <div
                        key={rk.id || rk.name || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '12px',
                          gap: '8px',
                          padding: '3px 0'
                        }}
                      >
                        {/* Huy hiệu thứ hạng */}
                        <span
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: rankBg,
                            color: rankColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          #{rankNum}
                        </span>

                        {/* Tên phường/xã */}
                        <span
                          style={{
                            width: '95px',
                            fontWeight: 600,
                            color: '#334155',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={rk.name}
                        >
                          {rk.name}
                        </span>

                        {/* Thanh Progress */}
                        <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${rk.pct}%`,
                              height: '100%',
                              background: barColor,
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>

                        {/* Điểm số LST kèm đơn vị */}
                        <span style={{ width: '58px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {rk.lst} <span style={{ fontSize: '10px', fontWeight: 500, color: '#64748b' }}>°C</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 2: AI TRAINING LAB ================= */}
        {activeTab === 'training' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', gap: '24px' }}>
            {/* Form Column */}
            <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Cpu size={16} color="#22d3ee" />
                    Cấu hình Huấn luyện Mô hình AI
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Select Model */}
                  <div>
                    <label className="form-label">Chọn Mô hình AI Dự báo</label>
                    <select
                      className="styled-select"
                      value={selectedModelId}
                      onChange={e => setSelectedModelId(e.target.value)}
                    >
                      {modelsList.map(m => (
                        <option key={m.ma_model} value={m.ma_model}>
                          {m.ten_model} ({m.loai_model})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Handling Missing */}
                  <div>
                    <label className="form-label">Xử lý Giá trị Khuyết thiếu</label>
                    <select
                      className="styled-select"
                      value={missingStrategy}
                      onChange={e => setMissingStrategy(e.target.value)}
                    >
                      <option value="Noi_suy_tuyen_tinh">Nội suy Tuyến tính theo Chuỗi thời gian</option>
                      <option value="Loai_bo">Loại bỏ hàng khuyết thiếu (Drop Missing)</option>
                    </select>
                  </div>

                  {/* Outlier Detection */}
                  <div>
                    <label className="form-label">Phát hiện & Xử lý Ngoại lai (Outliers)</label>
                    <select
                      className="styled-select"
                      value={outlierStrategy}
                      onChange={e => setOutlierStrategy(e.target.value)}
                    >
                      <option value="IQR">Khoảng Tứ phân vị (IQR Filter 1.5x)</option>
                      <option value="Z-score">Ngưỡng Chuẩn hóa Z-Score (&gt; 3.0 std)</option>
                    </select>
                  </div>

                  {/* Normalization */}
                  <div>
                    <label className="form-label">Phương pháp Chuẩn hóa Dữ liệu</label>
                    <select
                      className="styled-select"
                      value={normMethod}
                      onChange={e => setNormMethod(e.target.value)}
                    >
                      <option value="Min-Max">Min-Max Scaling [0, 1] (Tránh rò rỉ dữ liệu)</option>
                      <option value="Z-score">Chuẩn hóa Z-Score (Mean=0, Std=1)</option>
                      <option value="Khong">Không chuẩn hóa (Dữ liệu gốc)</option>
                    </select>
                  </div>

                  {/* Role Warning Banner if Not Admin */}
                  {!isAdmin && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      color: '#fef08a',
                      marginTop: '4px'
                    }}>
                      <Lock size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span>Chỉ Quản trị viên (ADMIN) mới được quyền khởi chạy huấn luyện mô hình vào CSDL.</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    className="btn-primary"
                    onClick={handleStartTraining}
                    disabled={trainingLoading || !isAdmin}
                    style={{
                      marginTop: '10px',
                      opacity: isAdmin ? 1 : 0.6,
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      background: isAdmin ? 'linear-gradient(135deg, #0891b2, #ea580c)' : '#334155'
                    }}
                    title={isAdmin ? 'Khởi chạy huấn luyện mô hình' : 'Yêu cầu quyền Quản trị viên (ADMIN)'}
                  >
                    {trainingLoading ? (
                      <>Đang chạy Huấn luyện AI & Tính toán 4 Chỉ số...</>
                    ) : (
                      <>
                        {isAdmin ? <Sparkles size={16} /> : <Lock size={16} />}
                        {isAdmin ? 'Khởi chạy Huấn luyện & Đánh giá' : 'Khóa: Yêu cầu quyền ADMIN'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Data Split Architecture Card */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Phân chia Dữ liệu Huấn luyện & Kiểm định
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Hệ thống tuân thủ nghiêm ngặt nguyên tắc chuỗi thời gian (Chronological Split):
                  <div style={{ display: 'flex', gap: '8px', margin: '10px 0' }}>
                    <div style={{ flex: 7, background: 'rgba(34, 211, 238, 0.2)', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#0891b2' }}>
                      Train (70%)
                    </div>
                    <div style={{ flex: 1.5, background: 'rgba(245, 158, 11, 0.2)', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#f59e0b' }}>
                      Val (15%)
                    </div>
                    <div style={{ flex: 1.5, background: 'rgba(16, 185, 129, 0.2)', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#10b981' }}>
                      Test (15%)
                    </div>
                  </div>
                  Các tham số chuẩn hóa Min-Max chỉ được tính trên tập Train để ngăn chặn triệt để hiện tượng rò rỉ thông tin (Data Leakage).
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {trainingResult ? (
                <div className="glass-panel">
                  <div className="card-header" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                    <span className="card-title" style={{ color: '#10b981' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      Huấn luyện Thành công: {trainingResult.model} (Mã chạy: #{trainingResult.ma_training})
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Thời gian chạy: {trainingResult.execution_seconds}s
                    </span>
                  </div>
                  <div className="card-body">
                    <h4 style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px' }}>
                      Kết quả 4 Chỉ số Đánh giá Hiệu năng (Performance Metrics):
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      {/* Validation Metrics */}
                      <div style={{ background: 'var(--bg-inset)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                          Tập Kiểm định (Validation Set)
                        </div>
                        <div className="metrics-grid">
                          <div className="metric-box">
                            <div className="metric-name">MAE (°C)</div>
                            <div className="metric-val">{trainingResult.val_metrics.mae}</div>
                            <div className="metric-sub">Sai số tuyệt đối TB</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">RMSE (°C)</div>
                            <div className="metric-val">{trainingResult.val_metrics.rmse}</div>
                            <div className="metric-sub">Căn bậc 2 sai số toàn phương</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">R² Score</div>
                            <div className="metric-val" style={{ color: '#10b981' }}>{trainingResult.val_metrics.r2}</div>
                            <div className="metric-sub">Hệ số tương quan</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">MAPE (%)</div>
                            <div className="metric-val">{trainingResult.val_metrics.mape}%</div>
                            <div className="metric-sub">Sai số phần trăm TB</div>
                          </div>
                        </div>
                      </div>

                      {/* Test Metrics */}
                      <div style={{ background: 'var(--bg-inset)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                          Tập Kiểm tra Độc lập (Test Set)
                        </div>
                        <div className="metrics-grid">
                          <div className="metric-box">
                            <div className="metric-name">MAE (°C)</div>
                            <div className="metric-val">{trainingResult.test_metrics.mae}</div>
                            <div className="metric-sub">Sai số tuyệt đối TB</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">RMSE (°C)</div>
                            <div className="metric-val">{trainingResult.test_metrics.rmse}</div>
                            <div className="metric-sub">Căn bậc 2 sai số toàn phương</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">R² Score</div>
                            <div className="metric-val" style={{ color: '#10b981' }}>{trainingResult.test_metrics.r2}</div>
                            <div className="metric-sub">Hệ số tương quan</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">MAPE (%)</div>
                            <div className="metric-val">{trainingResult.test_metrics.mape}%</div>
                            <div className="metric-sub">Sai số phần trăm TB</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Cpu size={48} color="#22d3ee" style={{ margin: '0 auto 16px', opacity: 0.6 }} />
                  <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '8px' }}>Phòng Thí nghiệm Mô hình AI LST TP.HCM</h3>
                  <p style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
                    Chọn một trong 4 thuật toán: <b>ARIMA</b>, <b>Random Forest</b>, <b>XGBoost</b>, hoặc <b>GCN-LSTM</b> và bấm nút huấn luyện để kích hoạt quá trình tiền xử lý, huấn luyện trực tiếp và đo đạc 4 độ đo (MAE, RMSE, R², MAPE).
                  </p>
                </div>
              )}

              {/* Historical Runs */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Clock size={16} color="#22d3ee" />
                    Lịch sử Huấn luyện Đã lưu trong Cơ sở Dữ liệu
                  </span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Mô hình</th>
                        <th>Loại</th>
                        <th>Tập đánh giá</th>
                        <th>MAE (°C)</th>
                        <th>RMSE (°C)</th>
                        <th>R²</th>
                        <th>MAPE (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkMetrics.slice(0, 8).map((b, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{b.ten_model}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{b.loai_model}</td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: b.tap_danh_gia === 'Kiem_tra' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: b.tap_danh_gia === 'Kiem_tra' ? '#10b981' : '#f59e0b'
                            }}>
                              {b.tap_danh_gia === 'Kiem_tra' ? 'Kiểm tra' : 'Kiểm định'}
                            </span>
                          </td>
                          <td>{b.mae}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-sky)' }}>{b.rmse}</td>
                          <td style={{ color: '#10b981', fontWeight: 600 }}>{b.r2}</td>
                          <td>{b.mape}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BENCHMARK COMPARISON ================= */}
        {activeTab === 'comparison' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">
                  <BarChart3 size={16} color="#22d3ee" />
                  Bảng So sánh Toàn diện 4 Mô hình AI (Benchmark Comparison)
                </span>
                <span style={{ fontSize: '11.5px', color: isAdmin ? '#34d399' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 10px', borderRadius: '20px' }}>
                  {isAdmin ? <ShieldCheck size={14} /> : <Lock size={14} />}
                  {isAdmin ? 'Quyền ADMIN: Đầy đủ quyền điều chỉnh & tái huấn luyện' : 'Chế độ Khảo sát / Đánh giá (Chỉ xem)'}
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tên Mô hình</th>
                      <th>Thuật toán</th>
                      <th>Tập Đánh giá</th>
                      <th>MAE (Sai số tuyệt đối)</th>
                      <th>RMSE (Căn bậc 2 sai số)</th>
                      <th>R² (Hệ số tương quan)</th>
                      <th>MAPE (%)</th>
                      <th>Đánh giá Chuyên môn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkMetrics.map((row, idx) => {
                      const isGCN = row.ten_model === 'GCN-LSTM';
                      return (
                        <tr key={idx} style={{ background: isGCN ? 'rgba(6, 182, 212, 0.05)' : 'transparent' }}>
                          <td style={{ fontWeight: 700, color: isGCN ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                            {row.ten_model} {isGCN && '🏆 (Tốt nhất)'}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.loai_model}</td>
                          <td>{row.tap_danh_gia === 'Kiem_tra' ? 'Kiểm tra (Test)' : 'Kiểm định (Val)'}</td>
                          <td style={{ fontFamily: 'JetBrains Mono' }}>{row.mae} °C</td>
                          <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: row.rmse < 1.0 ? '#10b981' : '#f59e0b' }}>
                            {row.rmse} °C
                          </td>
                          <td style={{ fontFamily: 'JetBrains Mono', color: '#10b981', fontWeight: 700 }}>{row.r2}</td>
                          <td style={{ fontFamily: 'JetBrains Mono' }}>{row.mape}%</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {row.ten_model === 'GCN-LSTM'
                              ? 'Nắm bắt tương quan không gian đồ thị và phụ thuộc thời gian sâu, sai số thấp nhất.'
                              : row.ten_model === 'XGBoost'
                              ? 'Học máy tăng cường gradient rất nhanh, độ chính xác xấp xỉ sâu.'
                              : row.ten_model === 'Random Forest'
                              ? 'Cây quyết định ensemble ổn định, chống nhiễu tốt.'
                              : 'Mô hình tự hồi quy tuyến tính, chỉ phụ thuộc chuỗi đơn lẻ.'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scientific Analysis Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0891b2' }}>ARIMA</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Thống kê cổ điển</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Phù hợp cho chuỗi đơn biến tại 1 trạm. Nhược điểm: không tận dụng được tương quan không gian giữa các quận lân cận và biến phụ trợ (NDVI, mưa).
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>Random Forest</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Học máy Ensemble</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Hiệu quả cao trong việc xử lý mối quan hệ phi tuyến tính giữa LST và thảm thực vật (NDVI), không bị ảnh hưởng bởi phân phối chuẩn.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ec4899' }}>XGBoost</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Gradient Boosting</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Tối ưu hóa hàm mất mát và chính quy hóa L1/L2 giúp mô hình đạt R² trên 0.91, tốc độ tính toán xuất sắc trên tập dữ liệu bảng.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--accent-sky)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-sky)' }}>GCN-LSTM 🏆</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Học sâu Không gian - Thời gian</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Sử dụng Ma trận kề không gian (Spatial Adjacency) đồ thị các quận TP.HCM kết hợp mạng nhớ LSTM. Đạt RMSE thấp nhất (0.69°C) và R² = 0.95.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: NẠP DỮ LIỆU & TIỀN XỬ LÝ (UPGRADED PREPROCESSING STUDIO) ================= */}
        {activeTab === 'datasets' && (
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* 1. Workflow Stepper (Quy trình 7 bước chuẩn khoa học) */}
            <div className="workflow-stepper">
              <span className="workflow-step completed">
                <Check size={13} />
                1. Nạp dữ liệu
              </span>
              <span className="workflow-step active">
                <Sparkles size={13} />
                2. Tiền xử lý (Active)
              </span>
              <span className="workflow-step">
                <Cpu size={13} />
                3. Huấn luyện (4 lần)
              </span>
              <span className="workflow-step">
                <BarChart3 size={13} />
                4. Đánh giá
              </span>
              <span className="workflow-step">
                <Check size={13} />
                5. Chọn mô hình
              </span>
              <span className="workflow-step">
                <Flame size={13} />
                6. Dự báo
              </span>
              <span className="workflow-step">
                <MapIcon size={13} />
                7. Xuất bản WebGIS
              </span>
            </div>

            {/* 2. RBAC Access Banner */}
            {isAdmin ? (
              <div className="role-banner admin">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} color="#34d399" />
                  <div>
                    <span style={{ fontWeight: 700 }}>Quyền Quản trị viên (ADMIN):</span> Bạn có toàn quyền nạp bộ dữ liệu GEE mới, cấu hình phòng thử tiền xử lý, lưu cấu hình vào CSDL và kích hoạt huấn luyện mô hình AI.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
                    👑 FULL ACCESS
                  </span>
                </div>
              </div>
            ) : (
              <div className="role-banner readonly">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Lock size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 700 }}>Chế độ Chỉ xem (Read-only):</span> Bạn đang đăng nhập với vai trò <u>{currentUser ? (currentUser.vai_tro === 'CHUYEN_GIA' ? 'Chuyên gia' : 'Người xem') : 'Khách vãng lai'}</u>. Chỉ tài khoản Quản trị viên (ADMIN) mới được quyền nạp file CSV, lưu cấu hình tiền xử lý và huấn luyện mô hình.
                  </div>
                </div>
                <button className="role-banner-btn" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>
                  <LogIn size={13} />
                  Đăng nhập ADMIN
                </button>
              </div>
            )}

            {/* Alert Message */}
            {prepAlert && (
              <div style={{
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: prepAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${prepAlert.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: prepAlert.type === 'success' ? '#a7f3d0' : '#fca5a5'
              }}>
                <span>{prepAlert.msg}</span>
                <button
                  onClick={() => setPrepAlert(null)}
                  style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* 3. Top Row: Nạp dữ liệu (Cột 1) & Phòng thử tiền xử lý (Cột 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '18px' }}>
              
              {/* Phân vùng 1: Nạp bộ dữ liệu CSV/GeoTIFF từ GEE */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <span className="card-title">
                    <UploadCloud size={16} color="#22d3ee" />
                    1. Nạp bộ dữ liệu CSV từ GEE & Nghiên cứu
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Research Dataset Feature Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(6, 182, 212, 0.05))',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-sky)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} color="#38bdf8" />
                        Tệp CSV Nghiên cứu Chuẩn GEE (2021–2025)
                      </span>
                      <span style={{ fontSize: '10.5px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        1,150 dòng · 10 trạm TP.HCM
                      </span>
                    </div>

                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                      Bộ dữ liệu chuẩn hóa viễn thám Landsat 8/9 & MODIS chu kỳ 16 ngày (2021–2025) bao phủ 10 trạm đại diện (Q1, Tân Bình, Thủ Đức, Bình Tân, Q7, Bình Chánh, Củ Chi, Hóc Môn, Bình Thạnh, Cần Giờ) với đầy đủ biến giải thích sinh khí hậu và các hiện tượng mây/nhiễu thực tế.
                    </p>

                    {/* Schema Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {[
                        { col: 'ngay', tip: 'Chu kỳ 16 ngày (2021–2025)' },
                        { col: 'kinh_do', tip: 'Kinh độ WGS84' },
                        { col: 'vi_do', tip: 'Vĩ độ WGS84' },
                        { col: 'lst', tip: 'Nhiệt độ bề mặt (°C)' },
                        { col: 'ndvi', tip: 'Chỉ số thực vật [-1, 1]' },
                        { col: 'tvdi', tip: 'Chỉ số khô hạn [0, 1]' },
                        { col: 'luong_mua', tip: 'Lượng mưa (mm)' },
                        { col: 'do_am_dat', tip: 'Độ ẩm đất (%)' },
                        { col: 'lop_phu_be_mat', tip: 'Loại phủ bề mặt LULC' },
                        { col: 'ma_khu_vuc', tip: 'Mã trạm quan trắc' }
                      ].map(item => (
                        <span
                          key={item.col}
                          title={item.tip}
                          style={{
                            fontFamily: 'JetBrains Mono',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8'
                          }}
                        >
                          {item.col}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <a
                        href="/dataset_lst_hcm_landsat_modis_2021_2025_nghiencuu.csv"
                        download="dataset_lst_hcm_landsat_modis_2021_2025_nghiencuu.csv"
                        className="btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600
                        }}
                      >
                        <Download size={13} />
                        Tải CSV Nghiên cứu (86 KB)
                      </a>

                      <button
                        type="button"
                        onClick={handleQuickLoadResearch}
                        disabled={quickLoadingResearch || !isAdmin}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          background: isAdmin ? 'rgba(16, 185, 129, 0.15)' : '#334155',
                          border: `1px solid ${isAdmin ? 'rgba(16, 185, 129, 0.4)' : '#475569'}`,
                          color: isAdmin ? '#34d399' : '#94a3b8',
                          borderRadius: '8px',
                          cursor: isAdmin ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600
                        }}
                        title={isAdmin ? 'Tự động nạp bộ dữ liệu nghiên cứu này vào CSDL PostgreSQL' : 'Yêu cầu quyền ADMIN'}
                      >
                        <Zap size={13} />
                        {quickLoadingResearch ? 'Đang nạp...' : '⚡ Nạp nhanh vào CSDL'}
                      </button>
                    </div>
                  </div>

                  {/* Upload Box for Custom Files */}
                  <div
                    className={`upload-dropzone ${!isAdmin ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!isAdmin) {
                        setPrepAlert({ type: 'error', msg: '🔒 Yêu cầu quyền ADMIN: Chỉ Quản trị viên mới được nạp tệp dữ liệu vào hệ thống.' });
                      } else {
                        document.getElementById('hidden-csv-input')?.click();
                      }
                    }}
                  >
                    <input
                      id="hidden-csv-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={(e) => { handleUploadCsv(e.target.files?.[0]); e.target.value = ''; }}
                    />
                    <UploadCloud size={28} color="#06b6d4" style={{ margin: '0 auto 6px', opacity: 0.8 }} />
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {uploadingDataset ? 'Đang tải dữ liệu GEE lên CSDL...' : 'Hoặc chọn tệp CSV của riêng bạn (2021–2025)'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Định dạng chuẩn: ngay, kinh_do, vi_do, lst (tối đa 50MB)
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '5px 12px', fontSize: '11.5px' }}
                        disabled={uploadingDataset || !isAdmin}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) {
                            setPrepAlert({ type: 'error', msg: '🔒 Chỉ Quản trị viên (ADMIN) mới được nạp tệp dữ liệu.' });
                          } else {
                            document.getElementById('hidden-csv-input')?.click();
                          }
                        }}
                      >
                        <FileSpreadsheet size={13} />
                        Chọn tệp CSV
                      </button>

                      <a
                        href={`${API_BASE}/datasets/csv-template`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '5px 12px', fontSize: '11.5px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#38bdf8', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, textDecoration: 'none' }}
                      >
                        <FileText size={13} />
                        Tải mẫu CSV gốc
                      </a>
                    </div>
                  </div>

                  {csvReport && (
                    <div style={{ fontSize: '11.5px', lineHeight: 1.5, color: 'var(--text-muted)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)' }}>
                      <b style={{ color: 'var(--text-main)' }}>Báo cáo kiểm tra cấu trúc CSV</b><br />
                      {csvReport.dong_hop_le}/{csvReport.tong_dong} dòng hợp lệ · {csvReport.so_diem} điểm quan sát · {csvReport.ngay_dau} → {csvReport.ngay_cuoi}<br />
                      Nhiệt độ LST: Trung bình {csvReport.lst_tb} °C · Min {csvReport.lst_min} °C · Max {csvReport.lst_max} °C<br />
                      {csvReport.cot_tuy_chon_thieu?.length > 0 && <span>Thiếu cột tùy chọn: {csvReport.cot_tuy_chon_thieu.join(', ')}<br /></span>}
                      {csvReport.dong_bi_loai > 0 && (
                        <span style={{ color: '#f97316' }}>
                          Đã loại {csvReport.dong_bi_loai} dòng không hợp lệ: {Object.entries(csvReport.ly_do_bi_loai || {}).map(([k, v]) => `${k} (${v})`).join('; ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dataset Table */}
                  <div style={{ marginTop: '2px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Bộ dữ liệu trong CSDL (DATASET)</span>
                      <button
                        style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                        onClick={loadDatasets}
                      >
                        <RefreshCw size={11} /> Làm mới
                      </button>
                    </div>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table className="custom-table" style={{ fontSize: '11px' }}>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Nguồn</th>
                            <th>Số dòng</th>
                            <th>LST TB</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datasetsList.length > 0 ? (
                            datasetsList.map((ds) => (
                              <tr key={ds.ma_dataset}>
                                <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>#{ds.ma_dataset}</td>
                                <td style={{ fontWeight: 600, maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ds.ten_dataset}>
                                  {ds.ten_dataset}
                                </td>
                                <td>{ds.nguon_du_lieu}</td>
                                <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-sky)' }}>
                                  {(ds.so_ban_ghi ?? 1150).toLocaleString()}
                                </td>
                                <td style={{ fontWeight: 600, color: '#f97316' }}>
                                  {ds.lst_trung_binh ? `${ds.lst_trung_binh} °C` : '34.2 °C'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td style={{ fontFamily: 'JetBrains Mono' }}>#1</td>
                              <td style={{ fontWeight: 600 }}>Chuỗi LST-NDVI-TVDI TP.HCM 2021-2025</td>
                              <td>Landsat 8/9</td>
                              <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-sky)' }}>10,080</td>
                              <td style={{ color: '#f97316', fontWeight: 600 }}>34.06 °C</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phân vùng 2: Phòng thử tiền xử lý (Preprocessing Studio) */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">
                    <Sliders size={16} color="#f97316" />
                    2. Phòng thử tiền xử lý (Preprocessing Studio)
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Activity size={12} color="#38bdf8" />
                    Mẫu thử 46 quan trắc 16 ngày
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Real-time reactive explanation */}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45', background: 'rgba(15, 23, 42, 0.5)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    Chuỗi LST Landsat 16 ngày tại <b style={{ color: 'var(--accent-sky)' }}>{currentPrepData.cfg.name}</b>: {currentPrepData.cfg.desc}.{' '}
                    Đã phát hiện <b style={{ color: '#ef4444' }}>{currentPrepData.outlierCount} giá trị nhiễu</b> ({currentPrepData.outlierValues.length > 0 ? currentPrepData.outlierValues.join(', ') : 'Không có'}) và{' '}
                    <b style={{ color: '#f59e0b' }}>{currentPrepData.missingCount} ô thiếu do mây</b>.
                  </div>

                  {/* Filter Grid (6 Controls) */}
                  <div className="prep-filter-grid">
                    <div className="prep-filter-field">
                      <label>Khu vực</label>
                      <select
                        className="prep-select"
                        value={prepDistrict}
                        onChange={e => setPrepDistrict(e.target.value)}
                      >
                        <option value="Quận 1">Quận 1 (Trung tâm)</option>
                        <option value="Tân Bình">Tân Bình (Sân bay TSN)</option>
                        <option value="Thủ Đức">TP. Thủ Đức (Khu CNC)</option>
                        <option value="Bình Thạnh">Bình Thạnh (Thanh Đa)</option>
                        <option value="Cần Giờ">Cần Giờ (Rừng Sác)</option>
                        <option value="Củ Chi">Củ Chi (Ven đô)</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <label>Dữ liệu thiếu</label>
                      <select
                        className="prep-select"
                        value={prepMissing}
                        onChange={e => setPrepMissing(e.target.value)}
                      >
                        <option value="Noi_suy_tuyen_tinh">Nội suy tuyến tính</option>
                        <option value="Loai_bo">Loại bỏ (Drop missing)</option>
                        <option value="KNN_Imputer">K-NN Imputer theo mùa</option>
                        <option value="Spline">Nội suy Spline bậc 3</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <label>Dữ liệu nhiễu</label>
                      <select
                        className="prep-select"
                        value={prepOutlier}
                        onChange={e => setPrepOutlier(e.target.value)}
                      >
                        <option value="Nguong_hop_ly">Ngưỡng hợp lý viễn thám</option>
                        <option value="IQR">Khoảng tứ phân vị (IQR 1.5x)</option>
                        <option value="Z-score">Chuẩn hóa Z-score (&gt; 3.0 std)</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>Ngưỡng °C</label>
                        <span style={{ fontSize: '10.5px', color: '#f97316', fontFamily: 'JetBrains Mono' }}>
                          {prepThreshold} °C
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="range"
                          min={35}
                          max={85}
                          step={1}
                          value={prepThreshold}
                          onChange={e => setPrepThreshold(Number(e.target.value))}
                          style={{ flex: 1, accentColor: '#f97316' }}
                        />
                        <input
                          type="number"
                          className="prep-input"
                          style={{ width: '58px', padding: '4px 6px', textAlign: 'center' }}
                          value={prepThreshold}
                          onChange={e => setPrepThreshold(Number(e.target.value))}
                          min={35}
                          max={85}
                        />
                      </div>
                    </div>

                    <div className="prep-filter-field">
                      <label>Đồng bộ thời gian</label>
                      <select
                        className="prep-select"
                        value={prepSyncTime}
                        onChange={e => setPrepSyncTime(e.target.value)}
                      >
                        <option value="Giu_nguyen">Giữ mốc quan sát thực</option>
                        <option value="Noi_suy_16_ngay">Chuẩn hóa chu kỳ 16 ngày</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <label>Chuẩn hóa</label>
                      <select
                        className="prep-select"
                        value={prepNorm}
                        onChange={e => setPrepNorm(e.target.value)}
                      >
                        <option value="Z-score">Z-score (Mean=0, Std=1)</option>
                        <option value="Min-Max">Min-Max Scaling [0, 1]</option>
                        <option value="Khong">Không chuẩn hóa (°C)</option>
                      </select>
                    </div>
                  </div>

                  {/* SVG Interactive Time-series Chart */}
                  <div style={{
                    background: '#0a0f1d',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    position: 'relative'
                  }}>
                    {/* Chart Legend */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        {prepOutlier === 'IQR' ? `Khoảng hợp lệ IQR: [${currentPrepData.lowerBound} °C, ${currentPrepData.upperBound} °C]` : (prepOutlier === 'Z-score' ? `Khoảng 3-Sigma: [${currentPrepData.lowerBound} °C, ${currentPrepData.upperBound} °C]` : `Ngưỡng cắt trên: ${currentPrepData.upperBound} °C`)}
                      </span>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                          <span style={{ width: '16px', height: '2px', background: '#38bdf8', display: 'inline-block' }} />
                          Sau xử lý ({prepMissing === 'Loai_bo' ? 'Bỏ khuyết' : 'Nội suy'})
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
                          Dữ liệu gốc
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }} />
                          Nhiễu đã lọc
                        </span>
                      </div>
                    </div>

                    {/* SVG Graphic */}
                    <svg viewBox="0 0 640 210" style={{ width: '100%', height: '170px', overflow: 'visible' }}>
                      {/* Grid Lines and Y-Axis Ticks */}
                      {[-15, 0, 20, 40, 60, 80, 100, 120, 140, 160].map((yVal) => {
                        const yPos = 20 + ((160 - yVal) / 180) * 160;
                        return (
                          <g key={yVal}>
                            <line x1={42} y1={yPos} x2={625} y2={yPos} stroke="rgba(255, 255, 255, 0.07)" strokeDasharray="2,3" />
                            <text x={36} y={yPos + 3.5} fill="#64748b" fontSize={9.5} textAnchor="end" fontFamily="JetBrains Mono">
                              {yVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Upper Threshold Line */}
                      {(() => {
                        const threshVal = Math.min(155, Math.max(-10, currentPrepData.upperBound));
                        const threshY = 20 + ((160 - threshVal) / 180) * 160;
                        return (
                          <g>
                            <line x1={42} y1={threshY} x2={625} y2={threshY} stroke="#f97316" strokeDasharray="4,4" strokeWidth={1.2} />
                            <text x={620} y={threshY - 4} fill="#f97316" fontSize={9} textAnchor="end" fontWeight={600}>
                              Ngưỡng {currentPrepData.upperBound} °C
                            </text>
                          </g>
                        );
                      })()}

                      {/* Lower Threshold Line (if IQR or Z-score) */}
                      {prepOutlier !== 'Nguong_hop_ly' && (() => {
                        const lowVal = Math.min(150, Math.max(-15, currentPrepData.lowerBound));
                        const lowY = 20 + ((160 - lowVal) / 180) * 160;
                        return (
                          <g>
                            <line x1={42} y1={lowY} x2={625} y2={lowY} stroke="#38bdf8" strokeDasharray="3,3" strokeWidth={1} opacity={0.6} />
                            <text x={620} y={lowY + 11} fill="#38bdf8" fontSize={8.5} textAnchor="end" opacity={0.8}>
                              Cận dưới {currentPrepData.lowerBound} °C
                            </text>
                          </g>
                        );
                      })()}

                      {/* Cleaned Curve Line */}
                      {currentPrepData.points.length > 1 && (
                        <path
                          d={currentPrepData.points.map((pt, i) => {
                            const x = 45 + (i / Math.max(1, currentPrepData.points.length - 1)) * 575;
                            const y = 20 + ((160 - pt.clean) / 180) * 160;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                        />
                      )}

                      {/* Circles for Points */}
                      {currentPrepData.points.map((pt, i) => {
                        const x = 45 + (i / Math.max(1, currentPrepData.points.length - 1)) * 575;
                        const yRaw = pt.raw !== null ? (20 + ((160 - pt.raw) / 180) * 160) : null;
                        const yClean = 20 + ((160 - pt.clean) / 180) * 160;

                        if (pt.isOutlier && yRaw !== null) {
                          return (
                            <g
                              key={i}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setPrepPointHover({ ...pt, x, y: yRaw })}
                              onMouseLeave={() => setPrepPointHover(null)}
                            >
                              <circle cx={x} cy={yRaw} r={9} fill="rgba(239, 68, 68, 0.25)" />
                              <circle cx={x} cy={yRaw} r={4.5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                              <circle cx={x} cy={yClean} r={3} fill="#0ea5e9" />
                            </g>
                          );
                        }

                        if (pt.isMissing) {
                          return (
                            <g
                              key={i}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setPrepPointHover({ ...pt, x, y: yClean })}
                              onMouseLeave={() => setPrepPointHover(null)}
                            >
                              <circle cx={x} cy={yClean} r={4.5} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2,2" />
                            </g>
                          );
                        }

                        return (
                          <g
                            key={i}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setPrepPointHover({ ...pt, x, y: yRaw })}
                            onMouseLeave={() => setPrepPointHover(null)}
                          >
                            <circle cx={x} cy={yRaw} r={3} fill="#475569" />
                          </g>
                        );
                      })}

                      {/* X-Axis Ticks (Dates) */}
                      {currentPrepData.points.filter((_, idx) => idx % 5 === 0 || idx === currentPrepData.points.length - 1).map((pt, idx) => {
                        const originalIdx = currentPrepData.points.findIndex(p => p.date === pt.date);
                        const x = 45 + (originalIdx / Math.max(1, currentPrepData.points.length - 1)) * 575;
                        return (
                          <g key={idx}>
                            <line x1={x} y1={183} x2={x} y2={187} stroke="#475569" />
                            <text x={x} y={198} fill="#64748b" fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono">
                              {pt.date}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Hover Tooltip */}
                    {prepPointHover && (
                      <div
                        className="svg-chart-tooltip"
                        style={{
                          left: `${(prepPointHover.x / 640) * 100}%`,
                          top: `${(prepPointHover.y / 210) * 100}%`
                        }}
                      >
                        <div style={{ fontWeight: 700, color: 'var(--accent-sky)', marginBottom: '2px' }}>
                          Ngày {prepPointHover.date} ({prepDistrict})
                        </div>
                        <div>LST gốc: <b>{prepPointHover.raw !== null ? `${prepPointHover.raw} °C` : 'Khuyết (Mây)'}</b></div>
                        <div>Sau xử lý: <b style={{ color: '#34d399' }}>{prepPointHover.clean} °C</b></div>
                        <div>Chuẩn hóa ({prepNorm}): <b style={{ color: '#38bdf8' }}>{prepPointHover.normVal}</b></div>
                        {prepPointHover.note && (
                          <div style={{ fontSize: '10.5px', color: '#fca5a5', marginTop: '3px' }}>
                            {prepPointHover.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Đỏ: giá trị bị coi là nhiễu rồi xử lý như dữ liệu thiếu. Ngưỡng {currentPrepData.upperBound} °C được xác định theo phương pháp đã chọn.
                  </div>

                  {/* 3 Dynamic KPI Cards */}
                  <div className="prep-kpi-row">
                    <div className="prep-kpi-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                      <span className="prep-kpi-title">Thiếu (mây)</span>
                      <span className="prep-kpi-value" style={{ color: '#f59e0b' }}>{currentPrepData.missingCount}</span>
                      <span className="prep-kpi-desc">
                        {prepMissing === 'Loai_bo' ? 'Đã loại bỏ khỏi chuỗi' : (prepMissing === 'KNN_Imputer' ? 'KNN chu kỳ mùa' : (prepMissing === 'Spline' ? 'Nội suy Spline bậc 3' : 'Nội suy chuỗi thời gian'))}
                      </span>
                    </div>

                    <div className="prep-kpi-card" style={{ borderLeft: '3px solid #ef4444' }}>
                      <span className="prep-kpi-title">Nhiễu bị đánh dấu</span>
                      <span className="prep-kpi-value" style={{ color: '#ef4444' }}>{currentPrepData.outlierCount}</span>
                      <span className="prep-kpi-desc" title={currentPrepData.outlierValues.join(', ')}>
                        {currentPrepData.outlierValues.length > 0 ? currentPrepData.outlierValues.join(', ') : 'Không có nhiễu'}
                      </span>
                    </div>

                    <div className="prep-kpi-card" style={{ borderLeft: '3px solid #10b981' }}>
                      <span className="prep-kpi-title">Bản ghi còn lại</span>
                      <span className="prep-kpi-value" style={{ color: '#10b981' }}>{currentPrepData.cleanCount}</span>
                      <span className="prep-kpi-desc">
                        {prepNorm === 'Min-Max' ? 'Sạch & chuẩn hóa [0, 1]' : (prepNorm === 'Z-score' ? 'Sạch & chuẩn hóa Z-score' : 'Sạch & giữ nguyên °C')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Bottom Row 1: Phân chia thời gian (Trái) & Cấu hình đã lưu (Phải) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              
              {/* Phân vùng 3: Chia tập theo thứ tự thời gian & Chạy thử nghiệm */}
              <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Chia tập theo thời gian & Chuẩn hóa không rò rỉ dữ liệu</span>
                  <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    No Data Leakage
                  </span>
                </div>

                <div className="split-timeline-container" style={{ margin: '4px 0' }}>
                  <div className="split-timeline-bar">
                    <div className="split-segment train" style={{ flex: 36 }}>
                      Train (70%)
                    </div>
                    <div className="split-segment val" style={{ flex: 12 }}>
                      Val (15%)
                    </div>
                    <div className="split-segment test" style={{ flex: 12 }}>
                      Test (15%)
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                    <span>2021 – {prepTrainEndYear} (Tập Huấn luyện)</span>
                    <span>{Number(prepTrainEndYear) + 1} (Kiểm định)</span>
                    <span>{Number(prepTrainEndYear) + 2} – 2025 (Kiểm tra)</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div>
                    Tham số chuẩn hóa tính trên tập Train: <code style={{ color: '#38bdf8' }}>mean {currentPrepData.trainStats.mean} · std {currentPrepData.trainStats.std} · min {currentPrepData.trainStats.min} · max {currentPrepData.trainStats.max} °C</code>
                  </div>
                  {/* Interactive Mini-Calculator */}
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>Thử nghiệm nhiệt độ:</span>
                    <input
                      type="number"
                      step={0.5}
                      value={simTemp}
                      onChange={e => setSimTemp(Number(e.target.value))}
                      style={{ width: '60px', padding: '3px 6px', background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '11.5px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '11.5px' }}>
                      °C → Sau chuẩn hóa ({prepNorm}):{' '}
                      <b style={{ color: '#34d399' }}>
                        {prepNorm === 'Min-Max'
                          ? (Math.round(((simTemp - currentPrepData.trainStats.min) / (currentPrepData.trainStats.max - currentPrepData.trainStats.min || 1)) * 1000) / 1000)
                          : (prepNorm === 'Z-score'
                            ? `${Math.round(((simTemp - currentPrepData.trainStats.mean) / currentPrepData.trainStats.std) * 1000) / 1000} σ`
                            : `${simTemp} °C`)}
                      </b>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Mốc kết thúc Train:</span>
                    <select
                      className="prep-select"
                      style={{ width: '85px', padding: '5px 8px', fontSize: '11.5px' }}
                      value={prepTrainEndYear}
                      onChange={e => setPrepTrainEndYear(e.target.value)}
                    >
                      <option value="2021">2021</option>
                      <option value="2022">2022</option>
                      <option value="2023">2023</option>
                    </select>
                  </div>

                  {/* Button 1: Live Pipeline Test on live DB */}
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      borderRadius: '8px',
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600
                    }}
                    disabled={pipelineLoading || !isAdmin}
                    onClick={handleRunPipelineTest}
                    title={isAdmin ? 'Thử nghiệm pipeline tiền xử lý trực tiếp trên bảng du_lieu_chi_so (10,080 dòng)' : 'Yêu cầu quyền ADMIN'}
                  >
                    <Activity size={14} />
                    {pipelineLoading ? 'Đang chạy pipeline...' : '🧪 Thử nghiệm CSDL thật'}
                  </button>

                  {/* Button 2: Save to DB */}
                  <button
                    className="btn-primary"
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      opacity: isAdmin ? 1 : 0.6,
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      background: isAdmin ? 'linear-gradient(135deg, #0284c7, #0891b2)' : '#334155'
                    }}
                    disabled={prepSaving || !isAdmin}
                    onClick={handleSaveTienXuLy}
                    title={isAdmin ? 'Lưu cấu hình tiền xử lý vào CSDL' : 'Yêu cầu quyền Quản trị viên (ADMIN)'}
                  >
                    {prepSaving ? (
                      <>Đang lưu...</>
                    ) : (
                      <>
                        {isAdmin ? <Check size={14} /> : <Lock size={14} />}
                        Lưu cấu hình
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      background: 'rgba(34, 211, 238, 0.1)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      color: '#22d3ee',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 600
                    }}
                    onClick={() => setActiveTab('training')}
                  >
                    Huấn luyện AI Lab ➔
                  </button>
                </div>

                {/* Pipeline Execution Card (Live Database Feedback) */}
                {pipelineReport && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '11.5px',
                    lineHeight: '1.5',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <b style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={13} color="#34d399" />
                        Kết quả Pipeline Thực nghiệm trên PostgreSQL
                      </b>
                      <span style={{ fontSize: '10.5px', color: '#a7f3d0' }}>
                        Tổng {pipelineReport.data_split?.total_records?.toLocaleString()} dòng
                      </span>
                    </div>
                    <div>
                      Dòng thiếu: <b>{pipelineReport.missing_stats?.missing_found} ({pipelineReport.missing_stats?.missing_pct}%)</b> · Xử lý: <code style={{ color: '#38bdf8' }}>{pipelineReport.missing_stats?.strategy}</code>
                    </div>
                    <div>
                      Dị thường phát hiện & khử: <b style={{ color: '#f97316' }}>{pipelineReport.outlier_stats?.outliers_detected} bản ghi</b> · Thuật toán: <code style={{ color: '#38bdf8' }}>{pipelineReport.outlier_stats?.strategy}</code>
                    </div>
                    <div>
                      Phân chia: <b>Train {pipelineReport.data_split?.train_count} · Val {pipelineReport.data_split?.val_count} · Test {pipelineReport.data_split?.test_count}</b> ({pipelineReport.data_split?.split_ratio})
                    </div>
                    <div>
                      Scaler Train: {pipelineReport.scaler_info?.method === 'min_max' ? `Min ${Math.round(pipelineReport.scaler_info?.min * 100) / 100} °C, Max ${Math.round(pipelineReport.scaler_info?.max * 100) / 100} °C` : `Mean ${Math.round(pipelineReport.scaler_info?.mean * 100) / 100} °C, Std ${Math.round(pipelineReport.scaler_info?.std * 100) / 100}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Phân vùng 4: Cấu hình đã lưu (TIEN_XU_LY) */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">
                    <Clock size={16} color="#38bdf8" />
                    Cấu hình đã lưu trong CSDL (TIEN_XU_LY)
                  </span>
                  <button
                    style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                    onClick={loadTienXuLy}
                    title="Tải lại danh sách"
                  >
                    <RefreshCw size={12} />
                    Làm mới
                  </button>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: 'auto', maxHeight: '280px' }}>
                  <table className="custom-table" style={{ fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>THIẾU</th>
                        <th>NHIỄU</th>
                        <th>CHUẨN HÓA</th>
                        <th>TRAIN ĐẾN</th>
                        <th>VAL ĐẾN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tienXuLyList.length > 0 ? (
                        tienXuLyList.map((txl) => (
                          <tr key={txl.ma_tien_xu_ly}>
                            <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent-sky)' }}>
                              #{txl.ma_tien_xu_ly}
                            </td>
                            <td>{txl.cach_xu_ly_thieu}</td>
                            <td>{txl.cach_xu_ly_nhieu}</td>
                            <td>
                              <span style={{ padding: '2px 6px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '4px', color: '#38bdf8', fontWeight: 600 }}>
                                {txl.phuong_phap_chuan_hoa}
                              </span>
                            </td>
                            <td>{String(txl.ngay_ket_thuc_train || '').substring(0, 10)}</td>
                            <td>{String(txl.ngay_ket_thuc_val || '').substring(0, 10)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent-sky)' }}>#1</td>
                          <td>Noi_suy_tuyen_tinh</td>
                          <td>Nguong_hop_ly</td>
                          <td><span style={{ padding: '2px 6px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '4px', color: '#38bdf8' }}>Z-score</span></td>
                          <td>2023-12-31</td>
                          <td>2024-12-31</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* 5. Bottom Row 2: Sổ tay Khoa học Tiền xử lý LST Viễn thám TP.HCM (Science Research Notebook) */}
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                  <BookOpen size={16} color="#38bdf8" />
                  Sổ tay Khoa học: Tiền xử lý Viễn thám LST & Nghiên cứu Đảo nhiệt Đô thị TP.HCM
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'cloud', label: '🌧️ Mây mùa mưa TP.HCM' },
                    { id: 'outlier', label: '⚡ Nhiễu bức xạ (150 °C, -8 °C)' },
                    { id: 'norm', label: '🔒 Chống rò rỉ dữ liệu (No Leakage)' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setScienceTab(tab.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        border: scienceTab === tab.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: scienceTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                        color: scienceTab === tab.id ? '#38bdf8' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: scienceTab === tab.id ? 700 : 500,
                        transition: 'all 0.15s'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab 1: Che phủ mây */}
              {scienceTab === 'cloud' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <b style={{ color: 'var(--accent-sky)', display: 'block', marginBottom: '6px' }}>
                      Đặc thù khí hậu nhiệt đới gió mùa tại TP.HCM
                    </b>
                    TP.HCM có 2 mùa rõ rệt: Mùa mưa (tháng 5 đến tháng 10) và mùa khô (tháng 11 đến tháng 4 năm sau). Trong mùa mưa, độ che phủ mây đối lưu nhiệt đạt 60% – 85% trên các cảnh ảnh Landsat 8/9 và MODIS, dẫn đến các pixel khuyết thiếu nghiêm trọng trong chuỗi thời gian quan trắc bề mặt nhiệt.
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <b style={{ color: '#34d399', display: 'block', marginBottom: '6px' }}>
                      Chiến lược xử lý khuyết thiếu tối ưu
                    </b>
                    • <b>Nội suy tuyến tính (Linear Interpolation):</b> Phù hợp khi mây che phủ ngắn hạn 1–2 chu kỳ (16–32 ngày).<br />
                    • <b>K-NN Imputer theo chu kỳ mùa:</b> Tận dụng quan hệ giữa nhiệt độ LST, chỉ số thực vật NDVI và lượng mưa để phục hồi giá trị chính xác cao.<br />
                    • <b>Loại bỏ (Drop):</b> Dùng khi mục tiêu chỉ huấn luyện trên các quan trắc hoàn toàn không mây.
                  </div>
                </div>
              )}

              {/* Tab 2: Nhiễu bức xạ */}
              {scienceTab === 'outlier' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <b style={{ color: '#ef4444', display: 'block', marginBottom: '6px' }}>
                      Bản chất vật lý của các điểm dị thường (150 °C, -8 °C, 82 °C)
                    </b>
                    • <b>Nhiễu cực đại (150 °C, 82 °C):</b> Hiện tượng phản xạ gương mặt trời (specular solar reflection) từ các cụm mái tôn mạ kẽm nhà xưởng (KCN Tân Bình, Bình Tân) và hiện tượng bão hòa kênh hồng ngoại nhiệt TIRS Landsat Band 10 (&gt; 330 K).<br />
                    • <b>Nhiễu cực tiểu (-8 °C):</b> Do đỉnh mây dông vũ tích lạnh tầng cao hoặc bóng mây che phủ viễn thám bị thuật toán phân loại gán nhầm là nhiệt độ đất.
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <b style={{ color: '#f59e0b', display: 'block', marginBottom: '6px' }}>
                      Thuật toán khử nhiễu khoa học
                    </b>
                    • <b>Ngưỡng hợp lý viễn thám:</b> Thiết lập khoảng nhiệt độ vật lý khả dĩ tại mặt đất đô thị nhiệt đới TP.HCM: [15.0 °C, 55–60 °C]. Mọi điểm ngoài khoảng đều quy về dữ liệu thiếu để nội suy lại.<br />
                    • <b>Khoảng tứ phân vị (IQR 1.5x):</b> Nhận diện ngoại lai phi tham số, thích ứng linh hoạt theo từng tiểu vùng sinh thái.<br />
                    • <b>Z-Score (&gt; 3.0 std):</b> Khử các độ lệch thống kê vượt quá 3 độ lệch chuẩn 3-Sigma.
                  </div>
                </div>
              )}

              {/* Tab 3: Chống rò rỉ dữ liệu */}
              {scienceTab === 'norm' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <b style={{ color: '#f43f5e', display: 'block', marginBottom: '6px' }}>
                      Sai lầm phổ biến: Rò rỉ dữ liệu (Data Leakage)
                    </b>
                    Nếu lập trình viên chuẩn hóa toàn bộ chuỗi thời gian (2021–2025) bằng Min/Max chung trước khi chia tập, thông tin nhiệt độ tương lai của năm 2024–2025 sẽ bị "rò rỉ" vào tập huấn luyện. Điều này làm cho các chỉ số MAE, RMSE của mô hình AI đẹp một cách giả tạo nhưng sẽ dự báo sai khi triển khai thực tế.
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <b style={{ color: '#10b981', display: 'block', marginBottom: '6px' }}>
                      Nguyên tắc vàng Machine Learning chuỗi thời gian
                    </b>
                    • <b>Fit duy nhất trên tập Train (2021–2023):</b> Tính toán <code style={{ color: '#38bdf8' }}>min_train, max_train, mean_train, std_train</code> chỉ từ dữ liệu quá khứ.<br />
                    • <b>Transform tập Val (2024) và Test (2025):</b> Sử dụng lại chính các tham số của Train để chuẩn hóa dữ liệu tương lai mà không cập nhật lại tham số.<br />
                    • <b>Đảm bảo tính chân thực:</b> Mô hình được kiểm tra trong môi trường "mù hoàn toàn" về tương lai.
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Drawer 167 Phường & Lọc Ngưỡng LST/NDVI/TVDI */}
      <WardListPanel
        isOpen={wardListOpen}
        onClose={() => setWardListOpen(false)}
        khuVucLst={khuVucLst}
        onSelectWard={(w) => handleSelectWard(w.id || w.ma_khu_vuc)}
        thresholdFilter={thresholdFilter}
        setThresholdFilter={setThresholdFilter}
        selectedIndicator={selectedIndicator}
      />

      {/* Modal Khung Bản Đồ A4 Tiêu chuẩn Cartography */}
      <MapFrameModal
        isOpen={mapFrameOpen}
        onClose={() => setMapFrameOpen(false)}
        selectedIndicator={selectedIndicator}
        currentDate={currentDateInfo.thoi_gian}
        geoDistricts={geoDistricts}
        khuVucLst={khuVucLst}
        stations={getStationsWithLST(TRAM_VIEN_THAM_HCM, khuVucLst, lstPoints, currentDateInfo.thoi_gian)}
      />
    </div>
  );
}