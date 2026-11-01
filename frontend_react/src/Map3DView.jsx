import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Danh sách 10 trạm quan trắc chuẩn GEE & AWS dự phòng khi chưa tải xong
const DEFAULT_STATIONS = [
  {
    id: 'TSH',
    ten: 'Trạm Khí tượng Tân Sơn Hòa',
    ma: 'WMO-48900',
    khu_vuc: 'Quận Tân Bình',
    lat: 10.7984,
    lng: 106.6631,
    lst: 35.8,
    ndvi: 0.22,
    tvdi: 0.72,
    cam_bien: 'Landsat 8/9 Band 10 TIRS + AWS Davis Vantage Pro2',
    dac_diem: 'Trạm chuẩn WMO - Khu vực sân bay & đảo nhiệt Tân Bình'
  },
  {
    id: 'TCV',
    ten: 'Trạm Quan trắc Lõi UHI Quận 1',
    ma: 'UHI-Q1',
    khu_vuc: 'Quận 1',
    lat: 10.7875,
    lng: 106.7053,
    lst: 37.2,
    ndvi: 0.18,
    tvdi: 0.78,
    cam_bien: 'Landsat 8/9 TIRS + Cảm biến hồng ngoại nhiệt Testo',
    dac_diem: 'Lõi đô thị bê tông hóa cao tầng & đối chứng công viên'
  },
  {
    id: 'SHTP',
    ten: 'Trạm Tháp Viễn thám Khu CNC',
    ma: 'FLUX-TD',
    khu_vuc: 'TP. Thủ Đức',
    lat: 10.8542,
    lng: 106.7905,
    lst: 36.4,
    ndvi: 0.31,
    tvdi: 0.69,
    cam_bien: 'Landsat 8/9 + MODIS/Terra + Eddy Covariance Tower',
    dac_diem: 'Tháp thông lượng nhiệt bức xạ và viễn thám công nghệ cao'
  },
  {
    id: 'LMX',
    ten: 'Trạm Nông nghiệp Lê Minh Xuân',
    ma: 'AGR-BC',
    khu_vuc: 'Huyện Bình Chánh',
    lat: 10.7302,
    lng: 106.5304,
    lst: 32.6,
    ndvi: 0.52,
    tvdi: 0.45,
    cam_bien: 'Landsat 8/9 TIRS + Cảm biến độ ẩm đất SMAP 5cm',
    dac_diem: 'Quan trắc nhiệt độ đất canh tác và vùng trũng nông nghiệp'
  },
  {
    id: 'CG',
    ten: 'Trạm Sinh thái Rừng Cần Giờ',
    ma: 'MANGROVE-CG',
    khu_vuc: 'Huyện Cần Giờ',
    lat: 10.4350,
    lng: 106.9120,
    lst: 28.4,
    ndvi: 0.76,
    tvdi: 0.21,
    cam_bien: 'Sentinel-2 Multispectral + AWS Vaisala WXT536',
    dac_diem: 'Vùng đệm sinh thái rừng ngập mặn Cần Giờ - Mát mẻ nhất TP'
  },
  {
    id: 'TD',
    ten: 'Trạm Khí tượng ĐHQG Thủ Đức',
    ma: 'MET-TD',
    khu_vuc: 'TP. Thủ Đức',
    lat: 10.8700,
    lng: 106.8030,
    lst: 34.1,
    ndvi: 0.48,
    tvdi: 0.54,
    cam_bien: 'Landsat 8/9 + Campbell Scientific CR1000X',
    dac_diem: 'Quan trắc vi khí hậu đồi dốc tự nhiên và hồ đá ĐHQG'
  },
  {
    id: 'Q7',
    ten: 'Trạm Đô thị Nam Sài Gòn',
    ma: 'UHI-Q7',
    khu_vuc: 'Quận 7',
    lat: 10.7310,
    lng: 106.7180,
    lst: 35.5,
    ndvi: 0.29,
    tvdi: 0.68,
    cam_bien: 'Landsat 8/9 TIRS + AWS Davis Vantage Pro2',
    dac_diem: 'Khu đô thị mới Phú Mỹ Hưng ven sông & trục đường lớn'
  },
  {
    id: 'AP',
    ten: 'Trạm Sinh thái Ven Sông An Phú Đông',
    ma: 'RUR-Q12',
    khu_vuc: 'Quận 12',
    lat: 10.8520,
    lng: 106.6960,
    lst: 34.8,
    ndvi: 0.38,
    tvdi: 0.61,
    cam_bien: 'Landsat 8/9 TIRS + Cảm biến nhiệt ẩm bề mặt Onset HOBO',
    dac_diem: 'Khu vực chuyển tiếp giữa bãi bồi ven sông Sài Gòn và ngoại vi'
  },
  {
    id: 'CC',
    ten: 'Trạm Nông nghiệp Củ Chi',
    ma: 'AGR-CC',
    khu_vuc: 'Huyện Củ Chi',
    lat: 11.0060,
    lng: 106.5020,
    lst: 31.9,
    ndvi: 0.58,
    tvdi: 0.42,
    cam_bien: 'Landsat 8/9 TIRS + AWS Agro-Met Station',
    dac_diem: 'Vùng bán sơn địa gò đồi, vườn cây ăn trái và đất cao Củ Chi'
  },
  {
    id: 'HM',
    ten: 'Trạm Khí tượng Hóc Môn',
    ma: 'SUB-HM',
    khu_vuc: 'Huyện Hóc Môn',
    lat: 10.8840,
    lng: 106.5920,
    lst: 33.7,
    ndvi: 0.44,
    tvdi: 0.51,
    cam_bien: 'Landsat 8/9 TIRS + AWS Compact Weather Station',
    dac_diem: 'Quan trắc xu hướng dịch chuyển đảo nhiệt ra khu vực vành đai 3'
  }
];

// Hàm tính màu theo 8 thang màu chuẩn GEE từ ảnh 1, 2, 4
function getIndicatorColorHex(val, indicator) {
  if (val === undefined || val === null || isNaN(val)) return 0x94a3b8;
  const num = Number(val);

  if (indicator === 'LST') {
    // Ảnh 1: ["#0000FF", "#0066FF", "#00FFFF", "#00FF00", "#FFFF00", "#FFCC00", "#FF6600", "#FF0000"]
    if (num < 28.0) return 0x0000FF; // Xanh lam đậm (< 28°C - Rất mát mẻ)
    if (num < 30.0) return 0x0066FF; // Xanh lam sáng (28 - 30°C - Mát mẻ)
    if (num < 32.0) return 0x00FFFF; // Xanh lơ cyan (30 - 32°C - Dễ chịu)
    if (num < 34.0) return 0x00FF00; // Xanh lục (32 - 34°C - Ổn định)
    if (num < 35.5) return 0xFFFF00; // Vàng tươi (34 - 35.5°C - Ấm nhẹ)
    if (num < 37.0) return 0xFFCC00; // Vàng cam (35.5 - 37°C - Nóng đô thị)
    if (num < 38.5) return 0xFF6600; // Cam đậm (37 - 38.5°C - Bê tông hóa cao)
    return 0xFF0000;                 // Đỏ rực (>= 38.5°C - Đảo nhiệt UHI cực đoan)
  }

  if (indicator === 'NDVI') {
    // Ảnh 2: ['#FF0000', '#FF7F00', '#FFFF00', '#ADFF2F', '#00FF00', '#00FFFF', '#007FFF', '#0000FF']
    if (num < 0.15) return 0xFF0000; // Đỏ (< 0.15 - Mặt nước, bê tông đặc)
    if (num < 0.25) return 0xFF7F00; // Cam (0.15 - 0.25 - Đất trống, ít cây)
    if (num < 0.35) return 0xFFFF00; // Vàng (0.25 - 0.35 - Thảm cỏ thưa)
    if (num < 0.45) return 0xADFF2F; // Vàng chanh GreenYellow (0.35 - 0.45 - Cây bụi)
    if (num < 0.55) return 0x00FF00; // Lục nhạt (0.45 - 0.55 - Cây xanh vừa)
    if (num < 0.65) return 0x00FFFF; // Cyan (0.55 - 0.65 - Cây xanh tươi tốt)
    if (num < 0.75) return 0x007FFF; // Xanh biển Azure (0.65 - 0.75 - Rừng rậm rạp)
    return 0x0000FF;                 // Xanh lam đậm (>= 0.75 - Rừng Cần Giờ)
  }

  if (indicator === 'TVDI') {
    // Ảnh 4: ['#066b00', '#0bc400', '#0ce100', '#00ff00', '#ffff00', '#ffcc00', '#ff6600', '#ff0000']
    if (num < 0.25) return 0x066b00; // Xanh lục đậm (< 0.25 - Rất ẩm / Rừng ngập mặn)
    if (num < 0.35) return 0x0bc400; // Xanh lục (0.25 - 0.35 - Ẩm cao)
    if (num < 0.45) return 0x0ce100; // Xanh lục tươi (0.35 - 0.45 - Đủ ẩm)
    if (num < 0.55) return 0x00ff00; // Xanh nõn chuối (0.45 - 0.55 - Ẩm trung bình)
    if (num < 0.65) return 0xffff00; // Vàng tươi (0.55 - 0.65 - Bắt đầu khô nhẹ)
    if (num < 0.75) return 0xffcc00; // Vàng cam (0.65 - 0.75 - Khô hạn vừa)
    if (num < 0.85) return 0xff6600; // Cam (0.75 - 0.85 - Khô hạn cao)
    return 0xff0000;                 // Đỏ rực (>= 0.85 - Khô hạn cực độ)
  }

  return 0x00FFFF;
}

// Tạo thẻ chữ 3D Billboard Sprite trong Three.js
function makeTextSprite(message, opts = {}) {
  const fontFace = opts.fontFace || 'Inter, Roboto, sans-serif';
  const fontSize = opts.fontSize || 26;
  const borderThickness = opts.borderThickness || 3;
  const borderColor = opts.borderColor || '#38bdf8';
  const backgroundColor = opts.backgroundColor || 'rgba(15, 23, 42, 0.90)';
  const textColor = opts.textColor || '#ffffff';

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 128;

  context.font = `bold ${fontSize}px ${fontFace}`;
  const metrics = context.measureText(message);
  const textWidth = metrics.width;

  const padX = 22;
  const padY = 12;
  const boxW = Math.min(500, textWidth + padX * 2);
  const boxH = fontSize + padY * 2;
  const boxX = (canvas.width - boxW) / 2;
  const boxY = (canvas.height - boxH) / 2;
  const radius = 10;

  context.fillStyle = backgroundColor;
  context.strokeStyle = borderColor;
  context.lineWidth = borderThickness;

  context.beginPath();
  context.moveTo(boxX + radius, boxY);
  context.lineTo(boxX + boxW - radius, boxY);
  context.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
  context.lineTo(boxX + boxW, boxY + boxH - radius);
  context.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
  context.lineTo(boxX + radius, boxY + boxH);
  context.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
  context.lineTo(boxX, boxY + radius);
  context.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = textColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(message, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(7.5, 1.88, 1);
  return sprite;
}

export default function Map3DView({
  geoDistricts,
  khuVucLst = [],
  selectedIndicator = 'LST',
  extrusionScale = 1.0,
  selectedWard = null,
  onSelectWard,
  thresholdFilter = null,
  currentDate = '',
  showObservation = true, // Mặc định bật trong 3D để người dùng thấy rõ
  stations = [],
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const meshesMapRef = useRef(new Map());
  const stationMeshesRef = useRef([]);
  const reqAnimRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [show3DStations, setShow3DStations] = useState(true);

  // Tạo map tra cứu chỉ số nhanh theo ID phường/xã
  const dataLookup = useMemo(() => {
    const map = new Map();
    khuVucLst.forEach(item => {
      if (item && item.id) {
        map.set(Number(item.id), item);
      }
    });
    return map;
  }, [khuVucLst]);

  // Danh sách 10 trạm chuẩn viễn thám thực tế
  const activeStations = useMemo(() => {
    if (stations && stations.length > 0) return stations;
    return DEFAULT_STATIONS;
  }, [stations]);

  // Kiểm tra điều kiện lọc ngưỡng
  const isMatchThreshold = (val) => {
    if (!thresholdFilter || !thresholdFilter.enabled) return true;
    const { op, value } = thresholdFilter;
    const v = Number(val);
    const target = Number(value);
    if (isNaN(v) || isNaN(target)) return true;
    if (op === '>') return v > target;
    if (op === '>=') return v >= target;
    if (op === '<') return v < target;
    if (op === '<=') return v <= target;
    return true;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf1f5f9); // Nền sáng nhẹ nhàng thanh lịch

    // Sương mù mỏng tạo chiều sâu không gian 3D
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.008);

    // 2. Camera: Góc nghiêng Perspective 3D
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(2, 42, 48); // Nhìn xéo từ hướng Nam - Đông Nam lên TP.HCM
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.08; // Không cho camera chìm xuống dưới mặt đất
    controls.minDistance = 15;
    controls.maxDistance = 130;
    controls.target.set(0, 0, 0); // Trọng tâm TP.HCM
    controlsRef.current = controls;

    // 5. Hệ thống Chiếu sáng 3D chân thực
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    dirLight.position.set(35, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -45;
    dirLight.shadow.camera.right = 45;
    dirLight.shadow.camera.top = 45;
    dirLight.shadow.camera.bottom = -45;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.7);
    fillLight.position.set(-30, 30, -30);
    scene.add(fillLight);

    // 6. Mặt phẳng bản đồ nền (Basemap Ground Plane)
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.9,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Lưới tọa độ địa lý mờ nhẹ
    const grid = new THREE.GridHelper(120, 24, 0x94a3b8, 0xcbd5e1);
    grid.position.y = 0;
    scene.add(grid);

    // Animation Loop
    const animate = () => {
      reqAnimRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Xây dựng các khối 3D đùn đa giác (3D Extrusion) cho 167 phường/xã và 10 Trạm Quan Trắc
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !geoDistricts || !geoDistricts.features) return;

    // Xóa các mesh cũ
    meshesMapRef.current.forEach(mesh => {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        else mesh.material.dispose();
      }
    });
    meshesMapRef.current.clear();
    stationMeshesRef.current = [];

    // Tọa độ tâm TP.HCM để quy đổi sang không gian cục bộ 3D
    const centerLng = 106.69;
    const centerLat = 10.78;
    const scaleFactor = 75.0; // Phóng tỷ lệ kinh vĩ độ ra đơn vị 3D
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    const projectTo3D = (lng, lat) => [
      (lng - centerLng) * scaleFactor * cosLat,
      (lat - centerLat) * scaleFactor
    ];

    const group3D = new THREE.Group();
    group3D.name = 'wardsGroup';

    // 1. Đùn đa giác 3D cho 167 Phường/Xã
    geoDistricts.features.forEach(feature => {
      const props = feature.properties || {};
      const wardId = Number(props.id || props.ma);
      if (props.name && props.name.includes('Côn Đảo')) return;

      const wardData = dataLookup.get(wardId);
      let metricVal = 32.0;
      if (wardData) {
        if (selectedIndicator === 'LST') metricVal = Number(wardData.gia_tri_lst || 32.0);
        else if (selectedIndicator === 'NDVI') metricVal = Number(wardData.ndvi || 0.35);
        else if (selectedIndicator === 'TVDI') metricVal = Number(wardData.tvdi || 0.55);
      }

      // Tính chiều cao khối 3D (Extrusion Height)
      let normHeight = 1.0;
      if (selectedIndicator === 'LST') {
        normHeight = Math.max(0.3, (metricVal - 26.0) * 0.42);
      } else if (selectedIndicator === 'NDVI') {
        normHeight = Math.max(0.3, (0.8 - metricVal) * 5.0);
      } else if (selectedIndicator === 'TVDI') {
        normHeight = Math.max(0.3, (metricVal - 0.25) * 6.0);
      }
      const extrudeHeight = Math.max(0.3, normHeight * extrusionScale);

      // Tính màu sắc khối 3D chuẩn 8 cấp GEE
      const hexColor = getIndicatorColorHex(metricVal, selectedIndicator);
      const isMatch = isMatchThreshold(metricVal);

      // Phân tích hình học Polygon / MultiPolygon
      const geomType = feature.geometry?.type;
      const coords = feature.geometry?.coordinates;
      if (!coords) return;

      const polygons = geomType === 'Polygon' ? [coords] : geomType === 'MultiPolygon' ? coords : [];

      polygons.forEach((polyCoords) => {
        if (!polyCoords || !polyCoords[0] || polyCoords[0].length < 3) return;

        const outerRing = polyCoords[0];
        const shape = new THREE.Shape();

        outerRing.forEach(([lng, lat], idx) => {
          const [x, y] = projectTo3D(lng, lat);
          if (idx === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        });

        // Xử lý các lỗ thủng (Holes) nếu có
        for (let h = 1; h < polyCoords.length; h++) {
          const holeRing = polyCoords[h];
          if (holeRing.length >= 3) {
            const holePath = new THREE.Path();
            holeRing.forEach(([lng, lat], hIdx) => {
              const [hx, hy] = projectTo3D(lng, lat);
              if (hIdx === 0) holePath.moveTo(hx, hy);
              else holePath.lineTo(hx, hy);
            });
            shape.holes.push(holePath);
          }
        }

        // Tạo ExtrudeGeometry 3D
        const extrudeSettings = {
          steps: 1,
          depth: extrudeHeight,
          bevelEnabled: true,
          bevelThickness: 0.08,
          bevelSize: 0.08,
          bevelSegments: 2,
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geom.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.35,
          metalness: 0.12,
          transparent: true,
          opacity: isMatch ? 0.95 : 0.25,
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = isMatch;
        mesh.receiveShadow = true;
        mesh.userData = {
          isStation: false,
          wardId,
          wardName: props.name || wardData?.ten_khu_vuc || `Phường ${wardId}`,
          metricVal,
          extrudeHeight,
          elevationPct: Math.min(100, Math.round((extrudeHeight / (4.5 * extrusionScale)) * 100)),
          originalColor: hexColor,
          isMatch,
        };

        // Viền cạnh polygon sắc nét
        const edgesGeom = new THREE.EdgesGeometry(geom, 25);
        const edgesMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: isMatch ? 0.75 : 0.15,
          linewidth: 1,
        });
        const line = new THREE.LineSegments(edgesGeom, edgesMat);
        mesh.add(line);

        group3D.add(mesh);
        meshesMapRef.current.set(`${wardId}_${mesh.id}`, mesh);
      });
    });

    // 2. Thêm 10 Đài Quan Trắc Viễn Thám & Khí Tượng 3D
    const stationGroup = new THREE.Group();
    stationGroup.name = 'stationGroup';

    if (show3DStations && activeStations.length > 0) {
      activeStations.forEach(st => {
        const [x, z] = projectTo3D(st.lng, st.lat);
        const beaconHeight = 5.8;

        const stationObj = {
          isStation: true,
          stationId: st.id,
          stationName: st.ten,
          stationCode: st.ma,
          district: st.khu_vuc,
          lst: st.lst,
          ndvi: st.ndvi,
          tvdi: st.tvdi,
          sensor: st.cam_bien,
          desc: st.dac_diem,
        };

        // a. Vòng quét radar tròn trên mặt đất (Radar Ground Ring)
        const ringGeo = new THREE.RingGeometry(0.4, 1.4, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(x, 0.05, z);
        ringMesh.userData = stationObj;
        stationGroup.add(ringMesh);

        // b. Trụ tháp viễn thám kim loại công nghệ cao (High-tech Beacon Pillar)
        const cylGeo = new THREE.CylinderGeometry(0.22, 0.45, beaconHeight, 16);
        const cylMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.65,
          roughness: 0.15,
          metalness: 0.85,
        });
        const cylMesh = new THREE.Mesh(cylGeo, cylMat);
        cylMesh.position.set(x, beaconHeight / 2, z);
        cylMesh.userData = stationObj;
        stationGroup.add(cylMesh);
        stationMeshesRef.current.push(cylMesh);

        // c. Cột chùm sáng dọc vút lên trời (Vertical Light Beam)
        const beamGeo = new THREE.CylinderGeometry(0.06, 0.35, 12, 12);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.set(x, beaconHeight + 5.5, z);
        beamMesh.userData = stationObj;
        stationGroup.add(beamMesh);

        // d. Quả cầu tín hiệu neon trên đỉnh đài
        const sphereGeo = new THREE.SphereGeometry(0.48, 16, 16);
        const sphereColor = st.lst >= 36 ? 0xff0000 : (st.lst <= 31 ? 0x00ff00 : 0xffcc00);
        const sphereMat = new THREE.MeshBasicMaterial({ color: sphereColor });
        const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        sphereMesh.position.set(x, beaconHeight + 0.35, z);
        sphereMesh.userData = stationObj;
        stationGroup.add(sphereMesh);
        stationMeshesRef.current.push(sphereMesh);

        // e. Thẻ nhãn chữ 3D Billboard Sprite hiển thị tên trạm và chỉ số
        const valStr = selectedIndicator === 'LST' ? `${st.lst}°C` : selectedIndicator === 'NDVI' ? st.ndvi : st.tvdi;
        const labelSprite = makeTextSprite(`📡 ${st.id} (${valStr})`, {
          fontSize: 26,
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          borderColor: '#38bdf8',
          textColor: '#ffffff',
        });
        labelSprite.position.set(x, beaconHeight + 1.85, z);
        labelSprite.userData = stationObj;
        stationGroup.add(labelSprite);
        stationMeshesRef.current.push(labelSprite);
      });
    }

    group3D.add(stationGroup);
    scene.add(group3D);

    return () => {
      scene.remove(group3D);
    };
  }, [geoDistricts, dataLookup, selectedIndicator, extrusionScale, thresholdFilter, show3DStations, activeStations]);

  // Highlight phường được chọn
  useEffect(() => {
    if (!meshesMapRef.current) return;
    meshesMapRef.current.forEach(mesh => {
      const isSelected = selectedWard && (mesh.userData.wardId === Number(selectedWard.id || selectedWard.ma_khu_vuc));
      if (isSelected) {
        mesh.material.emissive = new THREE.Color(0x38bdf8);
        mesh.material.emissiveIntensity = 0.55;
      } else {
        mesh.material.emissive = new THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
      }
    });
  }, [selectedWard]);

  // Xử lý di chuột tương tác Raycasting để hiện Popup 3D
  const handlePointerMove = (event) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    // 1. Kiểm tra va chạm với các đài trạm quan trắc trước
    if (show3DStations && stationMeshesRef.current.length > 0) {
      const stationHits = raycaster.intersectObjects(stationMeshesRef.current, false);
      if (stationHits.length > 0) {
        const hit = stationHits[0];
        const data = hit.object.userData;
        if (data && data.isStation) {
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            isStation: true,
            stationName: data.stationName,
            stationCode: data.stationCode,
            district: data.district,
            lst: data.lst,
            ndvi: data.ndvi,
            tvdi: data.tvdi,
            sensor: data.sensor,
            desc: data.desc,
            indicator: selectedIndicator,
          });
          document.body.style.cursor = 'pointer';
          return;
        }
      }
    }

    // 2. Kiểm tra va chạm với các khối 3D phường/xã
    const meshes = Array.from(meshesMapRef.current.values());
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const data = hit.object.userData;
      if (data && data.wardName) {
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          isStation: false,
          wardName: data.wardName,
          val: data.metricVal,
          pct: data.elevationPct || 52,
          indicator: selectedIndicator,
        });
        document.body.style.cursor = 'pointer';
        return;
      }
    }
    setTooltip(null);
    document.body.style.cursor = 'default';
  };

  const handleClick = (event) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    // Kiểm tra va chạm phường/xã
    const meshes = Array.from(meshesMapRef.current.values());
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const data = hit.object.userData;
      if (data && onSelectWard && data.wardId) {
        const fullWard = dataLookup.get(data.wardId) || {
          id: data.wardId,
          ten_khu_vuc: data.wardName,
          gia_tri_lst: data.metricVal,
        };
        onSelectWard(fullWard);
      }
    }
  };

  // Reset góc nhìn 3D chuẩn
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(2, 42, 48);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating 3D Control HUD Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={() => setShow3DStations(!show3DStations)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: show3DStations ? '1px solid #38bdf8' : '1px solid #cbd5e1',
            background: show3DStations ? '#0f172a' : '#ffffff',
            color: show3DStations ? '#38bdf8' : '#475569',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.2s ease',
          }}
          title="Bật/Tắt hiển thị 10 tháp quan trắc viễn thám thực địa trong không gian 3D"
        >
          <span>📡</span>
          <span>{show3DStations ? '10 Trạm Quan Trắc: ĐANG BẬT' : '10 Trạm Quan Trắc: TẮT'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          style={{
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#475569',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}
          title="Đặt lại góc quay camera 3D về mặc định"
        >
          🔄 Đặt lại góc nhìn
        </button>
      </div>

      {/* Floating 3D Tooltip Card */}
      {tooltip && (
        <div
          className="map3d-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltip.x + 18}px`,
            top: `${tooltip.y - 45}px`,
            pointerEvents: 'none',
            zIndex: 100,
            minWidth: tooltip.isStation ? '260px' : '210px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          }}
        >
          {tooltip.isStation ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>📡 {tooltip.stationName}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{tooltip.stationCode}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#cbd5e1' }}>
                <div><b style={{ color: '#94a3b8' }}>Khu vực:</b> {tooltip.district}</div>
                <div><b style={{ color: '#94a3b8' }}>Nhiệt độ LST:</b> <span style={{ color: '#f87171', fontWeight: 700 }}>{tooltip.lst} °C</span></div>
                <div><b style={{ color: '#94a3b8' }}>Chỉ số NDVI:</b> <span style={{ color: '#4ade80', fontWeight: 600 }}>{tooltip.ndvi}</span></div>
                <div><b style={{ color: '#94a3b8' }}>Chỉ số TVDI:</b> <span style={{ color: '#fbbf24', fontWeight: 600 }}>{tooltip.tvdi}</span></div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                  {tooltip.desc}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="map3d-tooltip-header">
                <span className="map3d-tooltip-name">{tooltip.wardName}</span>
                <span className="map3d-tooltip-sub">(Phường/Xã)</span>
              </div>
              <div className="map3d-tooltip-body">
                <div className="map3d-tooltip-row">
                  <span className="map3d-tooltip-label">
                    {tooltip.indicator === 'LST' ? 'Nhiệt độ LST:' : tooltip.indicator === 'NDVI' ? 'Chỉ số NDVI:' : 'Chỉ số TVDI:'}
                  </span>
                  <span className="map3d-tooltip-val">
                    {tooltip.val} {tooltip.indicator === 'LST' ? '°C' : ''}
                  </span>
                </div>
                <div className="map3d-tooltip-row">
                  <span className="map3d-tooltip-label">Độ cao khối 3D:</span>
                  <span className="map3d-tooltip-pct">{tooltip.pct}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3D View Helper Hint */}
      <div className="map3d-hint">
        <span>💡 Giữ chuột trái & kéo để xoay 360° | Chuột phải để di chuyển | Cuộn để phóng to/thu nhỏ | Di chuột vào Trạm / Phường để xem thông tin</span>
      </div>
    </div>
  );
}
