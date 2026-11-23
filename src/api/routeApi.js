/**
 * Pedestrian routing via FOSSGIS OSRM foot graph + walking-speed ETA.
 * Proxied as /api/osrm → routing.openstreetmap.de/routed-foot
 * (router.project-osrm.org serves driving geometry even for /foot/)
 *
 * Route contract (Part 4 handoff object):
 * @typedef {Object} Route
 * @property {[number, number][]} path LatLng pairs [lat, lng]
 * @property {number} distance Meters
 * @property {number} duration Walking ETA seconds (persona speed)
 * @property {number} osrmDuration Raw OSRM duration seconds
 * @property {'foot'} profile
 * @property {'walk_speed'} etaSource
 * @property {object} raw OSRM JSON payload
 */

/** meters per second */
const WALK_SPEED = {
  child: 1.1, // ~4.0 km/h with guardian
  elder: 0.9, // ~3.2 km/h
  default: 1.25, // ~4.5 km/h
};

/** Reject backends that clearly returned a car-like ETA (km/h). */
const MAX_FOOT_BACKEND_KMH = 12;

function toOsrmCoords(points) {
  return points.map((p) => `${p.lng},${p.lat}`).join(';');
}

export function estimateWalkDuration(distanceMeters, vulnerableType = 'child') {
  const speed = WALK_SPEED[vulnerableType] || WALK_SPEED.default;
  return distanceMeters / speed;
}

function assertFootLikeBackend(distanceMeters, osrmDurationSec) {
  if (!osrmDurationSec || osrmDurationSec <= 0 || !distanceMeters) return;
  const kmh = (distanceMeters / osrmDurationSec) * 3.6;
  if (kmh > MAX_FOOT_BACKEND_KMH) {
    throw new Error(
      '보행 경로 서버가 자동차 속도로 응답했습니다. 프록시 설정을 확인하세요.'
    );
  }
}

/**
 * @param {{lat:number,lng:number}[]} waypoints
 * @param {{vulnerableType?: string}} [options]
 * @returns {Promise<Route>}
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
  assertFootLikeBackend(distance, route.duration);
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
