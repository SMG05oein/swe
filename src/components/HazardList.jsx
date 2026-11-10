import Icon from './Icon';
import { hazardKindLabel, hazardMeta } from './hazardFormat';

export default function HazardList({ hazards, selectedId, onSelect, routeLabel }) {
  if (!hazards?.length) return null;

  return (
    <section className="hazard-section">
      <h3 className="section-title">
        {routeLabel}의 위험 지점 <span className="count">{hazards.length}</span>
      </h3>
      <ol className="hazard-list">
        {hazards.map((h, i) => (
          <li key={h.id}>
            <button
              type="button"
              className={`hazard-row ${selectedId === h.id ? 'selected' : ''}`}
              onClick={() => onSelect(h)}
            >
              <span className={`hazard-num ${h.kind}`}>{i + 1}</span>
              <span className="hazard-text">
                <span className="hazard-name">{h.name}</span>
                <span className="hazard-meta">
                  <span className={`hazard-kind ${h.kind}`}>{hazardKindLabel(h)}</span>
                  {hazardMeta(h)}
                </span>
              </span>
              <Icon name="chevron" size={16} className="hazard-chevron" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
