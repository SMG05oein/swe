import './HazardList.css';

export default function HazardList({
  hazards,
  selectedId,
  onSelect,
  onInspectChecklist,
  vulnerableType = 'child',
  grade,
}) {
  const isChild = vulnerableType === 'child';

  return (
    <section className={`hazard-list persona-${vulnerableType}`}>
      <div className="hl-head">
        <div className="hl-title-group">
          <h3>{isChild ? '어린이 보행 주의 구역' : '어르신 보행 취약 구역'}</h3>
          <p className="hl-sub">
            {isChild
              ? '스쿨존 시야 가림 및 돌발 사고다발 지점입니다.'
              : '신호시간 부족 또는 계단·단차 위험이 있는 지점입니다.'}
          </p>
        </div>
        <div className="hl-badges">
          <span className="hl-count">{hazards?.length || 0}곳</span>
          {grade && <span className={`hl-grade ${grade.className}`}>{grade.label}</span>}
        </div>
      </div>

      {!hazards?.length ? (
        <div className="hl-empty-card">
          <p className="hl-empty-title">
            {isChild ? '안전한 보행로가 확인되었습니다.' : '안심하고 통행할 수 있는 평탄 경로입니다.'}
          </p>
          <p className="hl-empty-desc">
            현재 지정된 보행 경로 주변에 등록된 사고다발구역이나 시설 결측 보호구역이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="hl-cards-list">
          {hazards.map((h) => {
            const isSelected = selectedId === h.id;
            const isAccident = h.kind === 'accident';
            return (
              <li key={h.id} className={`hl-card-item ${isSelected ? 'selected' : ''}`}>
                <div
                  className="hl-card-body"
                  onClick={() => onInspectChecklist ? onInspectChecklist(h) : onSelect?.(h)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onInspectChecklist ? onInspectChecklist(h) : onSelect?.(h);
                    }
                  }}
                >
                  <div className="hl-row">
                    <strong className="hl-name">{h.name}</strong>
                    <span className={`hl-kind-badge ${isAccident ? 'accident' : 'zone'}`}>
                      {isAccident
                        ? (isChild ? '어린이 사고다발' : '고령자 사고다발')
                        : (isChild ? '스쿨존 점검미달' : '실버존 점검미달')}
                    </span>
                  </div>
                  <div className="hl-reason-text">
                    {h.reason}
                  </div>
                  <div className="hl-meta-row">
                    <span className="hl-distance">경로와의 거리 약 {h.distanceToRoute}m</span>
                    {h.checklist != null && (
                      <span className={`hl-checklist-score ${h.checklist.grade === 'pass' ? 'pass' : 'fail'}`}>
                        점검점수 {h.checklist.score}점
                      </span>
                    )}
                  </div>
                </div>

                <div className="hl-card-actions">
                  <button
                    type="button"
                    className="hl-btn-inspect"
                    onClick={() => onInspectChecklist ? onInspectChecklist(h) : onSelect?.(h)}
                  >
                    안전 점검표 보기
                  </button>
                  <button
                    type="button"
                    className="hl-btn-detail"
                    onClick={() => onSelect?.(h)}
                  >
                    전문 AI 진단
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
