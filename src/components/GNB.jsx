import './GNB.css';

export default function GNB({
  statusMsg,
  isMockMode,
  onOpenSettings,
  currentRegion = 'shinbu',
  onSelectRegion,
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
