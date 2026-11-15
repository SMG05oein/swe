import {
  fetchChildProtectionZones,
  fetchElderProtectionZones,
  fetchFacilities,
} from './facilitiesApi';

const STORAGE_KEY = 'safetyDataStore.v2'; // 형식이 바뀌어 v1 저장본은 다시 받음
const TMP_KEY = `${STORAGE_KEY}.tmp`;
const HOTSPOT_URL = '/data/cheonan_hotspots.json';
const HOTSPOT_MERGE_M = 150; // 연도별 좌표가 조금씩 달라서, 이름이 같거나 150m 안이면 같은 지점으로 봄

// 내부 시설 이름 -> 합의한 형식(체크리스트 설정 파일 facility 값)
// 설정 파일에 없는 시설도 같은 규칙으로 넘김 (참고 정보·추후 항목용)
const FACILITY_TYPE = {
  trafficLight: 'traffic_light',
  speedBump: 'speed_bump',
  schoolZoneCamera: 'camera',
  streetParking: 'street_parking',
  cctv: 'cctv',
  safetyFence: 'safety_fence',
  yellowCarpet: 'yellow_carpet',
  acousticSignal: 'acoustic_signal',
  floorLight: 'floor_light',
  barrierFree: 'barrier_free',
  smartShelter: 'smart_shelter',
};

/* ---------- 클래스 (UML: ChildZone, ElderZone, HotspotZone 모두 Zone 상속) ---------- */

export class Zone {
  constructor({ id, lat, lng, type }) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.type = type;
  }
}

// 어린이·노인 보호구역 공통 속성
function assignProtectionFields(target, o) {
  target.name = o.name;
  target.kind = o.kind ?? null;
  target.roadAddr = o.roadAddr ?? null;
  target.cctvYn = o.cctvYn ?? null;
  target.cctvCount = o.cctvCount ?? null;
  target.roadWidthM = o.roadWidthM ?? null;
  target.policeStation = o.policeStation ?? null;
  target.mergedFrom = o.mergedFrom ?? [o.name];
}

export class ChildZone extends Zone {
  constructor(o) {
    super({ ...o, type: 'child' });
    assignProtectionFields(this, o);
  }
}

export class ElderZone extends Zone {
  constructor(o) {
    super({ ...o, type: 'elder' });
    assignProtectionFields(this, o);
  }
}

export class HotspotZone extends Zone {
  constructor(o) {
    super({ ...o, type: 'hotspot' });
    this.name = o.name ?? null;
    this.victimType = o.victimType ?? 'child'; // 'child' | 'elder'
    this.years = o.years ?? []; // 선정 연도 목록. 2개 이상이면 반복 선정(-30점)
    this.accidentCount = o.accidentCount ?? null; // 연도 합계
    this.casualtyCount = o.casualtyCount ?? null;
    this.deathCount = o.deathCount ?? null;
    this.polygon = o.polygon ?? null;
  }
}

/* ---------- 공통 유틸 ---------- */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const hasLatLng = (p) => isNum(p?.lat) && isNum(p?.lng);
const coordKey = (lat, lng) => `${lat.toFixed(5)}_${lng.toFixed(5)}`;

function distanceM(a, b) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// null은 "데이터 없음", 0은 "0으로 확인됨"이라 구분해서 더하거나 최댓값을 구함
const sumOrNull = (vals) => {
  const nums = vals.filter(isNum);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
};
const maxOrNull = (vals) => {
  const nums = vals.filter(isNum);
  return nums.length ? Math.max(...nums) : null;
};
const toNum = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function parseWidth(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const KIND_PRIORITY = ['초등학교', '유치원', '어린이집', '학원'];
const rank = (kind = '') => {
  const i = KIND_PRIORITY.findIndex((k) => kind.includes(k));
  return i === -1 ? KIND_PRIORITY.length : i;
};

/* ---------- 보호구역 ---------- */

function toZoneInput(raw, type) {
  const cctvCount = raw.cctvYn && !raw.cctvCount ? null : toNum(raw.cctvCount);
  return {
    id: `${type}-${coordKey(raw.lat, raw.lng)}`,
    lat: raw.lat,
    lng: raw.lng,
    name: raw.name,
    kind: raw.kind,
    roadAddr: raw.roadAddr,
    cctvYn: raw.cctvYn,
    cctvCount,
    roadWidthM: parseWidth(raw.roadWidth),
    policeStation: raw.policeStation || null,
    mergedFrom: [raw.name],
  };
}

// 같은 좌표의 구역을 하나로 병합 (어린이보호구역 214 -> 168)
function mergeByCoord(rawList, type, ZoneClass) {
  const map = new Map();
  for (const raw of (rawList ?? []).filter(hasLatLng)) {
    const cur = toZoneInput(raw, type);
    const prev = map.get(cur.id);
    if (!prev) {
      map.set(cur.id, cur);
      continue;
    }
    const keepPrev = rank(prev.kind) <= rank(cur.kind);
    const main = keepPrev ? prev : cur;
    const sub = keepPrev ? cur : prev;
    map.set(cur.id, {
      ...main,
      roadAddr: main.roadAddr ?? sub.roadAddr,
      cctvYn: main.cctvYn || sub.cctvYn,
      cctvCount: maxOrNull([main.cctvCount, sub.cctvCount]), // 0대(확인됨)를 null로 바꾸지 않음
      roadWidthM: main.roadWidthM ?? sub.roadWidthM,
      policeStation: main.policeStation ?? sub.policeStation,
      mergedFrom: [...new Set([...main.mergedFrom, ...sub.mergedFrom])],
    });
  }
  return [...map.values()].map((o) => new ZoneClass(o));
}

/* ---------- 시설 ---------- */

// 내부 형식: { id, kind, lat, lng, count, ...원본 속성 }
function normalizeFacilities(kind, list = []) {
  return (list ?? []).filter(hasLatLng).map((f, i) => ({
    ...f,
    id: `${kind}-${i}`,
    kind,
    count: f.count ?? 1,
  }));
}

/* ---------- 사고다발지역 ---------- */

function parsePolygon(raw) {
  const g = raw.polygon ?? raw.geom_json;
  if (!g) return null;
  if (typeof g === 'object') return g;
  try {
    return JSON.parse(g);
  } catch {
    return null;
  }
}

// 연도별 레코드 -> 지점 단위로 묶어서 years 배열로 만듦
function toHotspots(items = []) {
  const records = (items ?? [])
    .map((raw) => ({
      lat: parseFloat(raw.lat ?? raw.la_crd),
      lng: parseFloat(raw.lng ?? raw.lo_crd),
      name: raw.name ?? raw.spot_nm ?? null,
      victimType: raw.victimType ?? raw.kind ?? 'child',
      year: toNum(raw.year),
      accidentCount: toNum(raw.accidentCount ?? raw.occrrnc_cnt),
      casualtyCount: toNum(raw.casualtyCount ?? raw.caslt_cnt),
      deathCount: toNum(raw.deathCount ?? raw.dth_dnv_cnt),
      polygon: parsePolygon(raw),
    }))
    .filter(hasLatLng);

  const groups = [];
  for (const r of records) {
    const g = groups.find(
      (x) =>
        x.victimType === r.victimType &&
        ((r.name && x.name === r.name) || distanceM(x, r) <= HOTSPOT_MERGE_M)
    );
    if (g) g.records.push(r);
    else groups.push({ lat: r.lat, lng: r.lng, name: r.name, victimType: r.victimType, records: [r] });
  }

  return groups.map((g) => {
    const latest = [...g.records].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
    return new HotspotZone({
      id: `hotspot-${g.victimType}-${coordKey(latest.lat, latest.lng)}`, // 순서와 무관한 고정 id
      lat: latest.lat,
      lng: latest.lng,
      name: g.name,
      victimType: g.victimType,
      years: [...new Set(g.records.map((r) => r.year).filter(isNum))].sort(),
      accidentCount: sumOrNull(g.records.map((r) => r.accidentCount)),
      casualtyCount: sumOrNull(g.records.map((r) => r.casualtyCount)),
      deathCount: sumOrNull(g.records.map((r) => r.deathCount)),
      polygon: latest.polygon,
    });
  });
}

async function loadHotspots() {
  try {
    const res = await fetch(HOTSPOT_URL);
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.resultCode === 'NODATA_ERROR' || json?.error === 'NODATA_ERROR') return [];
    return toHotspots(Array.isArray(json) ? json : json.items);
  } catch {
    return [];
  }
}

function hydrate(data) {
  return {
    ...data,
    zones: [
      ...data.zones.child.map((z) => new ChildZone(z)),
      ...data.zones.elder.map((z) => new ElderZone(z)),
      ...data.zones.hotspot.map((z) => new HotspotZone(z)),
    ],
  };
}

/* ---------- SafetyDataStore ---------- */

export class SafetyDataStore {
  /**
   * @param {{
   *   guidanceGenerator?: (zone) => Promise<any>,
   *   serverCacheUrl?: string | null
   * }} options
   *  guidanceGenerator: 5번의 generateGuidance(zone). 서버(관리자 갱신)에서만 넘기는 것을 권장.
   *                     브라우저에서 넘기면 접속자마다 구역 수만큼 LLM을 호출함.
   *  serverCacheUrl: 서버 캐시 주소(예: '/api/data/cache'). 있으면 이걸 먼저 씀.
   *                  응답은 refresh()가 저장하는 payload와 같은 모양이어야 함 (4번과 합의 필요)
   */
  constructor({ guidanceGenerator = null, serverCacheUrl = null } = {}) {
    this.guidanceGenerator = guidanceGenerator;
    this.serverCacheUrl = serverCacheUrl;
    this.data = null; // { fetchedAt, isSample, available, zones[], facilities[], guidance{} }
  }

  async init() {
    if (await this._loadFromServer()) return this;
    if (this._loadFromStorage() && !this.data.isSample) return this;
    // 저장본이 없거나 샘플이면 다시 받아봄 (여전히 샘플이면 refresh가 기존 저장본을 유지)
    await this.refresh();
    return this;
  }

  async _loadFromServer() {
    if (!this.serverCacheUrl) return false;
    try {
      const res = await fetch(this.serverCacheUrl);
      if (!res.ok) return false;
      const json = await res.json();
      if (!json?.zones) return false;
      this.data = hydrate(json);
      return true;
    } catch {
      return false;
    }
  }

  _loadFromStorage() {
    try {
      const text = localStorage.getItem(STORAGE_KEY);
      if (!text) return false;
      this.data = hydrate(JSON.parse(text));
      return true;
    } catch {
      return false;
    }
  }

  _saveToStorage(payload) {
    try {
      localStorage.setItem(TMP_KEY, JSON.stringify(payload));
      localStorage.setItem(STORAGE_KEY, localStorage.getItem(TMP_KEY));
    } catch {
      // 용량 초과 등으로 저장 실패해도 메모리(this.data)로는 계속 동작
    } finally {
      try {
        localStorage.removeItem(TMP_KEY);
      } catch {
        /* 무시 */
      }
    }
  }

  async refresh() {
    const [fac, child, elder, hotspots] = await Promise.all([
      fetchFacilities(),
      fetchChildProtectionZones(),
      fetchElderProtectionZones(),
      loadHotspots(),
    ]);

    const isSample = Boolean(fac.fromSample || child.isSample || elder.isSample);

    if (isSample && (this.data || this._loadFromStorage())) {
      return { ok: false, kept: 'cache', message: fac.message };
    }

    const zones = {
      child: mergeByCoord(child.items, 'child', ChildZone),
      elder: mergeByCoord(elder.items, 'elder', ElderZone),
      hotspot: hotspots,
    };

    const facilityKinds = {
      cctv: fac.cctv,
      speedBump: fac.speedBump,
      trafficLight: fac.trafficLights,
      safetyFence: fac.safetyFence,
      yellowCarpet: fac.yellowCarpet,
      schoolZoneCamera: fac.schoolZoneCamera,
      streetParking: fac.streetParking, // facilitiesApi에 아직 없음 (확보 필요)
      acousticSignal: fac.acousticSignal,
      floorLight: fac.floorLight,
      barrierFree: fac.barrierFree,
      smartShelter: fac.smartShelter,
    };
    const facilities = Object.entries(facilityKinds).flatMap(([k, v]) =>
      normalizeFacilities(k, v)
    );

    // 천안 데이터를 실제로 받은 시설 종류만 available에 넣음 (2번이 no_data 판단에 사용)
    const available = Object.entries(facilityKinds)
      .filter(([, v]) => Array.isArray(v) && v.some(hasLatLng))
      .map(([k]) => FACILITY_TYPE[k]);

    const guidance = await this._buildGuidance([...zones.child, ...zones.elder]);

    const payload = {
      version: 2,
      fetchedAt: new Date().toISOString(),
      isSample,
      available,
      zones,
      facilities,
      guidance,
    };

    this._saveToStorage(payload);
    this.data = hydrate(payload);
    return { ok: true, isSample, message: fac.message || null };
  }

  async _buildGuidance(zones) {
    if (!this.guidanceGenerator) return {};
    const out = {};
    for (const z of zones) {
      try {
        out[z.id] = await this.guidanceGenerator(z);
      } catch {
        out[z.id] = null; // 5번이 기본 문구로 대체
      }
    }
    return out;
  }

  getZones(type) {
    const all = this.data?.zones ?? [];
    return type ? all.filter((z) => z.type === type) : all;
  }

  getFacilities(kind) {
    const all = this.data?.facilities ?? [];
    return kind ? all.filter((f) => f.kind === kind) : all;
  }

  /**
   * 2번 SafetyEvaluator에 넘기는 합의 형식
   * { available: ['traffic_light', ...], facilities: [{ type, lat, lng, speedLimit? }, ...] }
   */
  getFacilityData() {
    const facilities = (this.data?.facilities ?? []).map((f) => {
      const out = { type: FACILITY_TYPE[f.kind] ?? f.kind, lat: f.lat, lng: f.lng };
      if (f.kind === 'schoolZoneCamera') out.speedLimit = toNum(f.speedLimit); // 원본 필드명은 1번이 확인
      return out;
    });
    return { available: this.data?.available ?? [], facilities };
  }

  getHotspots() {
    return this.getZones('hotspot');
  }

  getGuidance(zoneId) {
    return this.data?.guidance?.[zoneId] ?? null;
  }

  getMeta() {
    return {
      fetchedAt: this.data?.fetchedAt ?? null,
      isSample: this.data?.isSample ?? null,
      available: this.data?.available ?? [],
    };
  }
}

export const safetyDataStore = new SafetyDataStore();
