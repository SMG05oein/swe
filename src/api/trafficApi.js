import { getApiKeys, formatAuthKey, parseApiResponse } from './apiClient';

export const AVAILABLE_YEARS = [
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
  '2016',
  '2015',
  '2014',
  '2013',
  '2012',
];

export const YEAR_OPTIONS = [
  { value: '2023', label: '2023년 (확정 공표)' },
  { value: '2024', label: '2024년 (최신)' },
  { value: '2025', label: '2025년' },
  { value: '2022', label: '2022년' },
  { value: '2021', label: '2021년' },
  { value: '2020', label: '2020년' },
  { value: '2019', label: '2019년' },
  { value: '2018', label: '2018년' },
  { value: '2017', label: '2017년' },
  { value: '2016', label: '2016년' },
  { value: '2015', label: '2015년' },
  { value: '2014', label: '2014년' },
  { value: '2013', label: '2013년' },
  { value: '2012', label: '2012년' },
  { value: 'RECENT3', label: '최근 3개년 (2022~2024년)' },
  { value: 'ALL', label: '전체 통합 (2012~2025년)' },
];

// 메모리 캐시 (동일 연도/지역 중복 호출 방지)
const cache = new Map();

// 공공데이터포털 게이트웨이 전역 큐 (동시 처리 3건)
const MAX_CONCURRENT = 3;
const REQUEST_STAGGER_MS = 40;
let runningRequests = 0;
const requestQueue = [];

function enqueue(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject });
    processQueue();
  });
}

function processQueue() {
  if (runningRequests >= MAX_CONCURRENT || requestQueue.length === 0) return;
  runningRequests++;
  const { task, resolve, reject } = requestQueue.shift();

  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      runningRequests--;
      setTimeout(processQueue, REQUEST_STAGGER_MS);
    });
}

function resolveYears(searchYearCd) {
  if (searchYearCd === 'ALL') return AVAILABLE_YEARS;
  if (searchYearCd === 'RECENT3') return ['2024', '2023', '2022'];
  if (Array.isArray(searchYearCd)) return searchYearCd;
  return [String(searchYearCd || '2023')];
}

function resolveGuGuns(guGun) {
  if (Array.isArray(guGun)) return guGun;
  if (!guGun) return ['131'];
  return [String(guGun)];
}

async function fetchWithRetry(url, retries = 1, delayMs = 300) {
  try {
    const res = await fetch(url);
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(url, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

async function fetchEndpointSingle({
  endpoint,
  year,
  siDo,
  guGun,
  safeKey,
  enricher,
}) {
  const cacheKey = `${endpoint}_${year}_${siDo}_${guGun}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // 공공데이터포털 B552061 게이트웨이 호출
  const url = `${endpoint}?serviceKey=${safeKey}&searchYearCd=${year}&siDo=${siDo}&guGun=${guGun}&type=json&numOfRows=50&pageNo=1`;

  return enqueue(async () => {
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const response = await fetchWithRetry(url, 1, 300);
      const text = await response.text();

      if (!response.ok) {
        return {
          success: false,
          statusText: `HTTP ${response.status}`,
          message: `API 서버 오류 (${response.status})`,
          items: [],
        };
      }

      const parsed = parseApiResponse(text);
      if (!parsed || parsed.length === 0) {
        const emptyRes = { success: true, items: [] };
        cache.set(cacheKey, emptyRes);
        return emptyRes;
      }

      const enriched = parsed.map((item, idx) => enricher(item, year, idx, guGun));
      const res = { success: true, items: enriched };
      cache.set(cacheKey, res);
      return res;
    } catch (err) {
      console.warn(`[공공데이터포털 API] ${year}년 ${guGun} 수신 실패:`, err.message);
      return {
        success: false,
        statusText: '일시 지연',
        message: err.message,
        items: [],
      };
    }
  });
}

async function fetchMultiYearsAndGuns({
  endpoint,
  searchYearCd,
  siDo = '44',
  guGun = '131',
  enricher,
  serviceTitle = '다발지역',
}) {
  const { dataGoKrKey, koroadKey } = getApiKeys();
  const keyToUse = dataGoKrKey || koroadKey;
  if (!keyToUse) {
    return {
      success: false,
      statusText: '인증키 미입력',
      message: '공공데이터포털 인증키가 설정되지 않았습니다.',
      items: [],
    };
  }

  const safeKey = formatAuthKey(keyToUse);
  const years = resolveYears(searchYearCd);
  const guGuns = resolveGuGuns(guGun);

  const fetchPromises = [];
  for (const year of years) {
    for (const gu of guGuns) {
      fetchPromises.push(
        fetchEndpointSingle({
          endpoint,
          year,
          siDo,
          guGun: gu,
          safeKey,
          enricher,
        })
      );
    }
  }

  const results = await Promise.all(fetchPromises);

  const allItems = results.flatMap((r) => r.items || []);
  const anySuccess = results.some((r) => r.success);
  const firstError = results.find((r) => !r.success);

  const yearSummary =
    years.length === 1
      ? `${years[0]}년`
      : `${years[years.length - 1]}~${years[0]}년 (${years.length}개년)`;

  return {
    success: anySuccess || results.length === 0,
    statusText: anySuccess ? '실시간 연동 완료' : firstError?.statusText || '실패',
    message: anySuccess
      ? `공공데이터포털 ${serviceTitle} 수신 (${allItems.length}건, ${yearSummary})`
      : firstError?.message || 'API 오류',
    items: allItems,
    yearsQueried: years,
  };
}

// 1. 어린이보호구역내 어린이 교통사고 다발지역 조회 (B552061/schoolzoneChild)
export async function fetchChildAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const cat = 'child_schoolzone';
  return fetchMultiYearsAndGuns({
    endpoint: '/api/koroad_portal/B552061/schoolzoneChild/getRestSchoolzoneChild',
    searchYearCd,
    siDo,
    guGun,
    serviceTitle: '어린이보호구역',
    enricher: (item, year, idx, gu) => {
      const fid = item.afos_fid || idx;
      const uniqueKey = `${cat}-${year}-${gu}-${fid}`;
      return {
        ...item,
        year: String(year),
        baseYearText: `${year}년 기준`,
        uniqueKey,
        afos_fid: uniqueKey,
        category: cat,
        category_name: '어린이 보호구역 교통사고',
        radius: 300,
      };
    },
  });
}

// 2. 보행 노인/고령자 교통사고 다발지역 조회 (B552061/frequentzoneOldman)
export async function fetchElderAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const cat = 'elder';
  return fetchMultiYearsAndGuns({
    endpoint: '/api/koroad_portal/B552061/frequentzoneOldman/getRestFrequentzoneOldman',
    searchYearCd,
    siDo,
    guGun,
    serviceTitle: '보행 노인 다발지역',
    enricher: (item, year, idx, gu) => {
      const fid = item.afos_fid || idx;
      const uniqueKey = `${cat}-${year}-${gu}-${fid}`;
      return {
        ...item,
        year: String(year),
        baseYearText: `${year}년 기준`,
        uniqueKey,
        afos_fid: uniqueKey,
        category: cat,
        category_name: '노인 교통사고 (보행 노인)',
        radius: 100,
      };
    },
  });
}

// 3. 보행 어린이 교통사고 다발지역 조회 (B552061/frequentzoneChild)
export async function fetchChildGeneralAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const cat = 'child_general';
  return fetchMultiYearsAndGuns({
    endpoint: '/api/koroad_portal/B552061/frequentzoneChild/getRestFrequentzoneChild',
    searchYearCd,
    siDo,
    guGun,
    serviceTitle: '보행 어린이 다발지역',
    enricher: (item, year, idx, gu) => {
      const fid = item.afos_fid || idx;
      const uniqueKey = `${cat}-${year}-${gu}-${fid}`;
      return {
        ...item,
        year: String(year),
        baseYearText: `${year}년 기준`,
        uniqueKey,
        afos_fid: uniqueKey,
        category: cat,
        category_name: '어린이 교통사고 (보행 어린이)',
        radius: 200,
      };
    },
  });
}

// 4. 법규위반별 다발지역 조회 (B552061/frequentzoneLgrViolt)
export async function fetchViolationAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const cat = 'violation';
  return fetchMultiYearsAndGuns({
    endpoint: '/api/koroad_portal/B552061/frequentzoneLgrViolt/getRestFrequentzoneLgrViolt',
    searchYearCd,
    siDo,
    guGun,
    serviceTitle: '법규위반 다발지역',
    enricher: (item, year, idx, gu) => {
      const fid = item.afos_fid || idx;
      const uniqueKey = `${cat}-${year}-${gu}-${fid}`;
      return {
        ...item,
        year: String(year),
        baseYearText: `${year}년 기준`,
        uniqueKey,
        afos_fid: uniqueKey,
        category: cat,
        category_name: item.afos_id === '01' ? '신호위반 다발지' : '중앙선침범 다발지',
        violation_name: item.afos_id === '01' ? '신호위반' : '중앙선침범',
        radius: item.afos_id === '01' ? 100 : 300,
      };
    },
  });
}
