import { useState } from 'react';
import { searchPlaces } from '../api/geocodeApi';
import './RouteInputPanel.css';

export default function RouteInputPanel({
  vulnerableType,
  onVulnerableTypeChange,
  origin,
  destination,
  onPickModeChange,
  pickMode,
  onSetOrigin,
  onSetDestination,
  onSearchRoute,
  onRequestAlt,
  loading,
  altLoading,
  routeMeta,
  routeGrade,
  hasRoute,
}) {
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originHits, setOriginHits] = useState([]);
  const [destHits, setDestHits] = useState([]);

  const runSearch = async (which, q) => {
    try {
      const hits = await searchPlaces(q);
      if (which === 'origin') setOriginHits(hits);
      else setDestHits(hits);
    } catch {
      if (which === 'origin') setOriginHits([]);
      else setDestHits([]);
    }
  };

  return (
    <section className="route-input-panel">
      <h2 className="rip-title">보행 경로 확인</h2>
      <p className="rip-sub">교통약자 유형과 출발·도착을 지정하세요.</p>

      <div className="rip-type-row">
        <button
          type="button"
          className={`rip-type ${vulnerableType === 'child' ? 'active' : ''}`}
          onClick={() => onVulnerableTypeChange('child')}
        >
          어린이
        </button>
        <button
          type="button"
          className={`rip-type ${vulnerableType === 'elder' ? 'active' : ''}`}
          onClick={() => onVulnerableTypeChange('elder')}
        >
          노인
        </button>
      </div>

      <label className="rip-label">출발지</label>
      <div className="rip-search">
        <input
          value={originQuery}
          onChange={(e) => setOriginQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch('origin', originQuery)}
          placeholder="장소 검색 또는 지도 클릭"
        />
        <button type="button" onClick={() => runSearch('origin', originQuery)}>
          검색
        </button>
        <button
          type="button"
          className={pickMode === 'origin' ? 'active' : ''}
          onClick={() => onPickModeChange(pickMode === 'origin' ? null : 'origin')}
          title="지도에서 출발지 지정"
        >
          지도
        </button>
      </div>
      {origin && <div className="rip-picked">{origin.name}</div>}
      {originHits.length > 0 && (
        <ul className="rip-hits">
          {originHits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onSetOrigin(h);
                  setOriginHits([]);
                  setOriginQuery(h.name.split(',')[0]);
                }}
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="rip-label">도착지</label>
      <div className="rip-search">
        <input
          value={destQuery}
          onChange={(e) => setDestQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch('dest', destQuery)}
          placeholder="장소 검색 또는 지도 클릭"
        />
        <button type="button" onClick={() => runSearch('dest', destQuery)}>
          검색
        </button>
        <button
          type="button"
          className={pickMode === 'destination' ? 'active' : ''}
          onClick={() =>
            onPickModeChange(pickMode === 'destination' ? null : 'destination')
          }
          title="지도에서 도착지 지정"
        >
          지도
        </button>
      </div>
      {destination && <div className="rip-picked">{destination.name}</div>}
      {destHits.length > 0 && (
        <ul className="rip-hits">
          {destHits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onSetDestination(h);
                  setDestHits([]);
                  setDestQuery(h.name.split(',')[0]);
                }}
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rip-actions">
        <button
          type="button"
          className="rip-primary"
          disabled={!origin || !destination || loading}
          onClick={onSearchRoute}
        >
          {loading ? '경로 탐색 중...' : '경로 분석'}
        </button>
        <button
          type="button"
          className="rip-secondary"
          disabled={!hasRoute || altLoading}
          onClick={onRequestAlt}
        >
          {altLoading ? '대체경로 계산 중...' : '위험 회피 경로'}
        </button>
      </div>

      {routeMeta && (
        <div className="rip-meta">
          <span>거리 {routeMeta.distanceLabel}</span>
          <span>소요 {routeMeta.durationLabel}</span>
          {routeGrade && (
            <span className={`rip-grade ${routeGrade.className}`}>{routeGrade.label}</span>
          )}
        </div>
      )}
    </section>
  );
}
