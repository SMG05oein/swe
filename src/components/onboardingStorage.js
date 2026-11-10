// 앱 소개(온보딩)를 봤는지 이 브라우저에만 기억 (저장이 막히면 다음 방문 때 다시 보여줌)
const STORAGE_KEY = 'swe_onboarding_done_v1';

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // 무시
  }
}

// 마지막으로 고른 보행 대상(어린이/어르신)도 함께 기억
const PERSONA_KEY = 'swe_persona';

export function readSavedPersona() {
  try {
    const v = localStorage.getItem(PERSONA_KEY);
    return v === 'elder' || v === 'child' ? v : 'child';
  } catch {
    return 'child';
  }
}

export function savePersona(persona) {
  try {
    localStorage.setItem(PERSONA_KEY, persona);
  } catch {
    // 무시
  }
}
