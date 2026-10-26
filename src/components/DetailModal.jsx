import { useState, useEffect } from 'react';
import './DetailModal.css';
import {
  countWithin,
  findProtectionZonesWithin,
  findTrafficLightsWithin,
} from '../api/facilitiesApi';
import { getSafetyTips } from '../api/aiApi';
import { evaluateChecklist, DEFAULT_CHECKLIST_CONFIG } from '../domain/checklist';

export default function DetailModal({
  spot,
  isOpen,
  onClose,
  facilities,
  checklistConfig = DEFAULT_CHECKLIST_CONFIG,
  precomputedChecklist = null,
  vulnerableType = 'child',
}) {
  const [tips, setTips] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState('');
  const [tipsRetry, setTipsRetry] = useState(0);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !spot) return undefined;
    let mounted = true;

    const timer = window.setTimeout(() => {
      if (!mounted) return;
      setTipsLoading(true);
      setTips(null);
      setTipsError('');

      const lat = parseFloat(spot.la_crd);
      const lng = parseFloat(spot.lo_crd);
      const radius = spot.radius || 150;
      const lights = findTrafficLightsWithin(facilities?.trafficLights, lat, lng, radius);
      const checklist =
        precomputedChecklist ||
        evaluateChecklist(
          {
            cctv: countWithin(facilities?.cctv, lat, lng, radius),
            speedBump: countWithin(facilities?.speedBump, lat, lng, radius),
            pedestrianLight: lights.pedestrianCount,
            countdown: lights.countdownCount,
          },
          checklistConfig
        );

      const missing = checklist.items
        .filter((i) => i.status === 'missing')
        .map((i) => i.label);
      const category = vulnerableType || spot.category || 'child';
      const cctv = countWithin(facilities?.cctv, lat, lng, radius);
      const bump = countWithin(facilities?.speedBump, lat, lng, radius);
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
      const spotName = spot.spot_nm || '';
      let roadShape = '일반 교차로 및 단일로';
      if (spotName.includes('오거리')) roadShape = '5지 교차로';
      else if (spotName.includes('사거리') || spotName.includes('교차로')) roadShape = '4지 교차로';
      else if (spotName.includes('삼거리')) roadShape = '3지 교차로';
      else if (spotName.includes('앞') || spotName.includes('통학로')) roadShape = '단일로 통학/상업로';

      getSafetyTips({
        spot_nm: spot.spot_nm,
        category,
        district:
          spot.sido_sgg_nm ||
          (spotName.includes('동남구') ? '천안시 동남구' : '천안시 서북구'),
        year: spot.year || '2023',
        checklist_score: checklist.score,
        missing_labels: missing,
        accident: spot._hazardKind === 'accident' || Number(spot.occrrnc_cnt) > 0,
        deaths: Number(spot.dth_dnv_cnt) || 0,
        serious: Number(spot.se_dnv_cnt) || 0,
        minor:
          (Number(spot.sl_dnv_cnt) || 0) + (Number(spot.wnd_dnv_cnt) || 0),
        casualties: Number(spot.caslt_cnt) || 0,
        occrrnc_cnt: Number(spot.occrrnc_cnt) || 0,
        road_shape: roadShape,
        has_zone: childZones.length > 0 || elderZones.length > 0,
        cctv_count: cctv || 0,
        bump_count: bump || 0,
        ped_light_count: lights.pedestrianCount || 0,
        countdown_count: lights.countdownCount || 0,
      })
        .then((res) => {
          if (!mounted) return;
          setTips(res);
          setTipsLoading(false);
        })
        .catch((err) => {
          if (!mounted) return;
          setTips(null);
          setTipsError(err?.message || '파인튜닝 모델 유의점 생성에 실패했습니다.');
          setTipsLoading(false);
        });
    }, 150);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [
    isOpen,
    spot,
    precomputedChecklist,
    checklistConfig,
    vulnerableType,
    facilities,
    tipsRetry,
  ]);

  if (!isOpen || !spot) return null;

  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  const radius = spot.radius || 150;
  const deaths = parseInt(spot.dth_dnv_cnt, 10) || 0;
  const serious = parseInt(spot.se_dnv_cnt, 10) || 0;
  const minor = (parseInt(spot.sl_dnv_cnt, 10) || 0) + (parseInt(spot.wnd_dnv_cnt, 10) || 0);
  const casualties = parseInt(spot.caslt_cnt, 10) || 0;

  const lights = findTrafficLightsWithin(facilities?.trafficLights, lat, lng, radius);
  const checklist =
    precomputedChecklist ||
    evaluateChecklist(
      {
        cctv: countWithin(facilities?.cctv, lat, lng, radius),
        speedBump: countWithin(facilities?.speedBump, lat, lng, radius),
        pedestrianLight: lights.pedestrianCount,
        countdown: lights.countdownCount,
      },
      checklistConfig
    );

  const childZones = findProtectionZonesWithin(facilities?.protectionZones, lat, lng, radius);
  const elderZones = findProtectionZonesWithin(
    facilities?.elderProtectionZones,
    lat,
    lng,
    radius
  );

  return (
    <div className="detail-modal-backdrop" onClick={onClose}>
      <div className="detail-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="detail-modal-header">
          <div className="detail-modal-title-area">
            <div className="detail-modal-badges">
              <span className={`detail-badge ${vulnerableType}`}>
                {vulnerableType === 'elder' ? '노인' : '어린이'}
              </span>
              <span className="detail-badge" style={{ background: 'rgba(100,116,139,0.2)', color: '#cbd5e1' }}>
                반경 {radius}m
              </span>
            </div>
            <h2 className="detail-modal-title">{spot.spot_nm}</h2>
            <div className="detail-modal-coords">
              <span>위도: {lat.toFixed(5)}</span>
              <span>경도: {lng.toFixed(5)}</span>
            </div>
          </div>
          <button className="detail-modal-close-btn" onClick={onClose} aria-label="닫기">
            X
          </button>
        </header>

        <div className="detail-modal-body">
          {(spot._hazardKind === 'accident' || casualties > 0 || Number(spot.occrrnc_cnt) > 0) && (
            <div className="detail-kpi-grid">
              <div className="detail-kpi-card">
                <div className="detail-kpi-label">사고건수</div>
                <div className="detail-kpi-val">{spot.occrrnc_cnt || 0}건</div>
              </div>
              <div className="detail-kpi-card">
                <div className="detail-kpi-label">사상자</div>
                <div className="detail-kpi-val">{casualties}명</div>
              </div>
              <div className="detail-kpi-card">
                <div className="detail-kpi-label">사망</div>
                <div className="detail-kpi-val death">{deaths}명</div>
              </div>
              <div className="detail-kpi-card">
                <div className="detail-kpi-label">중상</div>
                <div className="detail-kpi-val serious">{serious}명</div>
              </div>
              <div className="detail-kpi-card">
                <div className="detail-kpi-label">경상 등</div>
                <div className="detail-kpi-val">{minor}명</div>
              </div>
            </div>
          )}

          <section className="modal-section">
            <div className="modal-section-title">
              <span>체크리스트 결과</span>
              <span className={`deficit-badge ${checklist.grade === 'pass' ? 'good' : 'warning'}`}>
                {checklist.score}점 / 기준 {checklist.threshold}점
              </span>
            </div>
            <div className="facility-checks-grid">
              {checklist.items.map((item) => (
                <div
                  key={item.id}
                  className={`facility-check-card ${
                    item.status === 'ok' ? 'ok' : item.status === 'unknown' ? 'ok' : 'missing'
                  }`}
                >
                  <div className="check-card-header">
                    <span className="check-icon">
                      {item.status === 'ok' ? 'O' : item.status === 'unknown' ? '-' : 'X'}
                    </span>
                    <span className="check-title">{item.label}</span>
                  </div>
                  <div className="check-desc">
                    {item.status === 'unknown'
                      ? '정보 없음 (감점 없음)'
                      : item.present
                      ? '확인됨'
                      : '미확인'}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              AI는 점수를 변경할 수 없습니다. 위 점수는 시설 데이터로만 계산됩니다.
            </p>
          </section>

          {(childZones.length > 0 || elderZones.length > 0) && (
            <section className="modal-section">
              <div className="modal-section-title">
                <span>인근 보호구역</span>
              </div>
              <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                {[...childZones, ...elderZones]
                  .slice(0, 3)
                  .map((z) => `${z.name} (${z.distance}m)`)
                  .join(' · ')}
              </p>
            </section>
          )}

          <section className="modal-section">
            <div className="modal-section-title">
              <span>보호자 / 보행자 유의점</span>
              {tips?.source === 'ollama_ai' && (
                <span style={{ fontSize: 11, color: '#34d399' }}>
                  cheonan-safety{tips.risk_level ? ` · ${tips.risk_level}` : ''}
                </span>
              )}
            </div>
            {tipsLoading && (
              <p style={{ color: '#38bdf8' }}>
                파인튜닝 진단 형식으로 유의점 생성 중... (약 30~60초)
              </p>
            )}
            {!tipsLoading && tipsError && (
              <div style={{ color: '#fbbf24', fontSize: 13 }}>
                <p style={{ margin: '0 0 8px' }}>{tipsError}</p>
                <button
                  type="button"
                  className="btn-settings"
                  onClick={() => setTipsRetry((n) => n + 1)}
                >
                  다시 생성
                </button>
              </div>
            )}
            {!tipsLoading && tips && (
              <div className="ai-rules-grid">
                <div>
                  <h4 style={{ margin: '0 0 6px', color: '#e2e8f0', fontSize: 13 }}>보호자</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: 13 }}>
                    {(tips.guardianTips || []).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px', color: '#e2e8f0', fontSize: 13 }}>보행자</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: 13 }}>
                    {(tips.pedestrianTips || []).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
