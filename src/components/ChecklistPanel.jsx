import { countWithin, findProtectionZonesWithin } from '../api/facilitiesApi';

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
        <p className="check-item-desc" style={{ marginTop: 8 }}>
          공공데이터포털 시설물 데이터 조회 중...
        </p>
      </div>
    );
  }

  const cctv = countWithin(facilities.cctv, lat, lng, radius);
  const bump = countWithin(facilities.speedBump, lat, lng, radius);
  const nearbyZones = findProtectionZonesWithin(
    facilities.protectionZones,
    lat,
    lng,
    radius
  );
  const hasZone = nearbyZones.length > 0;
  const zoneCctvCount = nearbyZones.reduce((acc, z) => acc + z.cctvCount, 0);

  return (
    <div className="panel-card">
      <div className="card-header-line">
        <div className="card-title">주변 안전시설 현황 (반경 {radius}m)</div>
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
            desc={cctv > 0 ? `${cctv}대 확인` : '반경 내 등록된 CCTV 없음'}
            ok={cctv > 0}
            okText="설치"
            badText="미등록"
          />
        )}
        {bump !== null && (
          <Row
            title="과속방지턱 (행안부 과속방지턱정보)"
            desc={bump > 0 ? `${bump}개 확인` : '반경 내 등록된 과속방지턱 없음'}
            ok={bump > 0}
            okText="설치"
            badText="미등록"
          />
        )}
        <Row
          title="어린이보호구역 (행안부 전국어린이보호구역표준데이터)"
          desc={
            hasZone
              ? `${nearbyZones.map((z) => `${z.name}(${z.distance}m)`).slice(0, 2).join(', ')} 등 ${nearbyZones.length}개소 지정 (전용 CCTV ${zoneCctvCount}대)`
              : '반경 내 공공데이터포털 등록 어린이보호구역 없음'
          }
          ok={hasZone}
          okText="보호구역 지정"
          badText="보호구역 미지정"
        />
      </div>
    </div>
  );
}

