import './HazardList.css';

export default function HazardList({ hazards, selectedId, onSelect, grade }) {
  return (
    <section className="hazard-list">
      <div className="hl-head">
        <h3>경로 주변 위험 구역</h3>
        <span className="hl-count">{hazards?.length || 0}곳</span>
        {grade && <span className={`hl-grade ${grade.className}`}>{grade.label}</span>}
      </div>
      {!hazards?.length ? (
        <p className="hl-empty">경로 주변에서 위험 구역이 감지되지 않았습니다.</p>
      ) : (
        <ul>
          {hazards.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className={selectedId === h.id ? 'active' : ''}
                onClick={() => onSelect?.(h)}
              >
                <div className="hl-row">
                  <strong>{h.name}</strong>
                  <span className="hl-kind">{h.kind === 'accident' ? '사고다발' : '보호구역'}</span>
                </div>
                <div className="hl-reason">{h.reason}</div>
                <div className="hl-meta">
                  경로까지 {h.distanceToRoute}m
                  {h.checklist != null && ` · 체크리스트 ${h.checklist.score}점`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
