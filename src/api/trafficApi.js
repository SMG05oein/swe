import { getApiKeys, formatAuthKey, parseApiResponse } from './apiClient';

// 1. 어린이보호구역내 어린이 교통사고 다발지역 조회
export async function fetchChildAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const { koroadKey } = getApiKeys();
  if (!koroadKey) {
    return {
      success: false,
      statusText: '인증키 미입력',
      message: '인증키가 설정되지 않았습니다.',
      items: [],
    };
  }

  try {
    const safeKey = formatAuthKey(koroadKey);
    const url = `/api/koroad/data/rest/frequentzone/schoolzone/child?authKey=${safeKey}&searchYearCd=${searchYearCd}&siDo=${siDo}&guGun=${guGun}`;
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        return {
          success: false,
          statusText: '서비스 미신청',
          message: '발급받은 키에 어린이보호구역 서비스 사용 권한이 등록되지 않았습니다.',
          items: [],
        };
      }
      return {
        success: false,
        statusText: `HTTP ${response.status}`,
        message: `API 서버 오류 (${response.status})`,
        items: [],
      };
    }

    const parsed = parseApiResponse(text);
    if (!parsed || parsed.length === 0) {
      return {
        success: true,
        statusText: '데이터 없음',
        message: '해당 연도/지역에 등록된 다발지역 데이터가 없습니다.',
        items: [],
      };
    }

    const enriched = parsed.map((item, idx) => ({
      ...item,
      afos_fid: item.afos_fid || `child-${idx}`,
      category: 'child_schoolzone',
      category_name: '어린이 보호구역 교통사고',
      radius: 300,
    }));

    return {
      success: true,
      statusText: '실시간 연동 완료',
      message: `도로교통공단 API 정상 수신 (${enriched.length}건)`,
      items: enriched,
    };
  } catch (err) {
    return {
      success: false,
      statusText: '연결 실패',
      message: err.message,
      items: [],
    };
  }
}

// 2. 보행 노인/고령자 교통사고 다발지역 조회
export async function fetchElderAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const { koroadKey } = getApiKeys();
  if (!koroadKey) {
    return {
      success: false,
      statusText: '인증키 미입력',
      message: '인증키가 설정되지 않았습니다.',
      items: [],
    };
  }

  try {
    const safeKey = formatAuthKey(koroadKey);
    const url = `/api/koroad/data/rest/frequentzone/oldman?authKey=${safeKey}&searchYearCd=${searchYearCd}&siDo=${siDo}&guGun=${guGun}`;
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        return {
          success: false,
          statusText: '서비스 미신청 (추가 신청 필요)',
          message: '도로교통공단 포털에서 [보행노인 사고다발지역] 서비스 추가 신청이 필요합니다.',
          items: [],
        };
      }
      return {
        success: false,
        statusText: `HTTP ${response.status}`,
        message: `API 서버 오류 (${response.status})`,
        items: [],
      };
    }

    const parsed = parseApiResponse(text);
    if (!parsed || parsed.length === 0) {
      return {
        success: true,
        statusText: '데이터 없음',
        message: '해당 연도/지역에 등록된 다발지역 데이터가 없습니다.',
        items: [],
      };
    }

    const enriched = parsed.map((item, idx) => ({
      ...item,
      afos_fid: item.afos_fid || `elder-${idx}`,
      category: 'elder',
      category_name: '노인 교통사고 (보행 노인)',
      radius: 100,
    }));

    return {
      success: true,
      statusText: '실시간 연동 완료',
      message: `도로교통공단 API 정상 수신 (${enriched.length}건)`,
      items: enriched,
    };
  } catch (err) {
    return {
      success: false,
      statusText: '연결 실패',
      message: err.message,
      items: [],
    };
  }
}

// 3. 보행 어린이 교통사고 (일반 어린이 사고) 다발지역 조회
export async function fetchChildGeneralAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const { koroadKey } = getApiKeys();
  if (!koroadKey) {
    return {
      success: false,
      statusText: '인증키 미입력',
      message: '인증키가 설정되지 않았습니다.',
      items: [],
    };
  }

  try {
    const safeKey = formatAuthKey(koroadKey);
    const url = `/api/koroad/data/rest/frequentzone/child?authKey=${safeKey}&searchYearCd=${searchYearCd}&siDo=${siDo}&guGun=${guGun}`;
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        return {
          success: false,
          statusText: '서비스 미신청 (추가 신청 필요)',
          message: '도로교통공단 포털에서 [보행어린이 사고다발지역] 서비스 추가 신청이 필요합니다.',
          items: [],
        };
      }
      return {
        success: false,
        statusText: `HTTP ${response.status}`,
        message: `API 서버 오류 (${response.status})`,
        items: [],
      };
    }

    const parsed = parseApiResponse(text);
    if (!parsed || parsed.length === 0) {
      return {
        success: true,
        statusText: '데이터 없음',
        message: '해당 연도/지역에 등록된 다발지역 데이터가 없습니다.',
        items: [],
      };
    }

    const enriched = parsed.map((item, idx) => ({
      ...item,
      afos_fid: item.afos_fid || `child-gen-${idx}`,
      category: 'child_general',
      category_name: '어린이 교통사고 (보행 어린이)',
      radius: 200,
    }));

    return {
      success: true,
      statusText: '실시간 연동 완료',
      message: `도로교통공단 API 정상 수신 (${enriched.length}건)`,
      items: enriched,
    };
  } catch (err) {
    return {
      success: false,
      statusText: '연결 실패',
      message: err.message,
      items: [],
    };
  }
}

// 4. 법규위반별(신호위반/중앙선침범) 다발지역 조회
export async function fetchViolationAccidents({
  searchYearCd = '2023',
  siDo = '44',
  guGun = '131',
} = {}) {
  const { koroadKey } = getApiKeys();
  if (!koroadKey) {
    return {
      success: false,
      statusText: '인증키 미입력',
      message: '인증키가 설정되지 않았습니다.',
      items: [],
    };
  }

  try {
    const safeKey = formatAuthKey(koroadKey);
    const url = `/api/koroad/data/rest/frequentzone/lgrViolt?authKey=${safeKey}&searchYearCd=${searchYearCd}&siDo=${siDo}&guGun=${guGun}`;
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
        return {
          success: false,
          statusText: '서비스 미신청 (추가 신청 필요)',
          message: '도로교통공단 포털에서 [법규위반별 사고다발지역] 서비스 추가 신청이 필요합니다.',
          items: [],
        };
      }
      return {
        success: false,
        statusText: `HTTP ${response.status}`,
        message: `API 서버 오류 (${response.status})`,
        items: [],
      };
    }

    const parsed = parseApiResponse(text);
    if (!parsed || parsed.length === 0) {
      return {
        success: true,
        statusText: '데이터 없음',
        message: '해당 연도/지역에 등록된 다발지역 데이터가 없습니다.',
        items: [],
      };
    }

    const enriched = parsed.map((item, idx) => ({
      ...item,
      afos_fid: item.afos_fid || `viol-${idx}`,
      category: 'violation',
      category_name: item.afos_id === '01' ? '신호위반 다발지' : '중앙선침범 다발지',
      violation_name: item.afos_id === '01' ? '신호위반' : '중앙선침범',
      radius: item.afos_id === '01' ? 100 : 300,
    }));

    return {
      success: true,
      statusText: '실시간 연동 완료',
      message: `도로교통공단 법규위반 API 정상 수신 (${enriched.length}건)`,
      items: enriched,
    };
  } catch (err) {
    return {
      success: false,
      statusText: '연결 실패',
      message: err.message,
      items: [],
    };
  }
}
