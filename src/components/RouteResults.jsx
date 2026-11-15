import { useEffect, useRef } from 'react';
import Icon from './Icon';
import { formatDistance, formatDuration } from '../domain/routeGrade';

function RouteCard({ title, route, active, onClick }) {
  return (
    <button
      type="button"
      className={`route-card ${active ? 'active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <div className="route-card-top">
        <span className={`grade-badge ${route.grade.className}`}>{route.grade.label}</span>
        <span className="route-card-title">{title}</span>
      </div>
      <div className="route-card-main">
        <span className="route-card-time">{formatDuration(route.duration).replace('약 ', '')}</span>
        <span className="route-card-meta">
          {formatDistance(route.distance)} · 위험 {route.hazardCount}곳
        </span>
      </div>
    </button>
  );
}

export default function RouteResults({
  primary,
  alternative,
  active,
  onSelect,
  onRequestAlt,
  altLoading,
  vulnerableType,
}) {
  const ref = useRef(null);

  // 모바일 하단 시트에서는 결과가 입력창 아래에 가려지므로 결과로 스크롤
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [primary?.distance]);

  if (!primary) return null;
  const walker = vulnerableType === 'elder' ? '어르신' : '어린이';

  return (
    <section className="route-results" ref={ref}>
      <p className="section-caption">보행 시간은 {walker} 걸음 기준입니다</p>
      <div className="route-cards">
        <RouteCard
          title="기본 경로"
          route={primary}
          active={active === 'primary'}
          onClick={() => onSelect('primary')}
        />
        {alternative && (
          <RouteCard
            title="위험 회피 경로"
            route={alternative}
            active={active === 'alt'}
            onClick={() => onSelect('alt')}
          />
        )}
        {!alternative && primary.hazardCount > 0 && (
          <button type="button" className="route-card ghost" onClick={onRequestAlt} disabled={altLoading}>
            <Icon name="route" size={18} />
            <span>{altLoading ? '회피 경로 계산 중…' : '위험 구역을 피하는 경로 찾기'}</span>
          </button>
        )}
      </div>
      {(primary.hazardCount > 0 || alternative?.hazardCount > 0) && (
        <div className="route-legend" aria-label="경로선 색 설명">
          <span><i className="swatch normal" />일반</span>
          <span><i className="swatch caution" />점검 미달 보호구역</span>
          <span><i className="swatch danger" />사고다발지역</span>
        </div>
      )}
      {primary.hazardCount === 0 && (
        <p className="route-note good">
          <Icon name="check" size={16} />
          경로 주변에 사고다발지역이나 점검 미달 보호구역이 없습니다.
        </p>
      )}
    </section>
  );
}
