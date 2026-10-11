import {
  countWithin,
  findProtectionZonesWithin,
  findTrafficLightsWithin,
} from '../api/facilitiesApi';

function Row({ title, desc, ok, okText, badText }) {
  return (
    <div className="check-item">
      <div className="check-item-info">
        <div className="check-item-title">{title}</div>
        <div className="check-item-desc">{desc}</div>
      </div>
      <span className={`badge-status ${ok ? 'good' : 'warning'}`}>
        {ok ? okText : badText}
      </span>
    </div>
  );
}

export default function ChecklistPanel({ spot, facilities }) {
  if (!spot) return null;

  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  const radius = spot.radius || 300;

  if (!facilities || facilities.loading) {
    return (
      <div className="panel-card">
        <div className="card-title">주변 안전시설 현황</div>
        <p className="check-item-desc" style={{ marginTop: 8, color: '#38bdf8', fontWeight: 600 }}>
          공공데이터포털 안전시설 데이터를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  const cctv = countWithin(facilities.cctv, lat, lng, radius);
  const bump = countWithin(facilities.speedBump, lat, lng, radius);

  // 어린이보호구역
  const nearbyChildZones = findProtectionZonesWithin(
    facilities.protectionZones,
    lat,
    lng,
    radius
  );
  const hasChildZone = nearbyChildZones.length > 0;
  const childZoneCctvCount = nearbyChildZones.reduce((acc, z) => acc + z.cctvCount, 0);

  // 노인보호구역
  const nearbyElderZones = findProtectionZonesWithin(
    facilities.elderProtectionZones,
    lat,
    lng,
    radius
  );
  const hasElderZone = nearbyElderZones.length > 0;

  // 신호등 데이터 (보행신호등 & 잔여시간표시기)
  const trafficLightInfo = findTrafficLightsWithin(
    facilities.trafficLights,
    lat,
    lng,
    radius
  );

  return (
    <div className="panel-card">
      <div className="card-header-line">
        <div className="card-title">주변 안전시설 현황 (반경 {radius}m)</div>
        {spot.year && (
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
            {spot.year}년 통계
          </span>
        )}
      </div>
      {facilities.message && (
        <p className="check-item-desc" style={{ marginBottom: 8, color: '#f59e0b' }}>
          {facilities.message}
        </p>
      )}
      <div className="checklist-list">
        {cctv !== null && (
          <Row
            title="CCTV (행안부 CCTV정보)"
            desc={cctv > 0 ? `${cctv}대 확인` : '반경 내 등록된 CCTV 없음 (사각지대 위험)'}
            ok={cctv > 0}
            okText="설치"
            badText="미등록"
          />
        )}
        {bump !== null && (
          <Row
            title="과속방지턱 (행안부 과속방지턱정보)"
            desc={bump > 0 ? `${bump}개 확인` : '반경 내 등록된 과속방지턱 없음 (감속 유도 부족)'}
            ok={bump > 0}
            okText="설치"
            badText="미등록"
          />
        )}

        <Row
          title="보행신호등 / 잔여시간표시기 (전국신호등표준데이터)"
          desc={
            trafficLightInfo.total > 0
              ? `신호기 ${trafficLightInfo.total}개소 (보행신호등 ${trafficLightInfo.pedestrianCount}개, 잔여시간표시 ${trafficLightInfo.countdownCount}개)`
              : '반경 내 표준데이터상 신호기 미등록 (신호 없는 이면도로)'
          }
          ok={trafficLightInfo.pedestrianCount > 0}
          okText={trafficLightInfo.countdownCount > 0 ? '보행·잔여시간 운용' : '보행신호 운용'}
          badText="신호기 미배치"
        />

        <Row
          title="어린이보호구역 (행안부 전국어린이보호구역표준데이터)"
          desc={
            hasChildZone
              ? `${nearbyChildZones.map((z) => `${z.name}(${z.distance}m)`).slice(0, 2).join(', ')} 등 ${nearbyChildZones.length}개소 (전용 CCTV ${childZoneCctvCount}대)`
              : '반경 내 공공데이터포털 등록 어린이보호구역 없음'
          }
          ok={hasChildZone}
          okText="스쿨존 지정"
          badText="스쿨존 미지정"
        />

        <Row
          title="노인보호구역 (행안부 전국노인장애인보호구역 표준데이터)"
          desc={
            hasElderZone
              ? `${nearbyElderZones.map((z) => `${z.name}(${z.distance}m)`).slice(0, 2).join(', ')} 등 ${nearbyElderZones.length}개소 지정`
              : '반경 내 등록된 노인보호구역 없음 (실버존 취약)'
          }
          ok={hasElderZone}
          okText="실버존 지정"
          badText="실버존 미지정"
        />
      </div>
    </div>
  );
}
