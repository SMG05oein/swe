import { useState, useEffect, useRef } from 'react';
import './MapView.css';
import { CHEONAN_CENTER } from '../data/regions';

export default function MapView({
  spots,
  onSelectSpot,
  selectedSpot,
  protectionZones = [],
  currentRegion = 'shinbu',
  regionPresets,
  onOpenDetail,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({ markers: [], circles: [], protectionMarkers: [] });

  // 레이어 및 범례 표시 온/오프 상태
  const [showChildZones, setShowChildZones] = useState(true);
  const [showElderZones, setShowElderZones] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // 글로벌 모달 핸들러 바인딩
  useEffect(() => {
    if (onOpenDetail) {
      window.__openSpotDetailModal = onOpenDetail;
    }
    return () => {
      delete window.__openSpotDetailModal;
    };
  }, [onOpenDetail]);

  // Leaflet 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [CHEONAN_CENTER.lat, CHEONAN_CENTER.lng],
      zoom: CHEONAN_CENTER.zoom || 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // 초기 레이아웃 완료 후 및 크기 변경 시 지도 크기 재계산
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (window.ResizeObserver && mapRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 권역 변경 시 해당 중심 좌표로 지도 이동
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentRegion || !regionPresets?.[currentRegion]) return;
    const target = regionPresets[currentRegion];
    map.flyTo([target.lat, target.lng], target.zoom || 15, {
      animate: true,
      duration: 1.0,
    });
  }, [currentRegion, regionPresets]);

  const markersMapRef = useRef(new Map());

  // 선택된 구역이 변경되면 해당 위치로 지도 부드럽게 이동 및 줌, 팝업 오픈
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSpot) return;

    const lat = parseFloat(selectedSpot.la_crd);
    const lng = parseFloat(selectedSpot.lo_crd);
    if (!isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 16, { animate: true, duration: 0.8 });

      const marker = markersMapRef.current.get(selectedSpot.afos_fid);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedSpot]);

  // 다발지점 마커 및 위험 반경 원 렌더링
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    // 기존 레이어 정리
    layersRef.current.markers.forEach((m) => m.remove());
    layersRef.current.circles.forEach((c) => c.remove());
    layersRef.current.markers = [];
    layersRef.current.circles = [];
    markersMapRef.current.clear();

    if (!spots || spots.length === 0) return;

    spots.forEach((spot) => {
      const lat = parseFloat(spot.la_crd);
      const lng = parseFloat(spot.lo_crd);
      if (isNaN(lat) || isNaN(lng)) return;

      const circleRadius = spot.radius || 300;
      const markerColor = spot.color || '#38bdf8';
      const isSelected = selectedSpot?.afos_fid === spot.afos_fid;

      const circle = L.circle([lat, lng], {
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: isSelected ? 0.22 : 0.12,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: isSelected ? null : '4, 4',
        radius: circleRadius,
      }).addTo(map);

      const markerHtml = `
        <div style="
          background: ${markerColor};
          color: #0f172a;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 0 12px ${markerColor}aa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s;
        ">
          ${spot.occrrnc_cnt || '!'}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-accident-marker',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-size: 13px; line-height: 1.5; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 4px;">
            <div style="font-weight: 700; color: ${markerColor};">${spot.spot_nm}</div>
            ${
              spot.year
                ? `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 10px; padding: 1px 5px; border-radius: 4px; font-weight: 800; white-space: nowrap;">${spot.year}년</span>`
                : ''
            }
          </div>
          <div>사고건수: <b>${spot.occrrnc_cnt}건</b> / 사상자: <b>${spot.caslt_cnt}명</b></div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">반경 ${circleRadius}m 다발권역 ${spot.year ? `· ${spot.year}년 확정 통계` : ''}</div>
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

  // 전국어린이보호구역 및 노인보호구역 마커 렌더링
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    layersRef.current.protectionMarkers.forEach((m) => m.remove());
    layersRef.current.protectionMarkers = [];

    if (!protectionZones || protectionZones.length === 0) return;

    protectionZones.forEach((zone) => {
      const isElder = zone.type === 'elder';
      // 실버존 및 어린이보호구역 온/오프 상태 반영
      if (isElder && !showElderZones) return;
      if (!isElder && !showChildZones) return;

      const lat = parseFloat(zone.lat);
      const lng = parseFloat(zone.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const bgColor = isElder ? '#f59e0b' : '#10b981';
      const borderColor = isElder ? '#78350f' : '#064e3b';
      const labelText = isElder ? '실' : '보';
      const typeTitle = isElder ? '노인보호구역 (실버존)' : '어린이보호구역 (스쿨존)';

      const zoneIconHtml = `
        <div style="
          background: ${bgColor};
          color: #ffffff;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid ${borderColor};
          box-shadow: 0 0 10px ${bgColor}aa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        ">${labelText}</div>
      `;

      const zoneIcon = L.divIcon({
        className: 'custom-protection-marker',
        html: zoneIconHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const zoneMarker = L.marker([lat, lng], { icon: zoneIcon }).addTo(map);

      const zonePopup = `
        <div style="font-size: 13px; line-height: 1.5;">
          <div style="font-weight: 700; color: ${bgColor}; margin-bottom: 4px;">[${typeTitle}] ${zone.name}</div>
          <div>시설구분: <b>${zone.kind}</b> · 관할: <b>${zone.policeStation || '천안경찰서'}</b></div>
          <div>CCTV 현황: <b>${zone.cctvYn ? `${zone.cctvCount}대 운용` : '미설치'}</b></div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">${zone.roadAddr || zone.lotAddr || ''}</div>
        </div>
      `;
      zoneMarker.bindPopup(zonePopup);
      layersRef.current.protectionMarkers.push(zoneMarker);
    });
  }, [protectionZones, showChildZones, showElderZones]);

  const childZonesCount = (protectionZones || []).filter((z) => z.type !== 'elder').length;
  const elderZonesCount = (protectionZones || []).filter((z) => z.type === 'elder').length;

  return (
    <section className="map-section">
      <div id="map-container" ref={mapRef} className="map-container"></div>

      {/* 실버존 · 어린이보호구역 · 범례 온/오프 토글 바 */}
      <div className="map-layer-toolbar">
        <button
          type="button"
          className={`map-toggle-chip ${showChildZones ? 'active child' : 'inactive'}`}
          onClick={() => setShowChildZones((prev) => !prev)}
          title="어린이보호구역(스쿨존) 마커 켜기/끄기"
        >
          <span className="chip-indicator child"></span>
          <span className="chip-text">어린이보호구역</span>
          <span className="chip-status-badge">{showChildZones ? 'ON' : 'OFF'}</span>
        </button>

        <button
          type="button"
          className={`map-toggle-chip ${showElderZones ? 'active elder' : 'inactive'}`}
          onClick={() => setShowElderZones((prev) => !prev)}
          title="노인보호구역(실버존) 마커 켜기/끄기"
        >
          <span className="chip-indicator elder"></span>
          <span className="chip-text">실버존</span>
          <span className="chip-status-badge">{showElderZones ? 'ON' : 'OFF'}</span>
        </button>

        <button
          type="button"
          className={`map-toggle-chip ${showLegend ? 'active legend' : 'inactive'}`}
          onClick={() => setShowLegend((prev) => !prev)}
          title="권역별 기준 범례 켜기/끄기"
        >
          <span className="chip-indicator legend"></span>
          <span className="chip-text">권역별 기준 범례</span>
          <span className="chip-status-badge">{showLegend ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* 권역별 기준 범례 (토글 연동) */}
      {showLegend && (
        <div className="map-legend">
          <div className="legend-header">
            <div className="legend-title">권역별 기준 범례</div>
            <button
              type="button"
              className="legend-close-btn"
              onClick={() => setShowLegend(false)}
              title="범례 숨기기"
              aria-label="범례 닫기"
            >
              ✕
            </button>
          </div>
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
            <div
              className={`legend-item clickable ${!showChildZones ? 'dimmed' : ''}`}
              onClick={() => setShowChildZones((prev) => !prev)}
              title="클릭하여 어린이보호구역 표시 토글"
            >
              <span
                className="legend-color"
                style={{ background: '#10b981', borderRadius: '4px' }}
              ></span>
              <span>
                어린이보호구역 스쿨존 ({childZonesCount}개소){' '}
                <span className={`legend-toggle-state ${showChildZones ? 'on' : 'off'}`}>
                  {showChildZones ? 'ON' : 'OFF'}
                </span>
              </span>
            </div>
            <div
              className={`legend-item clickable ${!showElderZones ? 'dimmed' : ''}`}
              onClick={() => setShowElderZones((prev) => !prev)}
              title="클릭하여 실버존 표시 토글"
            >
              <span
                className="legend-color"
                style={{ background: '#f59e0b', borderRadius: '4px' }}
              ></span>
              <span>
                노인보호구역 실버존 ({elderZonesCount}개소){' '}
                <span className={`legend-toggle-state ${showElderZones ? 'on' : 'off'}`}>
                  {showElderZones ? 'ON' : 'OFF'}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

