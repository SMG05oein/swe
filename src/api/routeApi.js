/**
 * Pedestrian routing via OSRM geometry + walking-speed ETA.
 * Public OSRM "foot" durations are often car-like; we recompute ETA from distance.
 */

/** meters per second */
const WALK_SPEED = {
  child: 1.1, // ~4.0 km/h with guardian
  elder: 0.9, // ~3.2 km/h
  default: 1.25, // ~4.5 km/h
};

function toOsrmCoords(points) {
  return points.map((p) => `${p.lng},${p.lat}`).join(';');
}

export function estimateWalkDuration(distanceMeters, vulnerableType = 'child') {
  const speed = WALK_SPEED[vulnerableType] || WALK_SPEED.default;
  return distanceMeters / speed;
}

/**
 * @param {{lat:number,lng:number}[]} waypoints
 * @param {{vulnerableType?: string}} [options]
 */
export async function fetchPedestrianRoute(waypoints, options = {}) {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('출발지와 도착지가 필요합니다.');
  }

  const coords = toOsrmCoords(waypoints);
  const url =
    `/api/osrm/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`경로 조회 실패 (HTTP ${res.status})`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error(data.message || '보행 경로를 찾지 못했습니다.');
  }

  const route = data.routes[0];
  const coordsLngLat = route.geometry?.coordinates || [];
  const path = coordsLngLat.map(([lng, lat]) => [lat, lng]);
  const distance = route.distance;
  const duration = estimateWalkDuration(distance, options.vulnerableType);

  return {
    path,
    distance,
    duration,
    osrmDuration: route.duration,
    profile: 'foot',
    etaSource: 'walk_speed',
    raw: data,
  };
}
