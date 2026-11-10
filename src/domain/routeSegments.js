import { distanceM } from '../api/facilitiesApi';

/** 구간 위험도: 0 = 일반, 1 = 주의(점검 미달 보호구역), 2 = 위험(사고다발지역) */
export const SEGMENT_LEVEL = { normal: 0, caution: 1, danger: 2 };

const STEP_METERS = 10;
const ZONE_RADIUS = 150; // 체크리스트 평가 반경과 동일

/** 꼭짓점 사이가 먼 직선 구간도 판정할 수 있도록 STEP_METERS 간격으로 점을 채움 */
function densify(path) {
  const out = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const [lat1, lng1] = path[i];
    const [lat2, lng2] = path[i + 1];
    const n = Math.max(1, Math.ceil(distanceM(lat1, lng1, lat2, lng2) / STEP_METERS));
    for (let k = 0; k < n; k += 1) {
      const t = k / n;
      out.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

function hazardReach(h) {
  const base = h.kind === 'accident' ? Number(h.spot?.radius) || 100 : ZONE_RADIUS;
  // 목록에 올라간 위험 지점은 경로에서 가장 가까운 부분이라도 반드시 색이 들어가게 함
  return Math.max(base, (h.distanceToRoute || 0) + 20);
}

/**
 * 경로를 위험도가 같은 연속 구간으로 나눔.
 * @returns {{ level: number, path: [number, number][] }[]}
 */
export function segmentRouteByHazards(path, hazards = []) {
  if (!path?.length) return [];
  if (!hazards.length || path.length < 2) return [{ level: SEGMENT_LEVEL.normal, path }];

  const targets = hazards.map((h) => ({
    lat: h.lat,
    lng: h.lng,
    reach: hazardReach(h),
    level: h.kind === 'accident' ? SEGMENT_LEVEL.danger : SEGMENT_LEVEL.caution,
  }));

  const points = densify(path);
  const levels = points.map(([lat, lng]) => {
    let level = SEGMENT_LEVEL.normal;
    for (const t of targets) {
      if (t.level > level && distanceM(lat, lng, t.lat, t.lng) <= t.reach) level = t.level;
    }
    return level;
  });

  const segments = [];
  let current = { level: levels[0], path: [points[0]] };
  for (let i = 1; i < points.length; i += 1) {
    current.path.push(points[i]);
    if (levels[i] !== current.level) {
      segments.push(current);
      // 경계점을 공유해 선이 끊기지 않게 함
      current = { level: levels[i], path: [points[i]] };
    }
  }
  if (current.path.length > 1) segments.push(current);
  return segments;
}
