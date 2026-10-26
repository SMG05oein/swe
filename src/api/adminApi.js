const BACKEND = 'http://localhost:8000';

function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['X-Admin-Token'] = token;
  return h;
}

export async function fetchChecklistConfig() {
  const res = await fetch(`${BACKEND}/api/admin/config`);
  if (!res.ok) throw new Error(`설정 조회 실패 (${res.status})`);
  return res.json();
}

export async function saveChecklistConfig(config, token) {
  const res = await fetch(`${BACKEND}/api/admin/config`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `설정 저장 실패 (${res.status})`);
  }
  return res.json();
}

export async function triggerDataRefresh(token) {
  const res = await fetch(`${BACKEND}/api/admin/refresh`, {
    method: 'POST',
    headers: headers(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `갱신 실패 (${res.status})`);
  }
  return res.json();
}

export async function fetchRefreshStatus() {
  const res = await fetch(`${BACKEND}/api/admin/refresh/status`);
  if (!res.ok) throw new Error(`갱신 상태 조회 실패 (${res.status})`);
  return res.json();
}

export async function fetchCachedPublicData() {
  try {
    const res = await fetch(`${BACKEND}/api/data/cache`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
