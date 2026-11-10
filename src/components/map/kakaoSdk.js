// 카카오 지도 JavaScript SDK 불러오기 (키는 .env의 VITE_KAKAO_MAP_KEY)
const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';
let loading = null;

export function getKakaoMapKey() {
  return (import.meta.env.VITE_KAKAO_MAP_KEY || '').trim();
}

export function loadKakaoMaps(appKey, timeoutMs = 8000) {
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${SDK_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;

    const timer = setTimeout(() => reject(new Error('카카오 지도 응답 시간 초과')), timeoutMs);
    const fail = (message) => {
      clearTimeout(timer);
      script.remove();
      reject(new Error(message));
    };

    script.onload = () => {
      if (!window.kakao?.maps?.load) {
        fail('카카오 지도 SDK가 올바르지 않습니다');
        return;
      }
      window.kakao.maps.load(() => {
        clearTimeout(timer);
        resolve(window.kakao);
      });
    };
    // 키가 틀리거나 도메인(http://localhost:5173)이 등록되지 않으면 여기로 옴
    script.onerror = () => fail('카카오 지도 SDK를 불러오지 못했습니다 (키·도메인 확인)');

    document.head.appendChild(script);
  }).catch((err) => {
    loading = null;
    throw err;
  });

  return loading;
}
