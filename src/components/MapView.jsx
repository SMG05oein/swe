import { useEffect, useRef } from 'react';
import './MapView.css';
import { CHEONAN_CENTER } from '../data/mockData';

export default function MapView({ spots, onSelectSpot, selectedSpot }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({ markers: [], circles: [] });

  // Leaflet 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [CHEONAN_CENTER.lat, CHEONAN_CENTER.lng],
      zoom: CHEONAN_CENTER.zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const markersMapRef = useRef(new Map());

  // 선택된 구역이 변경되면 해당 위치로 지도 부드럽게 이동 및 줌, 팝업 오픈
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSpot) return;

    const lat = parseFloat(selectedSpot.la_crd);
    const lng = parseFloat(selectedSpot.lo_crd);
    if (!isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });

      // 해당 마커 팝업 열기
      setTimeout(() => {
        const marker = markersMapRef.current.get(selectedSpot.afos_fid);
        if (marker) {
          marker.openPopup();
        }
      }, 300);
    }
  }, [selectedSpot]);

  // 마커 및 반경 원 렌더링
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    layersRef.current.markers.forEach((m) => m.remove());
    layersRef.current.circles.forEach((c) => c.remove());
    layersRef.current.markers = [];
    layersRef.current.circles = [];
    markersMapRef.current.clear();

    spots.forEach((spot) => {
      const lat = parseFloat(spot.la_crd);
      const lng = parseFloat(spot.lo_crd);
      if (isNaN(lat) || isNaN(lng)) return;

      const circleRadius = spot.radius || 300;
      const isSelected = selectedSpot?.afos_fid === spot.afos_fid;

      const circle = L.circle([lat, lng], {
        color: spot.color,
        fillColor: spot.color,
        fillOpacity: isSelected ? 0.28 : 0.15,
        radius: circleRadius,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: '4, 4',
      }).addTo(map);

      const iconHtml = `
        <div style="
          background: ${spot.color};
          width: ${isSelected ? '22px' : '18px'};
          height: ${isSelected ? '22px' : '18px'};
          border-radius: 50%;
          border: 3px solid #0f172a;
          box-shadow: 0 0 ${isSelected ? '20px' : '12px'} ${spot.color};
          cursor: pointer;
          transition: all 0.2s ease;
        "></div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-accident-marker',
        html: iconHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-size: 13px; line-height: 1.5;">
          <div style="font-weight: 700; color: ${spot.color}; margin-bottom: 4px;">[${spot.label}] ${spot.spot_nm}</div>
          <div>사고건수: <b>${spot.occrrnc_cnt}건</b> / 사상자: <b>${spot.caslt_cnt}명</b></div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">반경 ${circleRadius}m 다발권역</div>
        </div>
      `;
      marker.bindPopup(popupContent);

      if (isSelected) {
        marker.openPopup();
      }

      marker.on('click', () => {
        onSelectSpot({ ...spot, _t: Date.now() });
      });

      markersMapRef.current.set(spot.afos_fid, marker);
      layersRef.current.markers.push(marker);
      layersRef.current.circles.push(circle);
    });
  }, [spots, onSelectSpot, selectedSpot]);

  return (
    <section className="map-section">
      <div id="map-container" ref={mapRef} className="map-container"></div>

      <div className="map-legend">
        <div className="legend-title">권역별 기준 범례</div>
        <div className="legend-items">
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: '#38bdf8' }}
            ></span>
            <span>어린이 보호구역 다발지 (반경 300m)</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: '#f59e0b' }}
            ></span>
            <span>노인 · 고령보행 다발지 (반경 100m)</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: '#f43f5e' }}
            ></span>
            <span>신호위반 / 중앙선침범 다발지</span>
          </div>
        </div>
      </div>
    </section>
  );
}
