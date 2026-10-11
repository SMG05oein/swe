import './SpotListCard.css';

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
      {spots.length === 0 ? (
        <div className="spot-empty-state">
          선택한 조건의 사고다발 구역 데이터가 없습니다.
        </div>
      ) : (
        spots.map((spot, idx) => {
          const itemKey =
            spot.uniqueKey ||
            `${spot.category || 'cat'}-${spot.year || 'yr'}-${spot.afos_fid || idx}`;
          const isSelected =
            (selectedSpot?.uniqueKey || selectedSpot?.afos_fid) ===
            (spot.uniqueKey || spot.afos_fid);

          const isElder = spot.category === 'elder';
          const typeLabel = isElder ? '노인 사고' : '어린이 사고';
          const typeBadgeClass = isElder ? 'badge-elder' : 'badge-child';
          const subTypeLabel = isElder
            ? '보행 노인'
            : spot.category === 'child_schoolzone'
            ? '어린이 보호구역'
            : '보행 어린이';

          return (
            <div
              key={itemKey}
              className={`spot-card-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSpot({ ...spot, _t: Date.now() })}
            >
              <div className="spot-item-header">
                <div className="spot-item-title-wrap">
                  <span className="spot-index-badge">No.{idx + 1}</span>
                  <span className={`spot-target-badge ${typeBadgeClass}`}>
                    {typeLabel}
                  </span>
                  <span className="spot-item-name" title={spot.spot_nm}>
                    {spot.spot_nm}
                  </span>
                </div>
                <div className="spot-item-badges">
                  {spot.year && (
                    <span className="spot-year-tag">{spot.year}년</span>
                  )}
                  <span className={`tag ${isElder ? 'elder' : 'child'}`}>
                    {spot.occrrnc_cnt}건
                  </span>
                </div>
              </div>
              <div className="spot-item-sub">
                <span className="spot-sub-type">{subTypeLabel}</span>
                <span className="spot-sub-divider">|</span>
                <span>
                  사상자 {spot.caslt_cnt}명 (사망 {spot.dth_dnv_cnt || 0} / 중상{' '}
                  {spot.se_dnv_cnt || 0})
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
