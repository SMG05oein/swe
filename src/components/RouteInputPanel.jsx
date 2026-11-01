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
  hazardCount = 0,
  onGoHazards,
}) {
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originHits, setOriginHits] = useState([]);
  const [destHits, setDestHits] = useState([]);

  const isChild = vulnerableType === 'child';

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
    <section className={`route-input-panel persona-${vulnerableType}`}>
      <div className="rip-header-block">
        <h2 className="rip-title">
          {isChild ? '어린이 안심 통학로 탐색' : '어르신 안심 보행길 탐색'}
        </h2>
        <p className="rip-sub">
          {isChild
            ? '스쿨존 우선 통학로 및 사각지대 위험을 분석합니다.'
            : '느린 걸음(초당 0.75m)과 계단 없는 평탄길을 우선 분석합니다.'}
        </p>
      </div>

      <div className="rip-type-row" role="group" aria-label="보행약자 선택">
        <button
          type="button"
          className={`rip-type child-btn ${isChild ? 'active' : ''}`}
          onClick={() => onVulnerableTypeChange('child')}
        >
          <span className="type-badge-text">어린이 (스쿨존)</span>
        </button>
        <button
          type="button"
          className={`rip-type elder-btn ${!isChild ? 'active' : ''}`}
          onClick={() => onVulnerableTypeChange('elder')}
        >
          <span className="type-badge-text">어르신 (실버존·무장애)</span>
        </button>
      </div>

      <div className="rip-form-group">
        <label className="rip-label">출발지 지정</label>
        <div className="rip-search">
          <input
            value={originQuery}
            onChange={(e) => setOriginQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch('origin', originQuery)}
            placeholder="출발 장소 검색 또는 지도 클릭"
            aria-label="출발지"
          />
          <button type="button" className="rip-btn-search" onClick={() => runSearch('origin', originQuery)}>
            검색
          </button>
          <button
            type="button"
            className={`rip-btn-pick ${pickMode === 'origin' ? 'active' : ''}`}
            onClick={() => onPickModeChange(pickMode === 'origin' ? null : 'origin')}
            title="지도에서 출발지 지정"
          >
            지도 선택
          </button>
        </div>
        {origin && <div className="rip-picked">출발: {origin.name}</div>}
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
      </div>

      <div className="rip-form-group">
        <label className="rip-label">도착지 지정</label>
        <div className="rip-search">
          <input
            value={destQuery}
            onChange={(e) => setDestQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch('dest', destQuery)}
            placeholder="도착 장소 검색 또는 지도 클릭"
            aria-label="도착지"
          />
          <button type="button" className="rip-btn-search" onClick={() => runSearch('dest', destQuery)}>
            검색
          </button>
          <button
            type="button"
            className={`rip-btn-pick ${pickMode === 'destination' ? 'active' : ''}`}
            onClick={() =>
              onPickModeChange(pickMode === 'destination' ? null : 'destination')
            }
            title="지도에서 도착지 지정"
          >
            지도 선택
          </button>
        </div>
        {destination && <div className="rip-picked">도착: {destination.name}</div>}
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
      </div>

      <div className="rip-actions">
        <button
          type="button"
          className="rip-primary"
          disabled={!origin || !destination || loading}
          onClick={onSearchRoute}
        >
          {loading ? '안전 경로 분석 중...' : '안전 보행 경로 분석'}
        </button>
        <button
          type="button"
          className="rip-secondary"
          disabled={!hasRoute || altLoading}
          onClick={onRequestAlt}
        >
          {altLoading ? '대체경로 계산 중...' : '위험 회피 안심경로'}
        </button>
      </div>

      {routeMeta && (
        <div className="rip-summary-card">
          <div className="rip-summary-head">
            <div className="rip-summary-stats">
              <span className="rip-stat-item">이동 거리 <strong>{routeMeta.distanceLabel}</strong></span>
              <span className="rip-stat-item">예상 시간 <strong>{routeMeta.durationLabel}</strong></span>
            </div>
            {routeGrade && (
              <span className={`rip-grade-pill ${routeGrade.className}`}>
                안전도: {routeGrade.label}
              </span>
            )}
          </div>

          <p className="rip-summary-advice">
            {isChild
              ? (routeGrade?.level === 'safe'
                  ? '경로 주변에 큰 위험 요소가 없는 안전한 통학로입니다.'
                  : '스쿨존 외곽 또는 주의 구역이 감지되었습니다. 횡단 시 손을 잡고 주의하세요.')
              : (routeGrade?.level === 'safe'
                  ? '보행 신호 시간이 넉넉하고 경사가 완만한 안심 경로입니다.'
                  : '계단 또는 신호시간이 촉박할 수 있는 횡단보도가 있습니다. 천천히 횡단하세요.')}
          </p>

          {onGoHazards && (
            <button type="button" className="rip-go-hazards-btn" onClick={onGoHazards}>
              경로 주변 위험 구역 ({hazardCount}곳) 확인하기 →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
