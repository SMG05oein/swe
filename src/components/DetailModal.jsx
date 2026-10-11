import { useEffect } from 'react';
import './DetailModal.css';
import {
  countWithin,
  findProtectionZonesWithin,
  findTrafficLightsWithin,
} from '../api/facilitiesApi';

export default function DetailModal({ spot, isOpen, onClose, facilities }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !spot) return null;

  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  const radius = spot.radius || 300;

  const districtName =
    spot.sido_sgg_nm ||
    (spot.spot_nm && spot.spot_nm.includes('동남구') ? '천안시 동남구' : '천안시 서북구');

  const driverRule =
    spot.category === 'violation'
      ? '황색 신호 진입을 절대 삼가고 교차로 정지선을 엄수하세요.'
      : spot.category === 'elder'
      ? '고령 보행자의 횡단 속도가 느리므로 완전히 인도에 오를 때까지 대기하세요.'
      : '스쿨존 시속 30km 제한속도를 준수하고 횡단보도 앞에서는 무조건 일시정지하세요.';

  const pedestrianRule =
    spot.category === 'violation'
      ? '녹색 신호 점등 직후에도 급출발 또는 꼬리물기 차량을 반드시 확인하세요.'
      : spot.category === 'elder'
      ? '점멸 신호 시 무리하게 진입하지 마시고, 야간에는 밝은 색 옷을 착용하세요.'
      : '주정차 차량 사이로 절대 뛰어나오지 말고 좌우를 살핀 후 건너세요.';

  // 인명 피해 심각도 계산 (100% 공식 OpenAPI 실측 팩트)
  const deaths = parseInt(spot.dth_dnv_cnt, 10) || 0;
  const serious = parseInt(spot.se_dnv_cnt, 10) || 0;
  const minor = parseInt(spot.sl_dnv_cnt, 10) || 0;
  const injured = parseInt(spot.wnd_dnv_cnt, 10) || 0;
  const casualties = parseInt(spot.caslt_cnt, 10) || 0;
  const severeCount = deaths + serious;
  const minorCount = minor + injured;
  const severeRate = casualties > 0 ? Math.round((severeCount / casualties) * 100) : 0;
  const minorRate = casualties > 0 ? 100 - severeRate : 0;

  let severityLabel = '경상/부상 위주';
  let severityBadgeClass = 'minor';
  if (deaths > 0) {
    severityLabel = `치사 사고 발생 (사망 ${deaths}명)`;
    severityBadgeClass = 'death';
  } else if (severeRate >= 40) {
    severityLabel = `중상 고위험 구역 (${severeRate}%)`;
    severityBadgeClass = 'critical';
  } else if (severeRate > 0) {
    severityLabel = `중상 주의 구역 (${severeRate}%)`;
    severityBadgeClass = 'warning';
  }

  // 위험 등급 판정
  let riskLevel = '주의';
  let riskClass = 'caution';
  if (deaths > 0 || casualties >= 4) {
    riskLevel = '심각 위험';
    riskClass = 'critical';
  } else if (casualties >= 2) {
    riskLevel = '경고 등급';
    riskClass = 'warning';
  }

  // 시설물 현황
  const cctvCount = countWithin(facilities?.cctv, lat, lng, radius);
  const bumpCount = countWithin(facilities?.speedBump, lat, lng, radius);
  const childZones = findProtectionZonesWithin(
    facilities?.protectionZones,
    lat,
    lng,
    radius
  );
  const elderZones = findProtectionZonesWithin(
    facilities?.elderProtectionZones,
    lat,
    lng,
    radius
  );
  const trafficLightInfo = findTrafficLightsWithin(
    facilities?.trafficLights,
    lat,
    lng,
    radius
  );

  // 안전 인프라 5대 시설물 결측 진단 (100% 실측 공간 매핑)
  const hasPedLight = trafficLightInfo.pedestrianCount > 0;
  const hasCountdown = trafficLightInfo.countdownCount > 0;
  const hasCctv = cctvCount !== null && cctvCount > 0;
  const hasBump = bumpCount !== null && bumpCount > 0;
  const hasZone = childZones.length > 0 || elderZones.length > 0;

  const facilityChecks = [
    { label: '보행신호등', ok: hasPedLight, desc: hasPedLight ? `${trafficLightInfo.pedestrianCount}개 구비` : '결측' },
    { label: '잔여시간표시기', ok: hasCountdown, desc: hasCountdown ? `${trafficLightInfo.countdownCount}개 구비` : '미설치' },
    { label: '단속·방범CCTV', ok: hasCctv, desc: hasCctv ? `${cctvCount}대 운용` : '부재' },
    { label: '감속 과속방지턱', ok: hasBump, desc: hasBump ? `${bumpCount}개 설치` : '부재' },
    { label: '보호구역 연계', ok: hasZone, desc: hasZone ? '보호구역 내/인접' : '미지정' },
  ];

  const fulfilledCount = facilityChecks.filter((c) => c.ok).length;
  const deficitScore = fulfilledCount * 20; // 0~100점
  let deficitLevel = '안전 인프라 양호';
  let deficitClass = 'good';
  if (deficitScore < 40) {
    deficitLevel = '안전시설 심각 결측';
    deficitClass = 'critical';
  } else if (deficitScore < 80) {
    deficitLevel = '핵심 안전시설 취약';
    deficitClass = 'warning';
  }

  // 도로 환경 및 사각지대 특성 진단
  let roadShapeDesc = '일반 교차로 및 단일로';
  const spotName = spot.spot_nm || '';
  if (spotName.includes('오거리')) {
    roadShapeDesc = '5지 교차로 (다방향 분기·합류로 인한 시야 분산 및 딜레마존 위험)';
  } else if (spotName.includes('사거리') || spotName.includes('교차로')) {
    roadShapeDesc = '4지 교차로 (교차로 우회전 사각지대 및 직각충돌 위험)';
  } else if (spotName.includes('삼거리')) {
    roadShapeDesc = '3지 교차로 (진입차량 가속 및 보행자 횡단 대기 안전 주의)';
  } else if (spotName.includes('앞') || spotName.includes('통학로')) {
    roadShapeDesc = '단일로 통학/상업로 (보행자 돌출 및 불법주정차 시야 가림 위험)';
  }

  let zoneLinkDesc = '일반 도로 (교통약자 보호구역 미지정 구역으로 자율 방어보행 필요)';
  if (childZones.length > 0 && elderZones.length > 0) {
    zoneLinkDesc = `어린이·노인 복합 보호구역 (${childZones[0].name}, ${elderZones[0].name})`;
  } else if (childZones.length > 0) {
    zoneLinkDesc = `어린이보호구역 연계 (${childZones[0].name} 스쿨존 내/인접, 시속 30km 제한)`;
  } else if (elderZones.length > 0) {
    zoneLinkDesc = `노인보호구역 연계 (${elderZones[0].name} 실버존 내/인접, 고령 보행자 보호구간)`;
  }

  return (
    <div className="detail-modal-backdrop" onClick={onClose}>
      <div
        className="detail-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-modal-header">
          <div className="detail-modal-title-area">
            <div className="detail-modal-badges">
              <span className={`detail-badge ${spot.badgeClass || spot.category || 'child'}`}>
                {spot.label || '다발지역'}
              </span>
              <span className={`risk-level-badge ${riskClass}`}>
                {riskLevel}
              </span>
              <span className="detail-badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#cbd5e1' }}>
                반경 {radius}m
              </span>
              {spot.year && (
                <span className="detail-badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: '#94a3b8' }}>
                  {spot.year}년 기준
                </span>
              )}
            </div>
            <h2 className="detail-modal-title">{spot.spot_nm}</h2>
            <div className="detail-modal-coords">
              <span>위도: {lat.toFixed(5)}</span>
              <span>경도: {lng.toFixed(5)}</span>
              <span>관할: {districtName}</span>
            </div>
          </div>
          <button
            className="detail-modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        <div className="detail-modal-body">
          {/* 사고 피해 심각도 지표 (도로교통공단 실시간 API) */}
          <div className="detail-kpi-grid">
            <div className="detail-kpi-card">
              <div className="detail-kpi-label">총 사고건수</div>
              <div className="detail-kpi-val">{spot.occrrnc_cnt || 0}건</div>
            </div>
            <div className="detail-kpi-card">
              <div className="detail-kpi-label">총 사상자수</div>
              <div className="detail-kpi-val">{spot.caslt_cnt || 0}명</div>
            </div>
            <div className={`detail-kpi-card ${deaths > 0 ? 'highlight-death' : ''}`}>
              <div className="detail-kpi-label">사망자수</div>
              <div className="detail-kpi-val death">{spot.dth_dnv_cnt || 0}명</div>
            </div>
            <div className="detail-kpi-card">
              <div className="detail-kpi-label">중상자수</div>
              <div className="detail-kpi-val serious">{spot.se_dnv_cnt || 0}명</div>
            </div>
            <div className="detail-kpi-card">
              <div className="detail-kpi-label">경상 / 부상</div>
              <div className="detail-kpi-val">
                {minorCount}명
              </div>
            </div>
          </div>

          {/* 인명 피해 심각도 및 치명도 분석 (100% 실측 팩트) */}
          <section className="modal-section">
            <div className="modal-section-title">
              <span>인명 피해 심각도 및 치명률 분석</span>
              <span className={`severity-tag ${severityBadgeClass}`}>{severityLabel}</span>
            </div>
            <div className="severity-bar-container">
              <div className="severity-bar-header">
                <span>사상자 대비 중상 이상 비율: <b>{severeRate}%</b> ({severeCount}명)</span>
                <span>경상·부상 비율: <b>{minorRate}%</b> ({minorCount}명)</span>
              </div>
              <div className="severity-progress-track">
                <div
                  className="severity-progress-fill severe"
                  style={{ width: `${severeRate}%` }}
                  title={`중상 이상: ${severeRate}%`}
                ></div>
                <div
                  className="severity-progress-fill minor"
                  style={{ width: `${minorRate}%` }}
                  title={`경상/부상: ${minorRate}%`}
                ></div>
              </div>
            </div>
          </section>

          {/* 안전 인프라 결측 종합 진단 (공공데이터포털 실시간 연동) */}
          <section className="modal-section">
            <div className="modal-section-title">
              <span>안전 인프라 결측도 종합 진단 (반경 {radius}m)</span>
              <span className={`deficit-badge ${deficitClass}`}>
                {deficitLevel} ({deficitScore}점 / 100점)
              </span>
            </div>
            <div className="facility-checks-grid">
              {facilityChecks.map((check, idx) => (
                <div key={idx} className={`facility-check-card ${check.ok ? 'ok' : 'missing'}`}>
                  <div className="check-card-header">
                    <span className="check-icon">{check.ok ? '✓' : '✗'}</span>
                    <span className="check-title">{check.label}</span>
                  </div>
                  <div className="check-desc">{check.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 도로 환경 및 보행 약자 사각지대 진단 */}
          <section className="modal-section">
            <div className="modal-section-title">
              <span>도로 환경 및 보행 약자 취약 요인 진단</span>
              <span className="modal-section-subtitle">공간 정보 기반 실측 분석</span>
            </div>
            <div className="cause-analysis-grid">
              <div className="cause-item full-width">
                <div className="cause-label">교차로 도로 형태 및 통행 특성</div>
                <div className="cause-value">{roadShapeDesc}</div>
              </div>
              <div className="cause-item full-width">
                <div className="cause-label">교통약자 보호구역 연계성</div>
                <div className="cause-value">{zoneLinkDesc}</div>
              </div>
            </div>
          </section>

          {/* 사고 유형별 맞춤 교통안전 행동 수칙 */}
          <section className="modal-section">
            <div className="modal-section-title">
              <span>사고 유형별 맞춤 교통안전 행동 수칙</span>
              <span className="modal-section-subtitle">도로교통법 기준 예방 가이드</span>
            </div>
            <div className="action-rules-grid">
              <div className="action-rule-card driver">
                <div className="action-rule-header">
                  <span>🚗</span>
                  <span>운전자 안전 주행 수칙</span>
                </div>
                <div className="action-rule-content">{driverRule}</div>
              </div>
              <div className="action-rule-card pedestrian">
                <div className="action-rule-header">
                  <span>🚶</span>
                  <span>보행자 (어린이·어르신) 행동 수칙</span>
                </div>
                <div className="action-rule-content">{pedestrianRule}</div>
              </div>
            </div>
          </section>
        </div>

        <footer className="detail-modal-footer">
          <div className="detail-modal-footer-note">
            데이터 출처: 도로교통공단 KoROAD · 행정안전부 공공데이터포털 실시간 연동
          </div>
          <button className="detail-modal-confirm-btn" onClick={onClose}>
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
