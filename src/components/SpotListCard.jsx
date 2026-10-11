export default function SpotListCard({
  spots,
  selectedSpot,
  onSelectSpot,
}) {
  return (
    <div className="panel-card">
      <div className="card-header-line">
        <div className="card-title">사고다발 구역 목록 ({spots.length})</div>
      </div>
      {spots.map((spot, idx) => (
        <div
          key={spot.afos_fid || idx}
          className={`spot-card-item ${
            selectedSpot?.afos_fid === spot.afos_fid ? 'selected' : ''
          }`}
          onClick={() => onSelectSpot({ ...spot, _t: Date.now() })}
        >
          <div className="spot-item-header">
            <span className="spot-item-name">{spot.spot_nm}</span>
            <span className={`tag ${spot.category || 'violation'}`}>
              {spot.occrrnc_cnt}건
            </span>
          </div>
          <div className="spot-item-sub">
            사상자 {spot.caslt_cnt}명 (사망 {spot.dth_dnv_cnt || 0} / 중상{' '}
            {spot.se_dnv_cnt || 0})
          </div>
        </div>
      ))}
    </div>
  );
}
