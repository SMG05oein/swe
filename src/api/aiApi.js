// FastAPI backend — diagnosis + tips (fine-tuned diagnose schema)

const BACKEND_BASE_URL = 'http://localhost:8000';

export async function getAiDiagnosis(params) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        category: String(params.category || '').includes('elder') ? 'elder' : 'child',
        year: String(params.year || '2023'),
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn('[AI API] diagnose failed:', err);
    return null;
  }
}

/**
 * Tips via fine-tuned diagnose prompt. No default_text.
 */
export async function getSafetyTips(payload) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/tips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spot_nm: payload.spot_nm,
      category: String(payload.category || '').includes('elder') ? 'elder' : 'child',
      district: payload.district || '천안시',
      year: String(payload.year || '2023'),
      checklist_score: Number(payload.checklist_score) || 0,
      missing_labels: payload.missing_labels || [],
      accident: Boolean(payload.accident),
      deaths: Number(payload.deaths) || 0,
      serious: Number(payload.serious) || 0,
      minor: Number(payload.minor) || 0,
      casualties: Number(payload.casualties) || 0,
      occrrnc_cnt: Number(payload.occrrnc_cnt) || 0,
      road_shape: payload.road_shape || '일반 교차로 및 단일로',
      has_zone: Boolean(payload.has_zone),
      cctv_count: Number(payload.cctv_count) || 0,
      bump_count: Number(payload.bump_count) || 0,
      ped_light_count: Number(payload.ped_light_count) || 0,
      countdown_count: Number(payload.countdown_count) || 0,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data?.source === 'default_text') {
    throw new Error('default_text는 사용하지 않습니다.');
  }
  return data;
}

export async function checkAiHealth() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/health`);
    if (!res.ok) return { healthy: false };
    return await res.json();
  } catch {
    return { healthy: false };
  }
}
