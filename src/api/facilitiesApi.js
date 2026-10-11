import { getApiKeys, formatAuthKey } from './apiClient';

// 공공데이터포털 행정안전부 시설물 API (천안시 개방자치단체코드)
const CHEONAN_ORG_CD = '4490000';
const PAGE_SIZE = 100;
const CONCURRENCY = 6;

const ENDPOINTS = {
  cctv: '/api/datagokr/1741000/cctv_info/info',
  speedBump: '/api/datagokr/1741000/speed_bump_info/info',
};

async function fetchPage(endpoint, key, pageNo) {
  const url =
    `${endpoint}?serviceKey=${formatAuthKey(key)}&pageNo=${pageNo}` +
    `&numOfRows=${PAGE_SIZE}&returnType=json` +
    `&cond[OPN_ATMY_GRP_CD::EQ]=${CHEONAN_ORG_CD}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const header = json?.response?.header;
  if (header && String(header.resultCode) !== '0' && String(header.resultCode) !== '00') {
    throw new Error(header.resultMsg || `resultCode ${header.resultCode}`);
  }
  const body = json?.response?.body;
  const raw = body?.items?.item ?? [];
  return {
    total: Number(body?.totalCount) || 0,
    items: Array.isArray(raw) ? raw : [raw],
  };
}

async function fetchAll(endpoint, key) {
  const first = await fetchPage(endpoint, key, 1);
  const pages = Math.ceil(first.total / PAGE_SIZE);
  const all = [...first.items];
  let next = 2;

  async function worker() {
    while (next <= pages) {
      const p = next++;
      const r = await fetchPage(endpoint, key, p);
      all.push(...r.items);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return all;
}

function toPoints(items) {
  return items
    .map((i) => ({
      lat: parseFloat(i.WGS84_LAT),
      lng: parseFloat(i.WGS84_LOT),
      count: parseInt(i.CAM_CNTOM, 10) || 1,
      purpose: i.INSTL_PRPS_SE_NM || '',
    }))
    .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
}

// 전국어린이보호구역표준데이터 (천안시 4490000)
export async function fetchChildProtectionZones() {
  const { dataGoKrKey } = getApiKeys();
  if (!dataGoKrKey) {
    return { success: false, items: [], message: '인증키 미설정' };
  }

  try {
    const url =
      `/api/datagokr/openapi/tn_pubr_public_child_prtc_zn_api?serviceKey=${formatAuthKey(dataGoKrKey)}` +
      `&pageNo=1&numOfRows=300&type=json&insttCode=${CHEONAN_ORG_CD}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const items = json?.body?.items?.item || [];
    const list = Array.isArray(items) ? items : items ? [items] : [];

    const mapped = list
      .map((item) => ({
        name: item.trgetFcltyNm,
        kind: item.fcltyKnd,
        roadAddr: item.rdnmadr,
        lotAddr: item.lnmadr,
        lat: parseFloat(item.latitude),
        lng: parseFloat(item.longitude),
        cctvYn: item.cctvYn === 'Y',
        cctvCount: parseInt(item.cctvNumber, 10) || 0,
        roadWidth: item.prtcareaRw || '',
        policeStation: item.cmptncPolcsttnNm || '',
      }))
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

    return {
      success: true,
      items: mapped,
      totalCount: mapped.length,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      message: error.message,
    };
  }
}

// 천안시 CCTV / 과속방지턱 / 어린이보호구역 로드 (실시간 OpenAPI)
export async function fetchFacilities() {
  const { dataGoKrKey } = getApiKeys();
  if (!dataGoKrKey) {
    return {
      success: false,
      message: '공공데이터포털 인증키가 설정되지 않았습니다.',
      cctv: [],
      speedBump: [],
      protectionZones: [],
    };
  }
  const [cctvRes, bumpRes, zoneRes] = await Promise.allSettled([
    fetchAll(ENDPOINTS.cctv, dataGoKrKey),
    fetchAll(ENDPOINTS.speedBump, dataGoKrKey),
    fetchChildProtectionZones(),
  ]);

  const errors = [];
  if (cctvRes.status === 'rejected') errors.push(`CCTV: ${cctvRes.reason.message}`);
  if (bumpRes.status === 'rejected') errors.push(`과속방지턱: ${bumpRes.reason.message}`);
  if (zoneRes.status === 'rejected' || (zoneRes.status === 'fulfilled' && !zoneRes.value.success)) {
    errors.push(`어린이보호구역: ${zoneRes.value?.message || zoneRes.reason?.message}`);
  }

  const protectionItems =
    zoneRes.status === 'fulfilled' && zoneRes.value.success
      ? zoneRes.value.items
      : [];

  return {
    success: errors.length === 0,
    message: errors.join(' / '),
    cctv: cctvRes.status === 'fulfilled' ? toPoints(cctvRes.value) : null,
    speedBump: bumpRes.status === 'fulfilled' ? toPoints(bumpRes.value) : null,
    protectionZones: protectionItems,
  };
}

export function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 지점 반경 내 시설물 집계
export function countWithin(points, lat, lng, radius) {
  if (!points) return null;
  let n = 0;
  for (const p of points) {
    if (distanceM(lat, lng, p.lat, p.lng) <= radius) n += p.count;
  }
  return n;
}

// 지점 반경 내 어린이보호구역 목록 추출
export function findProtectionZonesWithin(zones, lat, lng, radius) {
  if (!zones || !Array.isArray(zones)) return [];
  return zones
    .map((z) => ({
      ...z,
      distance: Math.round(distanceM(lat, lng, z.lat, z.lng)),
    }))
    .filter((z) => z.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

