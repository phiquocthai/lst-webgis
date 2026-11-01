import React, { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Compass, Layers, Calendar, MapPin, Globe } from 'lucide-react';

// 1. Thang màu chuẩn GEE cho LST (Ảnh 1)
function getLSTColor(val) {
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
}

// 2. Thang màu chuẩn GEE cho NDVI (Ảnh 2)
function getNDVIColor(val) {
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
}

// 3. Thang màu chuẩn GEE cho TVDI (Ảnh 4)
function getTVDIColor(val) {
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
}

export default function MapFrameModal({
  isOpen,
  onClose,
  selectedIndicator = 'LST',
  currentDate = '2025-12-01',
  geoDistricts,
  khuVucLst = [],
  stations = [],
}) {
  const printRef = useRef(null);

  // Tạo map tra cứu chỉ số nhanh theo ID phường/xã
  const dataMap = useMemo(() => {
    const map = new Map();
    khuVucLst.forEach(item => {
      if (item && item.id) map.set(Number(item.id), item);
    });
    return map;
  }, [khuVucLst]);

  // Tính toán khung tọa độ địa lý (Bounding Box) thực tế của TP.HCM từ GeoJSON
  const { paths, projectedStations, bounds } = useMemo(() => {
    let minLng = 106.35, maxLng = 107.03, minLat = 10.36, maxLat = 11.16;

    if (geoDistricts && geoDistricts.features && geoDistricts.features.length > 0) {
      let bMinLng = Infinity, bMaxLng = -Infinity, bMinLat = Infinity, bMaxLat = -Infinity;
      geoDistricts.features.forEach(f => {
        const coords = f.geometry?.coordinates;
        const type = f.geometry?.type;
        const processRing = (ring) => {
          ring.forEach(([lng, lat]) => {
            if (lng < bMinLng) bMinLng = lng;
            if (lng > bMaxLng) bMaxLng = lng;
            if (lat < bMinLat) bMinLat = lat;
            if (lat > bMaxLat) bMaxLat = lat;
          });
        };
        if (type === 'Polygon' && coords) coords.forEach(processRing);
        else if (type === 'MultiPolygon' && coords) coords.forEach(poly => poly.forEach(processRing));
      });
      if (bMinLng !== Infinity) {
        minLng = bMinLng; maxLng = bMaxLng; minLat = bMinLat; maxLat = bMaxLat;
      }
    }

    // Khung vẽ SVG chuẩn đồ bản A4: viewBox 0 0 800 620
    const svgW = 800;
    const svgH = 620;
    const padX = 40;
    const padY = 30;
    const drawW = svgW - padX * 2;
    const drawH = svgH - padY * 2;

    const midLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos((midLat * Math.PI) / 180);
    const spanLng = (maxLng - minLng) * cosLat;
    const spanLat = maxLat - minLat;
    const scale = Math.min(drawW / spanLng, drawH / spanLat) * 0.94;

    const midLng = (minLng + maxLng) / 2;
    const centerX = svgW / 2;
    const centerY = svgH / 2;

    const project = (lng, lat) => {
      const x = centerX + (lng - midLng) * cosLat * scale;
      const y = centerY - (lat - midLat) * scale;
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    };

    // Chiếu các đa giác ranh giới 167 phường/xã sang SVG paths
    const polygonPaths = [];
    if (geoDistricts && geoDistricts.features) {
      geoDistricts.features.forEach(f => {
        const props = f.properties || {};
        if (props.name && props.name.includes('Côn Đảo')) return;

        const wardId = Number(props.id || props.ma);
        const wardData = dataMap.get(wardId);
        let val = 33.5;
        if (wardData) {
          if (selectedIndicator === 'LST') val = Number(wardData.gia_tri_lst || 33.5);
          else if (selectedIndicator === 'NDVI') val = Number(wardData.ndvi || 0.35);
          else if (selectedIndicator === 'TVDI') val = Number(wardData.tvdi || 0.55);
        }

        let fillColor = '#00FFFF';
        if (selectedIndicator === 'LST') fillColor = getLSTColor(val);
        else if (selectedIndicator === 'NDVI') fillColor = getNDVIColor(val);
        else if (selectedIndicator === 'TVDI') fillColor = getTVDIColor(val);

        const geom = f.geometry;
        if (!geom) return;

        let dStr = '';
        const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];

        polys.forEach(poly => {
          poly.forEach(ring => {
            if (!ring || ring.length < 3) return;
            ring.forEach(([lng, lat], idx) => {
              const [px, py] = project(lng, lat);
              if (idx === 0) dStr += `M ${px} ${py} `;
              else dStr += `L ${px} ${py} `;
            });
            dStr += 'Z ';
          });
        });

        if (dStr) {
          polygonPaths.push({
            id: wardId,
            name: props.name,
            d: dStr,
            fill: fillColor,
            val
          });
        }
      });
    }

    // Chiếu các điểm trạm quan trắc viễn thám
    const projStations = (stations || []).map(st => {
      const [sx, sy] = project(st.lng, st.lat);
      return {
        ...st,
        sx,
        sy,
        color: selectedIndicator === 'LST' ? getLSTColor(st.lst) : selectedIndicator === 'NDVI' ? getNDVIColor(st.ndvi) : getTVDIColor(st.tvdi)
      };
    });

    return {
      paths: polygonPaths,
      projectedStations: projStations,
      bounds: { minLng, maxLng, minLat, maxLat }
    };
  }, [geoDistricts, dataMap, selectedIndicator, stations]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const titleText = selectedIndicator === 'LST'
    ? 'BẢN ĐỒ PHÂN BỐ NHIỆT ĐỘ BỀ MẶT ĐẤT (LST) - TP. HỒ CHÍ MINH'
    : selectedIndicator === 'NDVI'
    ? 'BẢN ĐỒ CHỈ SỐ KHÔNG GIAN THỰC VẬT (NDVI) - TP. HỒ CHÍ MINH'
    : 'BẢN ĐỒ CHỈ SỐ KHÔ HẠN NHIỆT ĐỘ THỰC VẬT (TVDI) - TP. HỒ CHÍ MINH';

  const subtitleText = `Phạm vi hành chính: 167 Phường/Xã | Nguồn dữ liệu: Landsat 8/9 & GEE | Thời điểm: ${currentDate}`;

  return (
    <AnimatePresence>
      <div className="map-frame-backdrop" onClick={onClose}>
        <motion.div
          className="map-frame-modal"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Action Toolbar */}
          <div className="map-frame-actions no-print">
            <span className="map-frame-tag">
              📐 Chế độ Khung Bản đồ Chuẩn Đồ bản A4 (Trực quan hóa ranh giới thực tế, in ấn & xuất báo cáo)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="map-frame-print-btn" onClick={handlePrint}>
                <Printer size={15} />
                <span>In Bản Đồ / Lưu PDF</span>
              </button>
              <button className="map-frame-close-btn" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Khung bản đồ A4 chuẩn đồ bản */}
          <div className="a4-map-container" ref={printRef}>
            {/* Viền đôi bản đồ tiêu chuẩn */}
            <div className="a4-border-outer">
              <div className="a4-border-inner">

                {/* Tiêu đề bản đồ */}
                <div className="a4-map-header">
                  <div className="a4-gov-label">ỦY BAN NHÂN DÂN THÀNH PHỐ HỒ CHÍ MINH</div>
                  <h1 className="a4-map-main-title">{titleText}</h1>
                  <div className="a4-map-sub-title">{subtitleText}</div>
                </div>

                {/* Phần thân: Bản đồ & Chú giải */}
                <div className="a4-map-body">
                  {/* Khung bản đồ trực quan */}
                  <div className="a4-map-canvas-wrapper">
                    {/* Lưới tọa độ địa lý quanh viền (Tick Coordinates) */}
                    <div className="a4-coord-tick top left">106°30'E</div>
                    <div className="a4-coord-tick top center">106°45'E</div>
                    <div className="a4-coord-tick top right">107°00'E</div>
                    <div className="a4-coord-tick left top">11°10'N</div>
                    <div className="a4-coord-tick left center">10°45'N</div>
                    <div className="a4-coord-tick left bottom">10°30'N</div>

                    {/* La bàn chỉ hướng Bắc */}
                    <div className="a4-compass-box">
                      <div className="a4-compass-arrow">
                        <span className="compass-n">N</span>
                        <div className="compass-needle">▲</div>
                      </div>
                    </div>

                    {/* Vùng bản đồ thực tế TP.HCM với 167 phường/xã */}
                    <div className="a4-map-graphic">
                      <svg viewBox="0 0 800 620" className="a4-svg-map" style={{ background: '#f8fafc' }}>
                        {/* Lưới tọa độ địa lý mờ */}
                        <defs>
                          <pattern id="a4-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#e2e8f0" strokeWidth="0.6" strokeDasharray="4,4" />
                          </pattern>
                          <filter id="station-shadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
                          </filter>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#a4-grid)" />

                        {/* Mặt nước / Vịnh Gành Rái & Sông Soài Rạp */}
                        <path
                          d="M 500 580 Q 560 480 620 420 T 780 340 L 800 620 L 500 620 Z"
                          fill="#e0f2fe"
                          opacity="0.8"
                        />

                        {/* 1. Đa giác ranh giới thực tế 167 xã/phường TP.HCM */}
                        <g id="tp-hcm-wards">
                          {paths.map((p) => (
                            <path
                              key={p.id}
                              d={p.d}
                              fill={p.fill}
                              stroke="#ffffff"
                              strokeWidth="0.8"
                              strokeLinejoin="round"
                              opacity="0.92"
                            >
                              <title>{`${p.name}: ${p.val}`}</title>
                            </path>
                          ))}
                        </g>

                        {/* 2. Sông Sài Gòn & Sông Đồng Nai làm mềm không gian */}
                        <path
                          d="M 430 40 Q 450 160 480 220 T 490 320 T 520 420 T 560 520"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          opacity="0.65"
                        />

                        {/* 3. Điểm trạm quan trắc viễn thám thực địa (10 Trạm) */}
                        <g id="tp-hcm-stations">
                          {projectedStations.map(st => (
                            <g key={st.id} transform={`translate(${st.sx}, ${st.sy})`} filter="url(#station-shadow)">
                              {/* Vòng hào quang phát sóng */}
                              <circle r="9" fill={st.color} opacity="0.3" />
                              <circle r="5" fill={st.color} stroke="#ffffff" strokeWidth="1.5" />
                              {/* Nhãn trạm viễn thám */}
                              <rect
                                x="8"
                                y="-10"
                                width="90"
                                height="18"
                                rx="4"
                                fill="#0f172a"
                                stroke={st.color}
                                strokeWidth="1"
                                opacity="0.9"
                              />
                              <text
                                x="12"
                                y="3"
                                fill="#ffffff"
                                fontSize="9"
                                fontWeight="700"
                                fontFamily="system-ui, sans-serif"
                              >
                                {`📡 ${st.id} (${st.lst}°)`}
                              </text>
                            </g>
                          ))}
                        </g>
                      </svg>
                    </div>

                    {/* Thước đo tỷ lệ chuẩn đồ bản */}
                    <div className="a4-scalebar-box">
                      <div className="scalebar-ruler">
                        <div className="scalebar-block black" />
                        <div className="scalebar-block white" />
                        <div className="scalebar-block black" />
                        <div className="scalebar-block white" />
                      </div>
                      <div className="scalebar-labels">
                        <span>0</span>
                        <span>5.0</span>
                        <span>10.0</span>
                        <span>15.0</span>
                        <span>20.0 km</span>
                      </div>
                      <div className="scalebar-ratio">Tỷ lệ: 1 : 150.000</div>
                    </div>
                  </div>

                  {/* Cột chú giải đồ bản (Cartographic Legend Panel) */}
                  <div className="a4-sidebar-legend">
                    {/* Khung chú giải thang màu chuẩn GEE 8 mức */}
                    <div className="a4-legend-box">
                      <h4 className="a4-legend-title">CHÚ GIẢI THANG MÀU (GEE)</h4>
                      <p className="a4-legend-sub">
                        {selectedIndicator === 'LST'
                          ? 'Nhiệt độ bề mặt đất LST (°C)'
                          : selectedIndicator === 'NDVI'
                          ? 'Chỉ số thực vật chuẩn hóa (NDVI)'
                          : 'Chỉ số khô hạn nhiệt - thực vật (TVDI)'}
                      </p>

                      <div className="a4-legend-list">
                        {selectedIndicator === 'LST' && (
                          <>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#0000FF' }} />
                              <span className="legend-desc">&lt; 28.0 °C (Rất mát mẻ)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#0066FF' }} />
                              <span className="legend-desc">28.0 - 30.0 °C (Mát mẻ, nhiều cây)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#00FFFF' }} />
                              <span className="legend-desc">30.0 - 32.0 °C (Dễ chịu, ven sông)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#00FF00' }} />
                              <span className="legend-desc">32.0 - 34.0 °C (Nhiệt độ ổn định)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#FFFF00' }} />
                              <span className="legend-desc">34.0 - 35.5 °C (Ấm nóng vừa)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#FFCC00' }} />
                              <span className="legend-desc">35.5 - 37.0 °C (Nóng, bê tông hóa)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#FF6600' }} />
                              <span className="legend-desc">37.0 - 38.5 °C (Rất nóng, UHI)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#FF0000' }} />
                              <span className="legend-desc">&ge; 38.5 °C (Đảo nhiệt cực nóng)</span>
                            </div>
                          </>
                        )}

                        {selectedIndicator === 'NDVI' && (
                          <>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#FF0000' }} />
                              <span className="legend-desc">&lt; 0.15 (Bê tông hóa dày đặc)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#FF7F00' }} />
                              <span className="legend-desc">0.15 - 0.25 (Thực vật rất thưa)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#FFFF00' }} />
                              <span className="legend-desc">0.25 - 0.35 (Thảm cỏ thưa / Đất trống)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#ADFF2F' }} />
                              <span className="legend-desc">0.35 - 0.45 (Cây bụi đô thị)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#00FF00' }} />
                              <span className="legend-desc">0.45 - 0.55 (Cây xanh trung bình)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#00FFFF' }} />
                              <span className="legend-desc">0.55 - 0.65 (Thảm cây xanh tốt)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#007FFF' }} />
                              <span className="legend-desc">0.65 - 0.75 (Rừng rậm rạp)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#0000FF' }} />
                              <span className="legend-desc">&ge; 0.75 (Rừng sinh thái / Nước)</span>
                            </div>
                          </>
                        )}

                        {selectedIndicator === 'TVDI' && (
                          <>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#066b00' }} />
                              <span className="legend-desc">&lt; 0.25 (Rất ẩm ướt / Đủ nước)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#0bc400' }} />
                              <span className="legend-desc">0.25 - 0.35 (Ẩm ướt / Đất ngập triều)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#0ce100' }} />
                              <span className="legend-desc">0.35 - 0.45 (Đủ ẩm / Thoát nước tốt)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#00ff00' }} />
                              <span className="legend-desc">0.45 - 0.55 (Bình thường / Cân bằng ẩm)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#ffff00' }} />
                              <span className="legend-desc">0.55 - 0.65 (Bắt đầu khô hạn)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#ffcc00' }} />
                              <span className="legend-desc">0.65 - 0.75 (Khô hạn vừa)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#ff6600' }} />
                              <span className="legend-desc">0.75 - 0.85 (Khô hạn cao)</span>
                            </div>
                            <div className="a4-legend-item">
                              <span className="legend-chip" style={{ background: '#ff0000' }} />
                              <span className="legend-desc">&ge; 0.85 (Khô hạn đặc biệt gay gắt)</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Khung thông tin kỹ thuật biên tập bản đồ */}
                    <div className="a4-meta-box">
                      <h4 className="a4-legend-title">THÔNG TIN BIÊN TẬP</h4>
                      <div className="a4-meta-row">
                        <span className="a4-meta-k">Hệ quy chiếu:</span>
                        <span className="a4-meta-v">VN-2000 / WGS-84</span>
                      </div>
                      <div className="a4-meta-row">
                        <span className="a4-meta-k">Kinh tuyến trục:</span>
                        <span className="a4-meta-v">105°45', múi 3°</span>
                      </div>
                      <div className="a4-meta-row">
                        <span className="a4-meta-k">Cảm biến viễn thám:</span>
                        <span className="a4-meta-v">Landsat 8/9 TIRS & OLI</span>
                      </div>
                      <div className="a4-meta-row">
                        <span className="a4-meta-k">Đơn vị hành chính:</span>
                        <span className="a4-meta-v">167 Phường/Xã TP.HCM</span>
                      </div>
                      <div className="a4-meta-row">
                        <span className="a4-meta-k">Trạm viễn thám:</span>
                        <span className="a4-meta-v">{projectedStations.length} Trạm GEE & AWS</span>
                      </div>
                      <div className="a4-meta-row">
                        <span className="a4-meta-k">Nền tảng xử lý:</span>
                        <span className="a4-meta-v">Google Earth Engine & AI</span>
                      </div>
                      <div className="a4-meta-row">
                        <span className="a4-meta-k">Đơn vị thực hiện:</span>
                        <span className="a4-meta-v">Nhóm Đồ Án WebGIS LST</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer bản đồ */}
                <div className="a4-map-footer">
                  <span>Hệ thống WebGIS Dự báo Nhiệt độ Bề mặt Đất (LST) & Đảo nhiệt Đô thị TP. Hồ Chí Minh</span>
                  <span>Ngày xuất bản: {new Date().toLocaleDateString('vi-VN')}</span>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
