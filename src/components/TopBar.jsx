import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { YEAR_OPTIONS } from '../api/trafficApi';
import { REGION_PRESETS } from '../data/regions';

export default function TopBar({
  currentRegion,
  onSelectRegion,
  currentYear,
  onSelectYear,
  statusMsg,
  isSample,
  isLoading,
  onOpenKeys,
  onOpenIntro,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const yearLabel = YEAR_OPTIONS.find((o) => o.value === currentYear)?.label || currentYear;
  const statusClass = isLoading ? 'loading' : isSample ? 'sample' : 'live';

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-logo">
          <Icon name="shield" size={18} strokeWidth={2} />
        </span>
        <span className="topbar-title">안심 보행길</span>
      </div>

      <div className="segmented topbar-region" role="group" aria-label="권역 선택">
        {Object.values(REGION_PRESETS).map((r) => (
          <button
            key={r.id}
            type="button"
            className={currentRegion === r.id ? 'active' : ''}
            aria-pressed={currentRegion === r.id}
            onClick={() => onSelectRegion(r.id)}
          >
            {r.shortName}
          </button>
        ))}
      </div>

      <div className="topbar-right" ref={menuRef}>
        <span className={`data-status ${statusClass}`} title={statusMsg}>
          <span className="data-status-dot" />
          <span className="data-status-text">
            {isLoading ? '불러오는 중' : isSample ? '샘플 데이터' : `${yearLabel.split(' ')[0]} 데이터`}
          </span>
        </span>

        <button
          type="button"
          className="icon-btn"
          aria-label="설정"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name="settings" size={20} />
        </button>

        {menuOpen && (
          <div className="popover topbar-menu" role="menu">
            <label className="menu-field">
              <span className="menu-label">사고 통계 기준 연도</span>
              <select
                value={currentYear}
                onChange={(e) => onSelectYear(e.target.value)}
              >
                {YEAR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="menu-status">{statusMsg}</p>
            <div className="menu-divider" />
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setMenuOpen(false);
                onOpenIntro();
              }}
            >
              앱 소개 다시 보기
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setMenuOpen(false);
                onOpenKeys();
              }}
            >
              API 키 설정
            </button>
            <Link className="menu-item" to="/admin">
              관리자 페이지
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
