/**
 * Grade a walking route from hazard count.
 * Defaults: 0 = safe, 1–2 = caution, 3+ = danger (admin-configurable).
 */
export function gradeRoute(hazardCount, config) {
  const safeMax = config?.routeGrade?.safeMax ?? 0;
  const cautionMax = config?.routeGrade?.cautionMax ?? 2;
  const n = Number(hazardCount) || 0;

  if (n <= safeMax) {
    return { level: 'safe', label: '안전', className: 'safe', count: n };
  }
  if (n <= cautionMax) {
    return { level: 'caution', label: '주의', className: 'caution', count: n };
  }
  return { level: 'danger', label: '위험', className: 'danger', count: n };
}

export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return '-';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '-';
  const m = Math.round(seconds / 60);
  if (m < 60) return `약 ${m}분`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `약 ${h}시간 ${rest}분` : `약 ${h}시간`;
}
