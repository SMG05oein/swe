import { formatDistance, formatDuration } from '../domain/routeGrade';
import './RouteCompare.css';

export default function RouteCompare({
  primary,
  alternative,
  active = 'primary',
  onSelect,
}) {
  if (!primary || !alternative) return null;

  return (
    <section className="route-compare">
      <h3>경로 비교</h3>
      <p className="rc-help">카드를 누르면 지도에 표시할 경로를 바꿉니다. (보행 예상 시간)</p>
      <div className="rc-grid">
        <button
          type="button"
          className={`rc-card ${active === 'primary' ? 'active' : ''}`}
          onClick={() => onSelect?.('primary')}
        >
          <div className="rc-label">기본 경로</div>
          <div>{formatDistance(primary.distance)}</div>
          <div>{formatDuration(primary.duration)}</div>
          <div>위험 {primary.hazardCount}곳</div>
        </button>
        <button
          type="button"
          className={`rc-card alt ${active === 'alt' ? 'active' : ''}`}
          onClick={() => onSelect?.('alt')}
        >
          <div className="rc-label">회피 경로</div>
          <div>{formatDistance(alternative.distance)}</div>
          <div>{formatDuration(alternative.duration)}</div>
          <div>위험 {alternative.hazardCount}곳</div>
        </button>
      </div>
    </section>
  );
}
