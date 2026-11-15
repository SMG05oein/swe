import RouteApiClient from './RouteApiClient';
import { findHazardsNearRoute, avoidWaypointsFromHazards } from '../domain/hazards';
import { gradeRoute } from '../domain/routeGrade';

/**
 * Part 4 — integrated execution flow:
 * origin/destination → Route → near-route hazards → grade (and optional avoid route).
 */
export default class NavigationManager {
  /**
   * @param {{ routeClient?: RouteApiClient }} [deps]
   */
  constructor(deps = {}) {
    this.routeClient = deps.routeClient || new RouteApiClient();
  }

  /**
   * @param {[number, number][]} path
   * @param {{
   *   accidents: object[],
   *   protectionZones: object[],
   *   facilities: object,
   *   config: object,
   *   vulnerableType: string,
   * }} ctx
   */
  analyzePath(path, ctx) {
    return findHazardsNearRoute({
      path,
      accidents: ctx.accidents,
      protectionZones: ctx.protectionZones,
      facilities: ctx.facilities,
      config: ctx.config,
      vulnerableType: ctx.vulnerableType,
    });
  }

  /**
   * Primary pedestrian route + hazard analysis.
   * @returns {Promise<{ route: import('../api/routeApi').Route, hazards: object[] }>}
   */
  async runPrimaryRoute({
    origin,
    destination,
    vulnerableType,
    accidents,
    protectionZones,
    facilities,
    config,
  }) {
    if (!origin || !destination) {
      throw new Error('출발지와 도착지가 필요합니다.');
    }

    const route = await this.routeClient.getRoute([origin, destination], {
      vulnerableType,
    });
    const hazards = this.analyzePath(route.path, {
      accidents,
      protectionZones,
      facilities,
      config,
      vulnerableType,
    });

    return { route, hazards };
  }

  /**
   * Avoid-route: try left/right offset vias, pick fewer hazards.
   * Rejects candidates that are not strictly safer than the primary route.
   * @returns {Promise<
   *   | { skipped: true, reason: string }
   *   | { skipped?: false, route: import('../api/routeApi').Route, hazards: object[] }
   * >}
   */
  async runAvoidRoute({
    origin,
    destination,
    hazards,
    vulnerableType,
    accidents,
    protectionZones,
    facilities,
    config,
  }) {
    if (!origin || !destination) {
      throw new Error('출발지와 도착지가 필요합니다.');
    }
    if (!hazards?.length) {
      return {
        skipped: true,
        reason: '회피할 위험 구역이 없습니다. 기본 경로와 동일합니다.',
      };
    }

    const ctx = {
      accidents,
      protectionZones,
      facilities,
      config,
      vulnerableType,
    };
    const primaryCount = hazards.length;
    const vias = avoidWaypointsFromHazards(origin, destination, hazards);

    const candidates = await Promise.all(
      vias.map(async (via) => {
        try {
          const route = await this.routeClient.getRoute([origin, via, destination], {
            vulnerableType,
          });
          const nextHazards = this.analyzePath(route.path, ctx);
          return { route, hazards: nextHazards };
        } catch {
          return null;
        }
      })
    );

    const valid = candidates.filter(Boolean);
    if (!valid.length) {
      return {
        skipped: true,
        reason: '회피 경로를 찾지 못했습니다.',
      };
    }

    valid.sort((a, b) => {
      const byHazards = a.hazards.length - b.hazards.length;
      if (byHazards !== 0) return byHazards;
      return (a.route.distance || 0) - (b.route.distance || 0);
    });

    const best = valid[0];
    if (best.hazards.length >= primaryCount) {
      return {
        skipped: true,
        reason: `더 안전한 회피 경로를 찾지 못했습니다. (기본 ${primaryCount}곳 → 후보 최소 ${best.hazards.length}곳)`,
      };
    }

    return { route: best.route, hazards: best.hazards };
  }

  /**
   * @param {number} hazardCount
   * @param {object} config
   */
  grade(hazardCount, config) {
    return gradeRoute(hazardCount, config);
  }
}
