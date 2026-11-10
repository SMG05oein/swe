// OpenStreetMap(Leaflet) 지도. 카카오 키가 없거나 카카오 지도를 못 불러올 때 사용
import {
  COLORS,
  SEGMENT_COLORS,
  fitPadding,
  spotPopupHtml,
  zonePopupHtml,
  endpointHtml,
  hazardHtml,
  zoneHtml,
  spotLatLng,
  zoneLatLng,
} from './mapShared';

function fitOptions() {
  const p = fitPadding();
  return { paddingTopLeft: [p.left, p.top], paddingBottomRight: [p.right, p.bottom] };
}

export function createLeafletEngine(container, center) {
  const L = window.L;
  const map = L.map(container, {
    center: [center.lat, center.lng],
    zoom: center.zoom || 15,
    zoomControl: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const sizeTimer = setTimeout(() => map.invalidateSize(), 100);
  const resizeObserver = window.ResizeObserver ? new ResizeObserver(() => map.invalidateSize()) : null;
  resizeObserver?.observe(container);

  const layers = { spots: [], zones: [], hazards: [], route: [], other: null, endpoints: [] };
  const clear = (list) => list.forEach((l) => l.remove());

  const divIcon = (className, html, size, anchor) =>
    L.divIcon({ className, html, iconSize: size, iconAnchor: anchor });

  return {
    name: 'leaflet',

    onClick(handler) {
      const fn = (e) => handler({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.on('click', fn);
      return () => map.off('click', fn);
    },

    flyTo(lat, lng, zoom) {
      map.flyTo([lat, lng], zoom || 15, { animate: true, duration: 0.8 });
    },

    setSpots(spots) {
      clear(layers.spots);
      layers.spots = [];
      spots.forEach((spot) => {
        const ll = spotLatLng(spot);
        if (!ll) return;
        const area = L.circle(ll, {
          radius: spot.radius || 300,
          color: COLORS.accident,
          weight: 1,
          opacity: 0.35,
          fillColor: COLORS.accident,
          fillOpacity: 0.06,
          interactive: false,
        }).addTo(map);
        const dot = L.circleMarker(ll, {
          radius: 5,
          color: '#fff',
          weight: 1.5,
          fillColor: COLORS.accident,
          fillOpacity: 0.85,
        }).addTo(map);
        dot.bindPopup(spotPopupHtml(spot));
        layers.spots.push(area, dot);
      });
    },

    setZones(zones) {
      clear(layers.zones);
      layers.zones = zones
        .map((zone) => {
          const ll = zoneLatLng(zone);
          if (!ll) return null;
          const m = L.marker(ll, { icon: divIcon('zone-marker', zoneHtml(zone), [12, 12], [6, 6]) }).addTo(map);
          m.bindPopup(zonePopupHtml(zone));
          return m;
        })
        .filter(Boolean);
    },

    setRoute({ path, segments, altPath, origin, destination, onSelectOther }) {
      clear(layers.route);
      clear(layers.endpoints);
      layers.other?.remove();
      layers.route = [];
      layers.endpoints = [];
      layers.other = null;

      if (altPath?.length) {
        const other = L.polyline(altPath, {
          color: COLORS.routeOther,
          weight: 6,
          opacity: 0.9,
          dashArray: '2 10',
          lineCap: 'round',
        }).addTo(map);
        other.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectOther?.();
        });
        other.bindTooltip('다른 경로 보기', { sticky: true });
        layers.other = other;
      }

      if (path?.length) {
        const casing = L.polyline(path, { color: '#ffffff', weight: 11, opacity: 1, interactive: false }).addTo(map);
        const parts = segments?.length ? segments : [{ level: 0, path }];
        const lines = parts.map((seg) =>
          L.polyline(seg.path, {
            color: SEGMENT_COLORS[seg.level] || COLORS.route,
            weight: 7,
            opacity: 1,
            lineCap: 'butt',
            interactive: false,
          }).addTo(map)
        );
        layers.route = [casing, ...lines];
        map.fitBounds(casing.getBounds(), fitOptions());
      }

      [
        [origin, '출발', 'origin'],
        [destination, '도착', 'destination'],
      ].forEach(([point, label, kind]) => {
        if (!point) return;
        layers.endpoints.push(
          L.marker([point.lat, point.lng], {
            icon: divIcon('endpoint-marker', endpointHtml(label, kind), [44, 40], [22, 40]),
            zIndexOffset: 900,
          }).addTo(map)
        );
      });
    },

    fitRoute() {
      const casing = layers.route[0];
      if (casing) map.fitBounds(casing.getBounds(), fitOptions());
    },

    setHazards(hazards, selectedId, onSelect) {
      clear(layers.hazards);
      layers.hazards = hazards.map((h, i) => {
        const selected = selectedId === h.id;
        const size = selected ? 34 : 26;
        const m = L.marker([h.lat, h.lng], {
          icon: divIcon('hazard-marker', hazardHtml(i + 1, h.kind, selected), [size, size], [size / 2, size / 2]),
          zIndexOffset: selected ? 1000 : 800,
          keyboard: true,
          title: h.name,
        }).addTo(map);
        m.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelect?.(h);
        });
        return m;
      });
    },

    // 선택 지점이 화면 가장자리 밖이면 가운데로
    focus(lat, lng) {
      if (!map.getBounds().pad(-0.15).contains([lat, lng])) {
        map.panTo([lat, lng], { animate: true });
      }
    },

    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    setPickCursor() {
      // CSS(.map-section.picking)로 처리
    },

    destroy() {
      clearTimeout(sizeTimer);
      resizeObserver?.disconnect();
      map.remove();
    },
  };
}
