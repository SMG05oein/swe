import { useState, useEffect, useRef } from 'react';
import './MapView.css';
import Icon from './Icon';
import { CHEONAN_CENTER } from '../data/regions';
import { COLORS } from './map/mapShared';
import { createLeafletEngine } from './map/leafletEngine';
import { createKakaoEngine } from './map/kakaoEngine';
import { getKakaoMapKey, loadKakaoMaps } from './map/kakaoSdk';

// 카카오 키(VITE_KAKAO_MAP_KEY)가 있으면 카카오 지도, 없거나 못 불러오면 OpenStreetMap
export default function MapView({
  spots = [],
  hazards = [],
  protectionZones = [],
  routePath = null,
  routeSegments = null,
  altRoutePath = null,
  onSelectOtherRoute,
  origin = null,
  destination = null,
  selectedHazard = null,
  onSelectHazard,
  onMapClick,
  pickMode = null,
  showAccidents = true,
  onToggleAccidents,
  currentRegion = 'shinbu',
  regionPresets,
}) {
  const mapRef = useRef(null);
  const [engine, setEngine] = useState(null);
  const [fallbackNote, setFallbackNote] = useState('');

  const [showChildZones, setShowChildZones] = useState(true);
  const [showElderZones, setShowElderZones] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return undefined;
    let cancelled = false;
    let created = null;

    const start = (factory) => {
      if (cancelled) return;
      created = factory(container, CHEONAN_CENTER);
      setEngine(created);
    };
    const startLeaflet = () => {
      if (window.L) start(createLeafletEngine);
    };

    const kakaoKey = getKakaoMapKey();
    if (kakaoKey) {
      loadKakaoMaps(kakaoKey)
        .then(() => start(createKakaoEngine))
        .catch((err) => {
          if (cancelled) return;
          console.warn('[MapView] 카카오 지도 대신 OpenStreetMap 사용:', err.message);
          setFallbackNote('카카오 지도를 불러오지 못해 기본 지도로 보여드려요');
          startLeaflet();
        });
    } else {
      startLeaflet();
    }

    return () => {
      cancelled = true;
      created?.destroy();
      setEngine(null);
    };
  }, []);

  useEffect(() => {
    if (!engine || !onMapClick) return undefined;
    return engine.onClick((point) => {
      setLayersOpen(false);
      onMapClick(point);
    });
  }, [engine, onMapClick]);

  useEffect(() => {
    const target = regionPresets?.[currentRegion];
    if (engine && target) engine.flyTo(target.lat, target.lng, target.zoom || 15);
  }, [engine, currentRegion, regionPresets]);

  // 사고다발지역 (전체)
  useEffect(() => {
    engine?.setSpots(showAccidents ? spots || [] : []);
  }, [engine, spots, showAccidents]);

  // 보호구역
  useEffect(() => {
    if (!engine) return;
    engine.setZones(
      (protectionZones || []).filter((zone) => (zone.type === 'elder' ? showElderZones : showChildZones))
    );
  }, [engine, protectionZones, showChildZones, showElderZones]);

  // 경로 + 출발/도착
  useEffect(() => {
    engine?.setRoute({
      path: routePath,
      segments: routeSegments,
      altPath: altRoutePath,
      origin,
      destination,
      onSelectOther: onSelectOtherRoute,
    });
  }, [engine, routePath, routeSegments, altRoutePath, origin, destination, onSelectOtherRoute]);

  // 경로 위 위험 지점 (번호 핀)
  useEffect(() => {
    engine?.setHazards(hazards || [], selectedHazard?.id, onSelectHazard);
  }, [engine, hazards, selectedHazard, onSelectHazard]);

  // 선택 지점으로 이동
  useEffect(() => {
    if (engine && selectedHazard) engine.focus(selectedHazard.lat, selectedHazard.lng);
  }, [engine, selectedHazard]);

  useEffect(() => {
    engine?.setPickCursor(Boolean(pickMode));
  }, [engine, pickMode]);

  const childZonesCount = (protectionZones || []).filter((z) => z.type !== 'elder').length;
  const elderZonesCount = (protectionZones || []).filter((z) => z.type === 'elder').length;

  const layerItems = [
    { key: 'child', label: '어린이보호구역', count: childZonesCount, color: COLORS.childZone, on: showChildZones, toggle: () => setShowChildZones((p) => !p) },
    { key: 'elder', label: '노인보호구역', count: elderZonesCount, color: COLORS.elderZone, on: showElderZones, toggle: () => setShowElderZones((p) => !p) },
    { key: 'accident', label: '사고다발지역', count: spots.length, color: COLORS.accident, on: showAccidents, toggle: () => onToggleAccidents?.(!showAccidents) },
  ];

  return (
    <section className={`map-section ${pickMode ? 'picking' : ''} engine-${engine?.name || 'loading'}`}>
      <div ref={mapRef} className="map-container" />

      {fallbackNote && (
        <div className="map-engine-note" role="status">
          <span>{fallbackNote}</span>
          <button type="button" aria-label="안내 닫기" onClick={() => setFallbackNote('')}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {pickMode && (
        <div className="map-pick-hint" role="status">
          <span className={`place-dot ${pickMode}`} />
          지도를 눌러 {pickMode === 'origin' ? '출발지' : '도착지'}를 정하세요
        </div>
      )}

      <div className="map-controls top">
        <div className="layer-control">
          <button
            type="button"
            className={`map-btn ${layersOpen ? 'active' : ''}`}
            aria-label="지도 레이어"
            aria-expanded={layersOpen}
            title="지도 레이어"
            onClick={() => setLayersOpen((v) => !v)}
          >
            <Icon name="layers" size={20} />
          </button>
          {layersOpen && (
            <div className="popover layer-popover">
              <p className="popover-title">지도에 표시</p>
              {layerItems.map((item) => (
                <label key={item.key} className="layer-row">
                  <span className="layer-swatch" style={{ background: item.color }} />
                  <span className="layer-label">{item.label}</span>
                  <span className="layer-count">{item.count}</span>
                  <input type="checkbox" className="switch" checked={item.on} onChange={item.toggle} />
                </label>
              ))}
              <div className="menu-divider" />
              <p className="popover-title">경로</p>
              <div className="legend-row"><span className="legend-line" style={{ background: COLORS.route }} />선택한 경로</div>
              <div className="legend-row"><span className="legend-line" style={{ background: COLORS.routeCaution }} />점검 미달 보호구역 구간</div>
              <div className="legend-row"><span className="legend-line" style={{ background: COLORS.routeDanger }} />사고다발지역 구간</div>
              <div className="legend-row"><span className="legend-line dashed" />다른 경로 (누르면 전환)</div>
              <div className="legend-row"><span className="legend-pin accident">1</span>사고다발지역</div>
              <div className="legend-row"><span className="legend-pin zone">2</span>점검 미달 보호구역</div>
            </div>
          )}
        </div>
        {routePath?.length > 0 && (
          <button type="button" className="map-btn" aria-label="경로 전체 보기" title="경로 전체 보기" onClick={() => engine?.fitRoute()}>
            <Icon name="fit" size={20} />
          </button>
        )}
      </div>

      <div className="map-controls bottom zoom-group">
        <button type="button" className="map-btn" aria-label="확대" onClick={() => engine?.zoomIn()}>
          <Icon name="plus" size={20} />
        </button>
        <button type="button" className="map-btn" aria-label="축소" onClick={() => engine?.zoomOut()}>
          <Icon name="minus" size={20} />
        </button>
      </div>
    </section>
  );
}
