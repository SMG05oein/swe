import { countWithin } from '../api/facilitiesApi';

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
        <div className="check-item">
          <div className="check-item-info">
            <div className="check-item-title">신호등 · 보호구역 기준</div>
            <div className="check-item-desc">
              API 미연동 (신호등 데이터 없음 / 경찰청 보호구역 승인 대기)
            </div>
          </div>
          <span className="badge-status warning">대기</span>
        </div>
      </div>
    </div>
  );
}
