// src/api/aiApi.js
// 천안시 교통약자 안전 인텔리전스 - FastAPI 백엔드 (Ollama LLM) 연동 클라이언트

const BACKEND_BASE_URL = 'http://localhost:8000';

/**
 * 특정 다발 지점의 실측 사고 데이터 및 시설물 결측 데이터를 기반으로 AI 실시간 정밀 진단 요청
 * @param {Object} params
 * @returns {Promise<Object>} 진단 결과 (위험도, 종합소견, 수칙, 권고안)
 */
export async function getAiDiagnosis({
  spot_nm,
  district = '천안시',
  category = 'child',
  year = '2023',
  casualties = 0,
  deaths = 0,
  serious = 0,
  minor = 0,
  road_shape = '일반 교차로',
  deficit_score = 60,
  cctv_count = 0,
  bump_count = 0,
  ped_light_count = 0,
  countdown_count = 0,
  has_zone = false,
}) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spot_nm,
        district,
        category: category.includes('elder') ? 'elder' : 'child',
        year: String(year || '2023'),
        casualties: Number(casualties) || 0,
        deaths: Number(deaths) || 0,
        serious: Number(serious) || 0,
        minor: Number(minor) || 0,
        road_shape,
        deficit_score: Number(deficit_score) || 0,
        cctv_count: Number(cctv_count) || 0,
        bump_count: Number(bump_count) || 0,
        ped_light_count: Number(ped_light_count) || 0,
        countdown_count: Number(countdown_count) || 0,
        has_zone: Boolean(has_zone),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn('[AI API] 백엔드 실시간 연결 지연/오류:', err);
    return null;
  }
}

/**
 * 백엔드 및 Ollama 연결 상태 헬스체크
 */
export async function checkAiHealth() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/health`);
    if (!res.ok) return { healthy: false };
    return await res.json();
  } catch {
    return { healthy: false };
  }
}
