// API Key 관리 및 공통 응답 파서

export function getApiKeys() {
  const koroadKey =
    localStorage.getItem('VITE_KOROAD_AUTH_KEY') ||
    import.meta.env.VITE_KOROAD_AUTH_KEY ||
    '';
  const dataGoKrKey =
    localStorage.getItem('VITE_DATA_GO_KR_API_KEY') ||
    import.meta.env.VITE_DATA_GO_KR_API_KEY ||
    '';
  return { koroadKey, dataGoKrKey };
}

export function saveApiKeys({ koroadKey, dataGoKrKey }) {
  if (koroadKey !== undefined) {
    localStorage.setItem('VITE_KOROAD_AUTH_KEY', koroadKey);
  }
  if (dataGoKrKey !== undefined) {
    localStorage.setItem('VITE_DATA_GO_KR_API_KEY', dataGoKrKey);
  }
}

export function formatAuthKey(key) {
  if (!key) return '';
  return key.includes('%') ? key : encodeURIComponent(key);
}

// XML 및 JSON 통합 파서
export function parseApiResponse(text) {
  if (!text) return [];
  const trimmed = text.trim();

  // XML 파싱
  if (trimmed.startsWith('<')) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(trimmed, 'text/xml');
      const itemNodes = xmlDoc.querySelectorAll('items > item, item');
      if (!itemNodes || itemNodes.length === 0) return [];

      return Array.from(itemNodes).map((node) => {
        const itemObj = {};
        node.childNodes.forEach((child) => {
          if (child.nodeType === 1) {
            itemObj[child.nodeName] = child.textContent?.trim() || '';
          }
        });
        return itemObj;
      });
    } catch (e) {
      console.warn('XML 파싱 오류:', e);
      return [];
    }
  }

  // JSON 파싱
  try {
    const json = JSON.parse(trimmed);
    const items = json?.items?.item || json?.response?.body?.items?.item || [];
    return Array.isArray(items) ? items : [items];
  } catch {
    return [];
  }
}
