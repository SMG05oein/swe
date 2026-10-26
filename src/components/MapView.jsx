import { useState, useEffect, useRef } from 'react';
import './MapView.css';
import { CHEONAN_CENTER } from '../data/regions';

export default function MapView({
  spots = [],
  hazards = [],
  protectionZones = [],
  routePath = null,
  altRoutePath = null,
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
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    markers: [],
    circles: [],
    protectionMarkers: [],
    hazardMarkers: [],
    routeLine: null,
    altLine: null,
    endpoints: [],
  });

  const [showChildZones, setShowChildZones] = useState(true);
  const [showElderZones, setShowElderZones] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

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
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (window.ResizeObserver && mapRef.current) {
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !onMapClick) return undefined;
    const handler = (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [onMapClick]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentRegion || !regionPresets?.[currentRegion]) return;
    const target = regionPresets[currentRegion];
    map.flyTo([target.lat, target.lng], target.zoom || 15, { animate: true, duration: 1.0 });
  }, [currentRegion, regionPresets]);

  // Accident spots
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    layersRef.current.markers.forEach((m) => m.remove());
    layersRef.current.circles.forEach((c) => c.remove());
    layersRef.current.markers = [];
    layersRef.current.circles = [];

    if (!showAccidents || !spots?.length) return;

    spots.forEach((spot) => {
      const lat = parseFloat(spot.la_crd);
      const lng = parseFloat(spot.lo_crd);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const color = spot.color || '#38bdf8';
      const circle = L.circle([lat, lng], {
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4',
        radius: spot.radius || 300,
      }).addTo(map);
      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      }).addTo(map);
      marker.bindPopup(`<b>${spot.spot_nm || '사고다발'}</b><br/>사고 ${spot.occrrnc_cnt || 0}건`);
      layersRef.current.markers.push(marker);
      layersRef.current.circles.push(circle);
    });
  }, [spots, showAccidents]);

  // Protection zones
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    layersRef.current.protectionMarkers.forEach((m) => m.remove());
    layersRef.current.protectionMarkers = [];

    (protectionZones || []).forEach((zone) => {
      const isElder = zone.type === 'elder';
      if (isElder && !showElderZones) return;
      if (!isElder && !showChildZones) return;
      const lat = parseFloat(zone.lat);
      const lng = parseFloat(zone.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const bg = isElder ? '#f59e0b' : '#10b981';
      const icon = L.divIcon({
        className: 'custom-protection-marker',
        html: `<div style="background:${bg};color:#fff;width:18px;height:18px;border-radius:5px;border:2px solid #0f172a;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">${isElder ? '실' : '보'}</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const m = L.marker([lat, lng], { icon }).addTo(map);
      m.bindPopup(`<b>${zone.name}</b>`);
      layersRef.current.protectionMarkers.push(m);
    });
  }, [protectionZones, showChildZones, showElderZones]);

  // Route polylines + endpoints
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (layersRef.current.routeLine) {
      layersRef.current.routeLine.remove();
      layersRef.current.routeLine = null;
    }
    if (layersRef.current.altLine) {
      layersRef.current.altLine.remove();
      layersRef.current.altLine = null;
    }
    layersRef.current.endpoints.forEach((m) => m.remove());
    layersRef.current.endpoints = [];

    if (routePath?.length) {
      layersRef.current.routeLine = L.polyline(routePath, {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
      map.fitBounds(layersRef.current.routeLine.getBounds(), { padding: [40, 40] });
    }

    if (altRoutePath?.length) {
      layersRef.current.altLine = L.polyline(altRoutePath, {
        color: '#10b981',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);
    }

    const addEndpoint = (point, label, color) => {
      if (!point) return;
      const m = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(map);
      m.bindTooltip(label, { permanent: false });
      layersRef.current.endpoints.push(m);
    };

    addEndpoint(origin, '출발', '#22c55e');
    addEndpoint(destination, '도착', '#ef4444');
  }, [routePath, altRoutePath, origin, destination]);

  // Hazard markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    layersRef.current.hazardMarkers.forEach((m) => m.remove());
    layersRef.current.hazardMarkers = [];

    (hazards || []).forEach((h) => {
      const selected = selectedHazard?.id === h.id;
      const m = L.circleMarker([h.lat, h.lng], {
        radius: selected ? 11 : 8,
        color: '#fff',
        weight: selected ? 3 : 2,
        fillColor: h.kind === 'accident' ? '#f43f5e' : '#f59e0b',
        fillOpacity: 0.95,
      }).addTo(map);
      m.bindPopup(`<b>${h.name}</b><br/>${h.reason}`);
      m.on('click', () => onSelectHazard?.(h));
      layersRef.current.hazardMarkers.push(m);
    });
  }, [hazards, selectedHazard, onSelectHazard]);

  const childZonesCount = (protectionZones || []).filter((z) => z.type !== 'elder').length;
  const elderZonesCount = (protectionZones || []).filter((z) => z.type === 'elder').length;

  const toggleAccidents = () => {
    onToggleAccidents?.(!showAccidents);
  };

  return (
    <section className={`map-section ${pickMode ? 'picking' : ''}`}>
      <div id="map-container" ref={mapRef} className="map-container" />
      {pickMode && (
        <div className="map-pick-hint">
          지도를 클릭해 {pickMode === 'origin' ? '출발지' : '도착지'}를 지정하세요
        </div>
      )}

      <div className="map-layer-toolbar">
        <button
          type="button"
          className={`map-toggle-chip ${showChildZones ? 'active child' : 'inactive'}`}
          onClick={() => setShowChildZones((p) => !p)}
        >
          <span className="chip-text">어린이보호구역</span>
          <span className="chip-status-badge">{showChildZones ? 'ON' : 'OFF'}</span>
        </button>
        <button
          type="button"
          className={`map-toggle-chip ${showElderZones ? 'active elder' : 'inactive'}`}
          onClick={() => setShowElderZones((p) => !p)}
        >
          <span className="chip-text">실버존</span>
          <span className="chip-status-badge">{showElderZones ? 'ON' : 'OFF'}</span>
        </button>
        <button
          type="button"
          className={`map-toggle-chip ${showAccidents ? 'active legend' : 'inactive'}`}
          onClick={toggleAccidents}
        >
          <span className="chip-text">사고다발지역</span>
          <span className="chip-status-badge">{showAccidents ? 'ON' : 'OFF'}</span>
        </button>
        <button
          type="button"
          className={`map-toggle-chip ${showLegend ? 'active legend' : 'inactive'}`}
          onClick={() => setShowLegend((p) => !p)}
        >
          <span className="chip-text">범례</span>
          <span className="chip-status-badge">{showLegend ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {showLegend && (
        <div className="map-legend">
          <div className="legend-header">
            <div className="legend-title">지도 범례</div>
            <button type="button" className="legend-close-btn" onClick={() => setShowLegend(false)}>
              X
            </button>
          </div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#38bdf8' }} />
              <span>기본 보행 경로</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#10b981' }} />
              <span>위험 회피 경로</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#f43f5e' }} />
              <span>경로 위험 구역</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#10b981', borderRadius: '4px' }} />
              <span>어린이보호구역 ({childZonesCount})</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#f59e0b', borderRadius: '4px' }} />
              <span>노인보호구역 ({elderZonesCount})</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
