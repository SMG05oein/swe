import './GNB.css';

export default function GNB({ statusMsg, isMockMode, onOpenSettings }) {
  return (
    <header className="gnb-header">
      <div className="gnb-left">
        <span className="brand-badge">TAAS &amp; OPEN DATA</span>
        <h1 className="gnb-title">
          교통약자 안전 인텔리전스
          <span className="gnb-location">천안시 신부동 집중 구역</span>
        </h1>
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
