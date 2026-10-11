import './GNB.css';
import { YEAR_OPTIONS } from '../api/trafficApi';

export default function GNB({
  statusMsg,
  isMockMode,
  onOpenSettings,
  currentRegion = 'shinbu',
  onSelectRegion,
  currentYear = 'ALL',
  onSelectYear,
}) {
  return (
    <header className="gnb-header">
      <div className="gnb-left">
        <span className="brand-badge">TAAS &amp; OPEN DATA</span>
        <h1 className="gnb-title">교통약자 안전 인텔리전스</h1>
        <div className="region-selector">
          <button
            type="button"
            className={`region-btn ${currentRegion === 'shinbu' ? 'active' : ''}`}
            onClick={() => onSelectRegion?.('shinbu')}
          >
            신부동
          </button>
          <button
            type="button"
            className={`region-btn ${currentRegion === 'dujeong' ? 'active' : ''}`}
            onClick={() => onSelectRegion?.('dujeong')}
          >
            두정동
          </button>
        </div>

        <div className="year-selector-wrap">
          <span className="year-selector-icon">📅</span>
          <select
            className="year-select"
            value={currentYear}
            onChange={(e) => onSelectYear?.(e.target.value)}
            aria-label="통계 기준 연도 선택"
          >
            {YEAR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="gnb-right">
        <div className="status-indicator">
          <span className={`status-dot ${isMockMode ? 'mock' : ''}`}></span>
          <span>{statusMsg}</span>
        </div>

        <button className="btn-settings" onClick={onOpenSettings}>
          API 키 설정
        </button>
      </div>
    </header>
  );
}
