/** Nominatim geocoding focused on Cheonan bounding box */

const CHEONAN_VIEWBOX = '127.08,36.76,127.22,36.88'; // west,south,east,north

export async function searchPlaces(query, { limit = 5 } = {}) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q: `${q} 천안`,
    format: 'json',
    addressdetails: '1',
    limit: String(limit),
    viewbox: CHEONAN_VIEWBOX,
    bounded: '1',
  });

  const res = await fetch(`/api/nominatim/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`장소 검색 실패 (HTTP ${res.status})`);

  const rows = await res.json();
  return (rows || []).map((r) => ({
    id: String(r.place_id),
    name: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

export async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
  });
  const res = await fetch(`/api/nominatim/reverse?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  const r = await res.json();
  return {
    name: r.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}
