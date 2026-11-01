import {
  countWithin,
  findTrafficLightsWithin,
} from '../api/facilitiesApi';
import { evaluateChecklist, DEFAULT_CHECKLIST_CONFIG } from '../domain/checklist';

function statusBadge(item, isElder) {
  if (item.status === 'unknown') {
    return { cls: 'unknown', text: '정보 없음' };
  }
  if (item.status === 'ok') {
    return { cls: 'good', text: isElder ? '안전 구비' : '확인됨' };
  }
  return { cls: 'warning', text: isElder ? '주의 필요' : '미확인' };
}

export default function ChecklistPanel({
  spot,
  facilities,
  checklistResult = null,
  config = DEFAULT_CHECKLIST_CONFIG,
  vulnerableType = 'child',
}) {
  if (!spot) return null;

  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  const radius = spot.radius || 150;
  const isElder = vulnerableType === 'elder';

  if (!facilities || facilities.loading) {
    return (
      <div className="panel-card">
        <div className="card-title">안전 시설 점검</div>
        <p className="check-item-desc" style={{ marginTop: 8, color: '#38bdf8', fontWeight: 600 }}>
          주변 안전시설 데이터를 분석하는 중입니다...
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
        safetyFence: countWithin(facilities.safetyFence, lat, lng, radius),
        yellowCarpet: countWithin(facilities.yellowCarpet, lat, lng, radius),
        schoolZoneCamera: countWithin(facilities.schoolZoneCamera, lat, lng, radius),
        acousticSignal: countWithin(facilities.acousticSignal, lat, lng, radius),
        floorLight: countWithin(facilities.floorLight, lat, lng, radius),
        barrierFree: countWithin(facilities.barrierFree, lat, lng, radius),
        smartShelter: countWithin(facilities.smartShelter, lat, lng, radius),
      },
      config,
      { persona: vulnerableType }
    );
  }

  const spotTitle = spot.spot_nm || spot.name || '선택 지점';
  const okItems = result.items.filter((i) => i.status === 'ok');
  const missingItems = result.items.filter((i) => i.status === 'missing');
  const unknownItems = result.items.filter((i) => i.status === 'unknown');

  return (
    <div className={`panel-card checklist-panel persona-${vulnerableType}`}>
      <div className="card-header-line">
        <div className="card-title">
          {spotTitle}
        </div>
        <span className={`badge-status ${result.grade === 'pass' ? 'good' : 'warning'}`}>
          {result.grade === 'pass' ? '기준 충족 (안심)' : '주의 구역 (점검 미달)'}
        </span>
      </div>

      <div className="checklist-subhead">
        <span className="checklist-score-tag">
          종합 안전 점수 <strong>{result.score}점</strong> (합격 기준 {result.threshold}점)
        </span>
        <span className="checklist-persona-tag">
          {isElder ? '어르신 맞춤 지표' : '어린이 맞춤 지표'} {result.iteration ? `(${result.iteration}단계)` : ''}
        </span>
      </div>

      <p className="check-item-desc" style={{ margin: '8px 0 12px' }}>
        {isElder
          ? '보행 신호 여유와 계단 없는 무장애 이동을 위한 필수 설비 현황입니다.'
          : '스쿨존 시야 확보와 돌발 횡단 사고를 예방하는 안전 설비 현황입니다.'}
      </p>

      {missingItems.length > 0 && (
        <div className="checklist-group warning-group" style={{ marginBottom: 12 }}>
          <div className="checklist-group-title" style={{ color: '#fbbf24', fontSize: '12.5px', fontWeight: 700, marginBottom: 6 }}>
            {isElder ? '보행 시 각별한 주의가 필요한 시설' : '운전자 시야 및 주의가 필요한 결측 시설'} ({missingItems.length}개)
          </div>
          <div className="checklist-list">
            {missingItems.map((item) => {
              const badge = statusBadge(item, isElder);
              return (
                <div className="check-item" key={item.id}>
                  <div className="check-item-info">
                    <div className="check-item-title">{item.label}</div>
                    <div className="check-item-desc">
                      반경 {radius}m 내 미설치 확인 · 배점 {item.weight}점
                    </div>
                  </div>
                  <span className={`badge-status ${badge.cls}`}>{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {okItems.length > 0 && (
        <div className="checklist-group good-group" style={{ marginBottom: 12 }}>
          <div className="checklist-group-title" style={{ color: '#34d399', fontSize: '12.5px', fontWeight: 700, marginBottom: 6 }}>
            설치 확인된 안심 보호 시설 ({okItems.length}개)
          </div>
          <div className="checklist-list">
            {okItems.map((item) => {
              const badge = statusBadge(item, isElder);
              return (
                <div className="check-item" key={item.id}>
                  <div className="check-item-info">
                    <div className="check-item-title">{item.label}</div>
                    <div className="check-item-desc">
                      반경 {radius}m 내 구비됨 · 가점 {item.weight}점 충족
                    </div>
                  </div>
                  <span className={`badge-status ${badge.cls}`}>{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unknownItems.length > 0 && (
        <div className="checklist-group unknown-group">
          <div className="checklist-group-title" style={{ color: '#94a3b8', fontSize: '12px', marginBottom: 4 }}>
            공공데이터 미제공 항목 (점수 감점 없음)
          </div>
          <div className="checklist-list">
            {unknownItems.map((item) => (
              <div className="check-item" key={item.id} style={{ opacity: 0.75 }}>
                <div className="check-item-info">
                  <div className="check-item-title">{item.label}</div>
                  <div className="check-item-desc">지자체 공공데이터 미기재</div>
                </div>
                <span className="badge-status unknown">정보 없음</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
