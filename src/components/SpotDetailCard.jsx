export default function SpotDetailCard({ spot, onOpenDetail }) {
  if (!spot) {
    return (
      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
        지도에서 지점을 선택해 주세요.
      </div>
    );
  }

  const categoryTag =
    spot.category === 'elder'
      ? '고령 보행자'
      : spot.category === 'violation'
      ? spot.violation_name || '법규위반'
      : '어린이보호구역';

  const badgeClass =
    spot.category || (spot.violation_name ? 'violation' : 'child');

  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  const occ = parseInt(spot.occrrnc_cnt, 10) || 0;
  const cas = parseInt(spot.caslt_cnt, 10) || 0;
  const severe =
    (parseInt(spot.dth_dnv_cnt, 10) || 0) + (parseInt(spot.se_dnv_cnt, 10) || 0);

  return (
    <>
      <div className="panel-card">
        <div className="card-header-line">
          <div className="card-title">지점 상세 프로필</div>
          <span className={`tag ${badgeClass}`}>{categoryTag}</span>
        </div>

        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
          {spot.spot_nm}
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
          좌표: EPSG:4326 ({!isNaN(lat) ? lat.toFixed(5) : '-'}, {!isNaN(lng) ? lng.toFixed(5) : '-'}) · 반경 {spot.radius || 300}m
        </div>

        <div className="stat-grid">
          <div className="stat-box">
            <div className="stat-label">사고 건수</div>
            <div className="stat-number total">{spot.occrrnc_cnt}건</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">사망자</div>
            <div className="stat-number death">{spot.dth_dnv_cnt || 0}명</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">중상자</div>
            <div className="stat-number severe">{spot.se_dnv_cnt || 0}명</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">경상자</div>
            <div className="stat-number slight">{spot.sl_dnv_cnt || 0}명</div>
          </div>
        </div>

        <button
          className="btn-open-detail"
          style={{
            width: '100%',
            marginTop: '14px',
            padding: '11px 16px',
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9px',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
            transition: 'all 0.15s ease',
          }}
          onClick={() => onOpenDetail && onOpenDetail(spot)}
        >
          <span>🔍</span>
          <span>세부 심층 분석 모달 열기 (원인·시설 진단)</span>
        </button>
      </div>

      <div className="panel-card">
        <div className="card-header-line">
          <div className="card-title">사고 통계 요약 (API 수치 기반)</div>
        </div>

        <div className="checklist-list">
          <div className="check-item">
            <div className="check-item-info">
              <div className="check-item-title">구분</div>
              <div className="check-item-desc">
                {spot.violation_name
                  ? `법규위반 유형: ${spot.violation_name} (API 분류코드 ${spot.afos_id})`
                  : spot.category_name || categoryTag}
              </div>
            </div>
          </div>
          <div className="check-item">
            <div className="check-item-info">
              <div className="check-item-title">사고 1건당 사상자</div>
              <div className="check-item-desc">
                {occ > 0 ? `${(cas / occ).toFixed(2)}명` : '-'}
              </div>
            </div>
          </div>
          <div className="check-item">
            <div className="check-item-info">
              <div className="check-item-title">사망·중상 비율</div>
              <div className="check-item-desc">
                {cas > 0 ? `${Math.round((severe / cas) * 100)}% (${severe}/${cas}명)` : '-'}
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.6, marginTop: 10 }}>
          TAAS 천안시 실제사고 원표 109건 분석 및 전국신호등·보호구역 표준데이터가 연동되었습니다.
          상단의 <b>세부 심층 분석</b> 버튼을 눌러 법규위반, 도로형태 및 AI 행동수칙을 확인하세요.
        </p>
      </div>
    </>
  );
}
