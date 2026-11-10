// 카카오 지도·Leaflet 지도가 함께 쓰는 색, 여백, 핀 모양

export const COLORS = {
  route: '#2563eb',
  routeCaution: '#f5b301',
  routeDanger: '#e5484d',
  routeOther: '#94a3b8',
  accident: '#e5484d',
  zoneFail: '#f08c00',
  childZone: '#12a594',
  elderZone: '#8e4ec6',
};

// routeSegments의 level(0 보통 / 1 주의 / 2 위험) 순서
export const SEGMENT_COLORS = [COLORS.route, COLORS.routeCaution, COLORS.routeDanger];

export const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

// 경로 전체 보기 여백: 모바일은 하단 시트(약 48%)에 가리지 않게 아래를 크게
export function fitPadding() {
  if (isMobile()) {
    return { top: 72, right: 32, bottom: Math.round(window.innerHeight * 0.48), left: 32 };
  }
  return { top: 56, right: 56, bottom: 56, left: 56 };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function spotPopupHtml(spot) {
  return `<strong>${escapeHtml(spot.spot_nm || '사고다발지역')}</strong><br/>사고 ${escapeHtml(
    spot.occrrnc_cnt || 0
  )}건 · ${escapeHtml(spot.year || '')}년`;
}

export function zonePopupHtml(zone) {
  const label = zone.type === 'elder' ? '노인보호구역' : '어린이보호구역';
  return `<strong>${escapeHtml(zone.name)}</strong><br/>${label}`;
}

export const endpointHtml = (label, kind) => `<div class="endpoint-pin ${kind}"><span>${label}</span></div>`;

export const hazardHtml = (num, kind, selected) =>
  `<div class="hazard-pin ${kind} ${selected ? 'selected' : ''}">${num}</div>`;

export const zoneHtml = (zone) => `<div class="zone-pin ${zone.type === 'elder' ? 'elder' : 'child'}"></div>`;

export function spotLatLng(spot) {
  const lat = parseFloat(spot.la_crd);
  const lng = parseFloat(spot.lo_crd);
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : [lat, lng];
}

export function zoneLatLng(zone) {
  const lat = parseFloat(zone.lat);
  const lng = parseFloat(zone.lng);
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : [lat, lng];
}
