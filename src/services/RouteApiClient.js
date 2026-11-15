import { fetchPedestrianRoute } from '../api/routeApi';

/**
 * Part 4 — wraps the pedestrian route API (OSRM via /api/osrm CORS proxy).
 * OSRM is keyless; the proxy exists for browser CORS, not secret key hiding.
 */
export default class RouteApiClient {
  /**
   * @param {{lat:number,lng:number}[]} waypoints
   * @param {{vulnerableType?: string}} [options]
   * @returns {Promise<import('../api/routeApi').Route>}
   */
  async getRoute(waypoints, options = {}) {
    try {
      return await fetchPedestrianRoute(waypoints, options);
    } catch (err) {
      const message = err?.message || '보행 경로를 조회하지 못했습니다.';
      throw new Error(message);
    }
  }
}
