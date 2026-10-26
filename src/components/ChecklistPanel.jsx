import {
  countWithin,
  findTrafficLightsWithin,
} from '../api/facilitiesApi';
import { evaluateChecklist, DEFAULT_CHECKLIST_CONFIG } from '../domain/checklist';

function statusBadge(item) {
  if (item.status === 'unknown') return { cls: 'unknown', text: '정보 없음' };
  if (item.status === 'ok') return { cls: 'good', text: '확인' };
  return { cls: 'warning', text: '미확인' };
}

export default function ChecklistPanel({
  spot,
  facilities,
  checklistResult = null,
  config = DEFAULT_CHECKLIST_CONFIG,
}) {
  if (!spot) return null;

  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  const radius = spot.radius || 150;

  if (!facilities || facilities.loading) {
    return (
      <div className="panel-card">
        <div className="card-title">체크리스트</div>
        <p className="check-item-desc" style={{ marginTop: 8, color: '#38bdf8', fontWeight: 600 }}>
          안전시설 데이터를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  let result = checklistResult;
  if (!result) {
    const lights = findTrafficLightsWithin(facilities.trafficLights, lat, lng, radius);
    result = evaluateChecklist(
      {
        cctv: countWithin(facilities.cctv, lat, lng, radius),
        speedBump: countWithin(facilities.speedBump, lat, lng, radius),
        pedestrianLight: lights.pedestrianCount,
        countdown: lights.countdownCount,
      },
      config
    );
  }

  return (
    <div className="panel-card">
      <div className="card-header-line">
        <div className="card-title">체크리스트 ({result.score}점)</div>
        <span style={{ fontSize: '11px', color: result.grade === 'pass' ? '#34d399' : '#fbbf24' }}>
          {result.grade === 'pass' ? '기준 충족' : '기준 미달'}
        </span>
      </div>
      <p className="check-item-desc" style={{ marginBottom: 8 }}>
        데이터가 없는 항목은 감점하지 않고 정보 없음으로 표시합니다.
      </p>
      <div className="checklist-list">
        {result.items.map((item) => {
          const badge = statusBadge(item);
          return (
            <div className="check-item" key={item.id}>
              <div className="check-item-info">
                <div className="check-item-title">{item.label}</div>
                <div className="check-item-desc">
                  {item.status === 'unknown'
                    ? '공공데이터 없음 (감점 없음)'
                    : item.present
                    ? '반경 내 확인'
                    : '반경 내 미확인'}
                  {item.counted ? ` · 가중치 ${item.weight}` : ''}
                </div>
              </div>
              <span className={`badge-status ${badge.cls}`}>{badge.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
