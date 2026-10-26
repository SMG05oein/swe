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
  return {
    cctv: countWithin(facilities?.cctv, lat, lng, radius),
    speedBump: countWithin(facilities?.speedBump, lat, lng, radius),
    pedestrianLight: findTrafficLightsWithin(facilities?.trafficLights, lat, lng, radius)
      .pedestrianCount,
    countdown: findTrafficLightsWithin(facilities?.trafficLights, lat, lng, radius)
      .countdownCount,
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

    const checklist = evaluateChecklist(facilityCountsAt(facilities, lat, lng), config);

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

    const checklist = evaluateChecklist(facilityCountsAt(facilities, lat, lng), config);
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

/** Rough perpendicular offset waypoint to request an avoiding alternative route */
export function avoidWaypointFromHazards(origin, destination, hazards) {
  if (!hazards?.length) return null;
  const worst = hazards[0];
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
  const offset = 0.004;
  return {
    lat: worst.lat + (-dLng / len) * offset,
    lng: worst.lng + (dLat / len) * offset,
  };
}
