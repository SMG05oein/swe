import {
  countWithin,
  findTrafficLightsWithin,
  distanceM,
} from '../api/facilitiesApi';
import { evaluateChecklist } from './checklist';

/** Min distance from a lat/lng to any vertex on a polyline (meters) */
export function distanceToRouteMeters(lat, lng, path) {
  if (!path?.length) return Infinity;
  let min = Infinity;
  for (let i = 0; i < path.length; i += 1) {
    const [plat, plng] = path[i];
    const d = distanceM(lat, lng, plat, plng);
    if (d < min) min = d;
  }
  return min;
}

function facilityCountsAt(facilities, lat, lng, radius = 150) {
  const lights = findTrafficLightsWithin(facilities?.trafficLights, lat, lng, radius);
  return {
    cctv: countWithin(facilities?.cctv, lat, lng, radius),
    speedBump: countWithin(facilities?.speedBump, lat, lng, radius),
    pedestrianLight: lights.pedestrianCount,
    countdown: lights.countdownCount,
    safetyFence: countWithin(facilities?.safetyFence, lat, lng, radius),
    yellowCarpet: countWithin(facilities?.yellowCarpet, lat, lng, radius),
    schoolZoneCamera: countWithin(facilities?.schoolZoneCamera, lat, lng, radius),
    acousticSignal: countWithin(facilities?.acousticSignal, lat, lng, radius),
    floorLight: countWithin(facilities?.floorLight, lat, lng, radius),
    barrierFree: countWithin(facilities?.barrierFree, lat, lng, radius),
    smartShelter: countWithin(facilities?.smartShelter, lat, lng, radius),
  };
}

/**
 * Hazard = accident hotspot near path OR protection zone with failing checklist.
 */
export function findHazardsNearRoute({
  path,
  accidents = [],
  protectionZones = [],
  facilities,
  config,
  vulnerableType = 'child',
  corridorMeters,
}) {
  const corridor = corridorMeters ?? config?.corridorMeters ?? 80;
  const hazards = [];
  const seen = new Set();

  for (const spot of accidents) {
    const lat = parseFloat(spot.la_crd);
    const lng = parseFloat(spot.lo_crd);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const dist = distanceToRouteMeters(lat, lng, path);
    if (dist > corridor + (spot.radius || 100)) continue;

    const key = `acc:${spot.spot_nm}:${lat}:${lng}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const checklist = evaluateChecklist(
      facilityCountsAt(facilities, lat, lng),
      config,
      { persona: vulnerableType }
    );

    hazards.push({
      id: key,
      kind: 'accident',
      name: spot.spot_nm || '사고다발지역',
      lat,
      lng,
      distanceToRoute: Math.round(dist),
      spot,
      checklist,
      reason: '사고다발지역',
    });
  }

  for (const zone of protectionZones) {
    const lat = Number(zone.lat);
    const lng = Number(zone.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const dist = distanceToRouteMeters(lat, lng, path);
    if (dist > corridor + 50) continue;

    const checklist = evaluateChecklist(
      facilityCountsAt(facilities, lat, lng),
      config,
      { persona: vulnerableType }
    );
    if (checklist.grade !== 'fail') continue;

    const key = `zone:${zone.name}:${lat}:${lng}`;
    if (seen.has(key)) continue;
    seen.add(key);

    hazards.push({
      id: key,
      kind: 'zone',
      name: zone.name || '보호구역',
      lat,
      lng,
      distanceToRoute: Math.round(dist),
      zone,
      checklist,
      reason: `체크리스트 ${checklist.score}점 (기준 ${checklist.threshold}점 미만)`,
    });
  }

  hazards.sort((a, b) => a.distanceToRoute - b.distanceToRoute);
  return hazards;
}

/**
 * Perpendicular offset waypoints (left/right of OD axis) around the nearest hazard.
 * Used to request OSRM alternatives that may avoid the hotspot corridor.
 * @returns {{lat:number,lng:number}[]}
 */
export function avoidWaypointsFromHazards(origin, destination, hazards, offset = 0.004) {
  if (!hazards?.length) return [];
  const worst = hazards[0];
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
  const nLat = -dLng / len;
  const nLng = dLat / len;
  return [
    { lat: worst.lat + nLat * offset, lng: worst.lng + nLng * offset },
    { lat: worst.lat - nLat * offset, lng: worst.lng - nLng * offset },
  ];
}

/** @deprecated Prefer avoidWaypointsFromHazards (both sides). */
export function avoidWaypointFromHazards(origin, destination, hazards) {
  return avoidWaypointsFromHazards(origin, destination, hazards)[0] || null;
}
