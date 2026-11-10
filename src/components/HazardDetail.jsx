import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { hazardKindLabel } from './hazardFormat';
import {
  countWithin,
  findProtectionZonesWithin,
  findTrafficLightsWithin,
} from '../api/facilitiesApi';
import { getSafetyTips } from '../api/aiApi';
import { evaluateChecklist, DEFAULT_CHECKLIST_CONFIG } from '../domain/checklist';

function facilityCounts(facilities, lat, lng, radius) {
  const lights = findTrafficLightsWithin(facilities?.trafficLights, lat, lng, radius);
  return {
    lights,
    counts: {
      cctv: countWithin(facilities?.cctv, lat, lng, radius),
      speedBump: countWithin(facilities?.speedBump, lat, lng, radius),
      pedestrianLight: lights.pedestrianCount,
      countdown: lights.countdownCount,
      safetyFence: countWithin(facilities?.safetyFence, lat, lng, radius),
      yellowCarpet: countWithin(facilities?.yellowCarpet, lat, lng, radius),
      schoolZoneCamera: countWithin(facilities?.schoolZoneCamera, lat, lng, radius),
      acousticSignal: countWithin(facilities?.acousticSignal, lat, lng, radius),
      floorLight: countWithin(facilities?.floorLight, lat, lng, radius),
      barrierFree: countWithin(facilities?.barrierFree, lat, lng, radius),
      smartShelter: countWithin(facilities?.smartShelter, lat, lng, radius),
    },
  };
}

function roadShapeOf(name = '') {
  if (name.includes('오거리')) return '5지 교차로';
  if (name.includes('사거리') || name.includes('교차로')) return '4지 교차로';
  if (name.includes('삼거리')) return '3지 교차로';
  if (name.includes('앞') || name.includes('통학로')) return '단일로 통학/상업로';
  return '일반 교차로 및 단일로';
}

function friendlyTipsError(err) {
  const msg = err?.message || '';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'AI 서버(localhost:8000)에 연결할 수 없습니다. 백엔드를 실행한 뒤 다시 시도하세요.';
  }
  return msg || '유의점을 만들지 못했습니다.';
}

const STATUS_ICON = { ok: 'check', missing: 'close', unknown: 'minus' };
const STATUS_TEXT = { ok: '있음', missing: '없음', unknown: '정보 없음' };

export default function HazardDetail({
  hazard,
  index,
  spot,
  facilities,
  checklistConfig = DEFAULT_CHECKLIST_CONFIG,
  vulnerableType = 'child',
  onBack,
}) {
  const [tips, setTips] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState('');
  const [tipsRetry, setTipsRetry] = useState(0);

  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  // 위험 지점의 점검 점수는 hazards.js가 반경 150m로 계산하므로 같은 반경으로 맞춤
  const radius = hazard?.checklist ? 150 : spot.radius || 150;

  const info = useMemo(() => {
    const { lights, counts } = facilityCounts(facilities, lat, lng, radius);
    const checklist =
      hazard?.checklist ||
      evaluateChecklist(counts, checklistConfig, { persona: vulnerableType });
    const zones = [
      ...findProtectionZonesWithin(facilities?.protectionZones, lat, lng, radius),
      ...findProtectionZonesWithin(facilities?.elderProtectionZones, lat, lng, radius),
    ];
    return { lights, counts, checklist, zones };
  }, [facilities, lat, lng, radius, hazard, checklistConfig, vulnerableType]);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      if (!mounted) return;
      setTipsLoading(true);
      setTips(null);
      setTipsError('');
      const { checklist, counts, lights, zones } = info;
      const spotName = spot.spot_nm || '';
      getSafetyTips({
        spot_nm: spot.spot_nm,
        category: vulnerableType,
        district:
          spot.sido_sgg_nm || (spotName.includes('동남구') ? '천안시 동남구' : '천안시 서북구'),
        year: spot.year || '2023',
        checklist_score: checklist.score,
        missing_labels: checklist.items.filter((i) => i.status === 'missing').map((i) => i.label),
        accident: spot._hazardKind === 'accident' || Number(spot.occrrnc_cnt) > 0,
        deaths: Number(spot.dth_dnv_cnt) || 0,
        serious: Number(spot.se_dnv_cnt) || 0,
        minor: (Number(spot.sl_dnv_cnt) || 0) + (Number(spot.wnd_dnv_cnt) || 0),
        casualties: Number(spot.caslt_cnt) || 0,
        occrrnc_cnt: Number(spot.occrrnc_cnt) || 0,
        road_shape: roadShapeOf(spotName),
        has_zone: zones.length > 0,
        cctv_count: counts.cctv || 0,
        bump_count: counts.speedBump || 0,
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
          setTipsError(friendlyTipsError(err));
          setTipsLoading(false);
        });
    }, 150);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [info, spot, vulnerableType, tipsRetry]);

  const { checklist, zones } = info;
  const isAccident = hazard?.kind === 'accident' || Number(spot.occrrnc_cnt) > 0;
  const deaths = parseInt(spot.dth_dnv_cnt, 10) || 0;
  const serious = parseInt(spot.se_dnv_cnt, 10) || 0;
  const minor = (parseInt(spot.sl_dnv_cnt, 10) || 0) + (parseInt(spot.wnd_dnv_cnt, 10) || 0);
  const passed = checklist.grade === 'pass';
  const sortedItems = [...checklist.items].sort((a, b) => {
    const order = { missing: 0, ok: 1, unknown: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <section className="detail-view">
      <header className="detail-header">
        <button type="button" className="icon-btn" aria-label="목록으로" onClick={onBack}>
          <Icon name="back" size={20} />
        </button>
        <span className="detail-header-title">위험 지점 상세</span>
      </header>

      <div className="detail-body">
        <div className="detail-title-block">
          <div className="detail-tags">
            {index != null && <span className={`hazard-num ${hazard?.kind}`}>{index + 1}</span>}
            {hazard && <span className={`hazard-kind ${hazard.kind}`}>{hazardKindLabel(hazard)}</span>}
            {spot.year && <span className="gd-tag">{spot.year}년</span>}
          </div>
          <h2 className="detail-title">{spot.spot_nm}</h2>
          {hazard && <p className="detail-sub">경로에서 {hazard.distanceToRoute}m</p>}
        </div>

        {isAccident && (
          <div className="gd-stats">
            <div className="gd-stat">
              <span className="gd-stat-label">사고</span>
              <span className="gd-stat-value">{Number(spot.occrrnc_cnt) || 0}<small>건</small></span>
            </div>
            <div className="gd-stat">
              <span className="gd-stat-label">사망</span>
              <span className={`gd-stat-value ${deaths ? 'danger' : ''}`}>{deaths}<small>명</small></span>
            </div>
            <div className="gd-stat">
              <span className="gd-stat-label">중상</span>
              <span className={`gd-stat-value ${serious ? 'warning' : ''}`}>{serious}<small>명</small></span>
            </div>
            <div className="gd-stat">
              <span className="gd-stat-label">경상</span>
              <span className="gd-stat-value">{minor}<small>명</small></span>
            </div>
          </div>
        )}

        <div className="detail-card">
          <div className="detail-card-head">
            <h3>안전시설 점검</h3>
            <span className={`grade-badge ${passed ? 'safe' : 'danger'}`}>{passed ? '기준 충족' : '기준 미달'}</span>
          </div>
          <div className="score-row">
            <span className="score-value">{checklist.score}<small>점</small></span>
            <span className="score-threshold">합격 기준 {checklist.threshold}점</span>
          </div>
          <div className="score-bar" aria-hidden="true">
            <span className={`score-fill ${passed ? 'safe' : 'danger'}`} style={{ width: `${Math.min(100, checklist.score)}%` }} />
            <span className="score-mark" style={{ left: `${Math.min(100, checklist.threshold)}%` }} />
          </div>
          <ul className="check-list">
            {sortedItems.map((item) => (
              <li key={item.id} className={`check-row ${item.status}`}>
                <span className="check-icon">
                  <Icon name={STATUS_ICON[item.status]} size={14} strokeWidth={2.4} />
                </span>
                <span className="check-label">{item.label}</span>
                <span className="check-status">{STATUS_TEXT[item.status]}</span>
              </li>
            ))}
          </ul>
          <p className="fine-print">점수는 반경 {radius}m 안의 시설 데이터로만 계산하며, AI가 바꾸지 않습니다. 정보가 없는 항목은 감점하지 않습니다.</p>
        </div>

        {zones.length > 0 && (
          <div className="detail-card">
            <h3>가까운 보호구역</h3>
            <ul className="zone-list">
              {zones.slice(0, 3).map((z) => (
                <li key={`${z.name}-${z.lat}`}>
                  <span className={`zone-dot ${z.type === 'elder' ? 'elder' : 'child'}`} />
                  <span className="zone-name">{z.name}</span>
                  <span className="zone-dist">{z.distance}m</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="detail-card">
          <div className="detail-card-head">
            <h3>
              <Icon name="sparkle" size={16} /> AI 유의점
            </h3>
            {tips?.source === 'ollama_ai' && (
              <span className="gd-tag">cheonan-safety{tips.risk_level ? ` · ${tips.risk_level}` : ''}</span>
            )}
          </div>
          {tipsLoading && (
            <div className="tips-loading">
              <span className="spinner" />
              유의점을 만드는 중입니다. 30~60초 걸릴 수 있습니다.
            </div>
          )}
          {!tipsLoading && tipsError && (
            <div className="tips-error">
              <p>{tipsError}</p>
              <button type="button" className="gd-btn" onClick={() => setTipsRetry((n) => n + 1)}>
                <Icon name="refresh" size={14} /> 다시 시도
              </button>
            </div>
          )}
          {!tipsLoading && tips && (
            <div className="tips-grid">
              <div>
                <h4>보호자</h4>
                <ul>
                  {(tips.guardianTips || []).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>{vulnerableType === 'elder' ? '어르신' : '어린이'}</h4>
                <ul>
                  {(tips.pedestrianTips || []).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
