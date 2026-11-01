import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListFilter,
  Search,
  ArrowUpDown,
  Flame,
  Leaf,
  SunMedium,
  Crosshair,
  X,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';

export default function WardListPanel({
  isOpen,
  onClose,
  khuVucLst = [],
  onSelectWard,
  thresholdFilter,
  setThresholdFilter,
  selectedIndicator = 'LST',
}) {
  const [sortKey, setSortKey] = useState('LST_DESC'); // LST_DESC | NDVI_ASC | TVDI_DESC
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Lọc bỏ Côn Đảo nếu còn và chuẩn hóa danh sách
  const cleanedWards = useMemo(() => {
    return khuVucLst
      .filter(item => item && item.ten_khu_vuc && !item.ten_khu_vuc.includes('Côn Đảo'))
      .map(item => ({
        ...item,
        lst: Number(item.gia_tri_lst || 32.0),
        ndvi: Number(item.ndvi || 0.35),
        tvdi: Number(item.tvdi || 0.55),
      }));
  }, [khuVucLst]);

  // 2. Sắp xếp theo yêu cầu của đề tài:
  // - LST: cao -> thấp
  // - NDVI: thấp -> cao
  // - TVDI: cao -> thấp
  const sortedWards = useMemo(() => {
    const list = [...cleanedWards];
    if (sortKey === 'LST_DESC') {
      list.sort((a, b) => b.lst - a.lst);
    } else if (sortKey === 'NDVI_ASC') {
      list.sort((a, b) => a.ndvi - b.ndvi);
    } else if (sortKey === 'TVDI_DESC') {
      list.sort((a, b) => b.tvdi - a.tvdi);
    }
    return list;
  }, [cleanedWards, sortKey]);

  // 3. Lọc theo ngưỡng đã chọn (ví dụ LST > 40 hoặc LST > 35) & tìm kiếm tên
  const filteredWards = useMemo(() => {
    return sortedWards.filter(item => {
      // Tìm kiếm tên
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!item.ten_khu_vuc.toLowerCase().includes(q)) return false;
      }

      // Kiểm tra ngưỡng nếu đang bật
      if (thresholdFilter && thresholdFilter.enabled) {
        const { metric, op, value } = thresholdFilter;
        const val = metric === 'NDVI' ? item.ndvi : metric === 'TVDI' ? item.tvdi : item.lst;
        const threshold = Number(value);
        if (op === '>') return val > threshold;
        if (op === '>=') return val >= threshold;
        if (op === '<') return val < threshold;
        if (op === '<=') return val <= threshold;
      }
      return true;
    });
  }, [sortedWards, searchQuery, thresholdFilter]);

  if (!isOpen) return null;

  const handleApplyPreset = (metric, op, val) => {
    setThresholdFilter({
      enabled: true,
      metric,
      op,
      value: val,
    });
    if (metric === 'LST') setSortKey('LST_DESC');
    else if (metric === 'NDVI') setSortKey('NDVI_ASC');
    else if (metric === 'TVDI') setSortKey('TVDI_DESC');
  };

  const handleResetThreshold = () => {
    setThresholdFilter({
      enabled: false,
      metric: 'LST',
      op: '>=',
      value: 35.0,
    });
  };

  return (
    <AnimatePresence>
      <div className="ward-list-backdrop" onClick={onClose}>
        <motion.div
          className="ward-list-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 240 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="ward-list-header">
            <div className="ward-list-title-group">
              <div className="ward-list-icon">
                <ListFilter size={18} color="#0284c7" />
              </div>
              <div>
                <h3 className="ward-list-title">Danh Sách 167 Phường/Xã TP.HCM</h3>
                <p className="ward-list-sub">
                  Sắp xếp chỉ số môi trường & Lọc không gian theo ngưỡng
                </p>
              </div>
            </div>
            <button className="ward-list-close-btn" onClick={onClose} title="Đóng danh sách">
              <X size={18} />
            </button>
          </div>

          {/* 1. Thanh chọn thứ tự sắp xếp theo đúng yêu cầu */}
          <div className="ward-sort-tabs">
            <button
              className={`ward-sort-tab ${sortKey === 'LST_DESC' ? 'active lst' : ''}`}
              onClick={() => setSortKey('LST_DESC')}
            >
              <Flame size={14} />
              <span>LST (Cao → Thấp)</span>
            </button>
            <button
              className={`ward-sort-tab ${sortKey === 'NDVI_ASC' ? 'active ndvi' : ''}`}
              onClick={() => setSortKey('NDVI_ASC')}
            >
              <Leaf size={14} />
              <span>NDVI (Thấp → Cao)</span>
            </button>
            <button
              className={`ward-sort-tab ${sortKey === 'TVDI_DESC' ? 'active tvdi' : ''}`}
              onClick={() => setSortKey('TVDI_DESC')}
            >
              <SunMedium size={14} />
              <span>TVDI (Cao → Thấp)</span>
            </button>
          </div>

          {/* 2. Bộ lọc ngưỡng theo giá trị (Threshold Selector) */}
          <div className="ward-threshold-box">
            <div className="ward-threshold-top">
              <span className="ward-threshold-title">
                <SlidersHorizontal size={13} color="#0891b2" />
                Chọn ngưỡng lọc hiển thị:
              </span>
              {thresholdFilter?.enabled && (
                <button className="ward-threshold-reset" onClick={handleResetThreshold}>
                  Bỏ lọc (Hiện cả 167)
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="ward-preset-buttons">
              <button
                className={`ward-preset-btn ${thresholdFilter?.enabled && thresholdFilter.metric === 'LST' && thresholdFilter.value === 36 ? 'active' : ''}`}
                onClick={() => handleApplyPreset('LST', '>=', 36.0)}
              >
                🔥 LST ≥ 36°C (Đảo nhiệt cao)
              </button>
              <button
                className={`ward-preset-btn ${thresholdFilter?.enabled && thresholdFilter.metric === 'LST' && thresholdFilter.value === 34 ? 'active' : ''}`}
                onClick={() => handleApplyPreset('LST', '>=', 34.0)}
              >
                ☀️ LST ≥ 34°C (Ấm nóng)
              </button>
              <button
                className={`ward-preset-btn ${thresholdFilter?.enabled && thresholdFilter.metric === 'NDVI' && thresholdFilter.value === 0.25 ? 'active' : ''}`}
                onClick={() => handleApplyPreset('NDVI', '<=', 0.25)}
              >
                🌿 NDVI ≤ 0.25 (Thiếu cây xanh)
              </button>
              <button
                className={`ward-preset-btn ${thresholdFilter?.enabled && thresholdFilter.metric === 'TVDI' && thresholdFilter.value === 0.65 ? 'active' : ''}`}
                onClick={() => handleApplyPreset('TVDI', '>=', 0.65)}
              >
                🏜️ TVDI ≥ 0.65 (Khô hạn nặng)
              </button>
            </div>

            {/* Custom Threshold Input */}
            <div className="ward-threshold-custom">
              <select
                value={thresholdFilter?.metric || 'LST'}
                onChange={e => setThresholdFilter(prev => ({ ...prev, enabled: true, metric: e.target.value }))}
                className="ward-select"
              >
                <option value="LST">Nhiệt độ LST (°C)</option>
                <option value="NDVI">Chỉ số NDVI</option>
                <option value="TVDI">Chỉ số TVDI</option>
              </select>

              <select
                value={thresholdFilter?.op || '>='}
                onChange={e => setThresholdFilter(prev => ({ ...prev, enabled: true, op: e.target.value }))}
                className="ward-select op"
              >
                <option value=">=">&ge; (Lớn hơn bằng)</option>
                <option value=">">&gt; (Lớn hơn)</option>
                <option value="<=">&le; (Nhỏ hơn bằng)</option>
                <option value="<">&lt; (Nhỏ hơn)</option>
              </select>

              <input
                type="number"
                step="0.5"
                value={thresholdFilter?.value || 35.0}
                onChange={e => setThresholdFilter(prev => ({ ...prev, enabled: true, value: parseFloat(e.target.value) || 0 }))}
                className="ward-input-val"
                placeholder="Ngưỡng..."
              />

              <button
                className="ward-filter-apply-btn"
                onClick={() => setThresholdFilter(prev => ({ ...prev, enabled: true }))}
              >
                Áp dụng
              </button>
            </div>
          </div>

          {/* 3. Ô tìm kiếm & Thống kê số lượng */}
          <div className="ward-search-row">
            <div className="ward-search-box">
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Tìm nhanh tên phường/xã (vd: Bến Nghé, Thủ Đức...)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="ward-search-clear">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="ward-count-badge">
              Hiển thị <strong>{filteredWards.length}</strong> / {cleanedWards.length} phường
            </div>
          </div>

          {/* 4. Danh sách các phường cuộn mượt */}
          <div className="ward-list-scroll">
            {filteredWards.length === 0 ? (
              <div className="ward-empty">
                <Info size={28} color="#94a3b8" />
                <p>Không có phường/xã nào thỏa mãn ngưỡng lọc đã chọn.</p>
                <button className="ward-reset-btn" onClick={handleResetThreshold}>
                  Xóa điều kiện lọc
                </button>
              </div>
            ) : (
              filteredWards.map((ward, idx) => {
                const rank = idx + 1;
                const isTopHot = ward.lst >= 35.0;
                return (
                  <div
                    key={ward.id}
                    className={`ward-item-card ${isTopHot ? 'is-hot' : ''}`}
                    onClick={() => {
                      if (onSelectWard) onSelectWard(ward);
                    }}
                  >
                    <div className="ward-card-rank">
                      <span className={`rank-badge ${rank <= 3 ? 'top-rank' : ''}`}>
                        #{rank}
                      </span>
                    </div>

                    <div className="ward-card-info">
                      <div className="ward-card-name-row">
                        <span className="ward-card-name">{ward.ten_khu_vuc}</span>
                        <span className="ward-card-type">Phường/Xã</span>
                      </div>

                      <div className="ward-card-metrics-grid">
                        <div className="ward-metric-chip lst">
                          <Flame size={11} />
                          <span>LST:</span>
                          <strong>{ward.lst.toFixed(1)}°C</strong>
                        </div>
                        <div className="ward-metric-chip ndvi">
                          <Leaf size={11} />
                          <span>NDVI:</span>
                          <strong>{ward.ndvi.toFixed(2)}</strong>
                        </div>
                        <div className="ward-metric-chip tvdi">
                          <SunMedium size={11} />
                          <span>TVDI:</span>
                          <strong>{ward.tvdi.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="ward-card-action">
                      <button
                        className="ward-locate-btn"
                        title="Định vị phường trên bản đồ"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectWard) onSelectWard(ward);
                        }}
                      >
                        <Crosshair size={13} />
                        <span>Định vị</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
