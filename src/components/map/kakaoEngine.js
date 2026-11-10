// 카카오 지도. 핀·팝업은 CustomOverlay(HTML)로 그려 Leaflet 때와 같은 모양을 유지
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

const MIN_LEVEL = 1;
const MAX_LEVEL = 14;

// Leaflet 줌(클수록 확대) → 카카오 레벨(작을수록 확대). 축척을 맞춰 보면 줌 15 ≈ 레벨 5
const zoomToLevel = (zoom) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, 20 - (zoom || 15)));

// 도형 클릭과 지도 클릭이 같이 들어오는 경우를 한 번으로 합치는 간격
const CLICK_DEDUPE_MS = 150;

export function createKakaoEngine(container, center) {
  const maps = window.kakao.maps;
  const toLatLng = ([lat, lng]) => new maps.LatLng(lat, lng);

  const map = new maps.Map(container, {
    center: new maps.LatLng(center.lat, center.lng),
    level: zoomToLevel(center.zoom),
  });

  const resizeObserver = window.ResizeObserver ? new ResizeObserver(() => map.relayout()) : null;
  resizeObserver?.observe(container);

  // 핀에 키보드 포커스가 가면 브라우저가 지도 상자 자체를 스크롤해 지도가 밀림 → 항상 제자리로
  const resetScroll = () => {
    if (container.scrollTop || container.scrollLeft) {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    }
  };
  container.addEventListener('scroll', resetScroll);

  const layers = { spots: [], zones: [], hazards: [], route: [], other: null, endpoints: [] };
  const clear = (list) => list.forEach((item) => item.setMap(null));

  // HTML 핀 하나 (clickable: 핀을 눌러도 지도 클릭으로 넘어가지 않음)
  function addOverlay(latLng, html, { width, height, xAnchor = 0.5, yAnchor = 0.5, zIndex = 1, title, onClick }) {
    const el = document.createElement('div');
    el.className = 'kmap-marker';
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.innerHTML = html;
    if (title) el.title = title;
    if (onClick) {
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      });
    }
    const overlay = new maps.CustomOverlay({ position: latLng, content: el, xAnchor, yAnchor, zIndex, clickable: true });
    overlay.setMap(map);
    return overlay;
  }

  // 팝업은 하나만 띄우고 지도를 누르면 닫음
  const popup = new maps.CustomOverlay({ xAnchor: 0.5, yAnchor: 1, zIndex: 1200, clickable: true });
  function openPopup(latLng, html) {
    const el = document.createElement('div');
    el.className = 'kmap-popup';
    el.innerHTML = html;
    popup.setContent(el);
    popup.setPosition(latLng);
    popup.setMap(map);
  }
  const closePopup = () => popup.setMap(null);

  const tooltip = new maps.CustomOverlay({ xAnchor: 0.5, yAnchor: 1.6, zIndex: 1200 });
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'kmap-tooltip';
  tooltip.setContent(tooltipEl);

  // 지도 클릭 전달. 다른 경로선을 눌렀을 때는 지도 클릭으로 치지 않음
  const clickListeners = new Set();
  let lastShapeClickAt = 0;
  let lastEmitAt = 0;
  function emitClick(latLng) {
    if (Date.now() - lastEmitAt < CLICK_DEDUPE_MS) return;
    lastEmitAt = Date.now();
    closePopup();
    const point = { lat: latLng.getLat(), lng: latLng.getLng() };
    clickListeners.forEach((fn) => fn(point));
  }
  const onMapClick = (mouseEvent) => {
    const latLng = mouseEvent.latLng;
    // 도형 클릭 이벤트가 지도 클릭보다 늦게 올 수도 있어 한 박자 미룸
    setTimeout(() => {
      if (Date.now() - lastShapeClickAt < CLICK_DEDUPE_MS) return;
      emitClick(latLng);
    }, 0);
  };
  maps.event.addListener(map, 'click', onMapClick);

  function fitPath(path) {
    const bounds = new maps.LatLngBounds();
    path.forEach((p) => bounds.extend(toLatLng(p)));
    const pad = fitPadding();
    map.setBounds(bounds, pad.top, pad.right, pad.bottom, pad.left);
  }

  let routePath = null;
  let pickCursor = false;
  const restoreCursor = () => map.setCursor(pickCursor ? 'crosshair' : '');

  return {
    name: 'kakao',

    onClick(handler) {
      clickListeners.add(handler);
      return () => clickListeners.delete(handler);
    },

    flyTo(lat, lng, zoom) {
      map.setLevel(zoomToLevel(zoom));
      map.panTo(new maps.LatLng(lat, lng));
    },

    setSpots(spots) {
      clear(layers.spots);
      layers.spots = [];
      spots.forEach((spot) => {
        const ll = spotLatLng(spot);
        if (!ll) return;
        const latLng = toLatLng(ll);
        const area = new maps.Circle({
          center: latLng,
          radius: spot.radius || 300,
          strokeWeight: 1,
          strokeColor: COLORS.accident,
          strokeOpacity: 0.35,
          fillColor: COLORS.accident,
          fillOpacity: 0.06,
        });
        area.setMap(map);
        // 원 안을 눌러도 출발지·도착지 고르기가 되도록 지도 클릭으로 넘김
        maps.event.addListener(area, 'click', (mouseEvent) => emitClick(mouseEvent.latLng));
        const dot = addOverlay(latLng, '<div class="kmap-dot accident"></div>', {
          width: 12,
          height: 12,
          zIndex: 3,
          title: spot.spot_nm || '사고다발지역',
          onClick: () => openPopup(latLng, spotPopupHtml(spot)),
        });
        layers.spots.push(area, dot);
      });
    },

    setZones(zones) {
      clear(layers.zones);
      layers.zones = zones
        .map((zone) => {
          const ll = zoneLatLng(zone);
          if (!ll) return null;
          const latLng = toLatLng(ll);
          return addOverlay(latLng, zoneHtml(zone), {
            width: 12,
            height: 12,
            zIndex: 4,
            title: zone.name,
            onClick: () => openPopup(latLng, zonePopupHtml(zone)),
          });
        })
        .filter(Boolean);
    },

    setRoute({ path, segments, altPath, origin, destination, onSelectOther }) {
      clear(layers.route);
      clear(layers.endpoints);
      layers.other?.setMap(null);
      tooltip.setMap(null);
      layers.route = [];
      layers.endpoints = [];
      layers.other = null;
      routePath = path?.length ? path : null;

      if (altPath?.length) {
        const other = new maps.Polyline({
          path: altPath.map(toLatLng),
          strokeWeight: 6,
          strokeColor: COLORS.routeOther,
          strokeOpacity: 0.95,
          strokeStyle: 'shortdot',
          zIndex: 5,
        });
        other.setMap(map);
        maps.event.addListener(other, 'click', () => {
          lastShapeClickAt = Date.now();
          tooltip.setMap(null);
          onSelectOther?.();
        });
        maps.event.addListener(other, 'mouseover', (mouseEvent) => {
          tooltipEl.textContent = '다른 경로 보기';
          tooltip.setPosition(mouseEvent.latLng);
          tooltip.setMap(map);
          map.setCursor('pointer');
        });
        maps.event.addListener(other, 'mousemove', (mouseEvent) => tooltip.setPosition(mouseEvent.latLng));
        maps.event.addListener(other, 'mouseout', () => {
          tooltip.setMap(null);
          restoreCursor();
        });
        layers.other = other;
      }

      if (routePath) {
        const casing = new maps.Polyline({
          path: routePath.map(toLatLng),
          strokeWeight: 11,
          strokeColor: '#ffffff',
          strokeOpacity: 1,
          zIndex: 6,
        });
        casing.setMap(map);
        const parts = segments?.length ? segments : [{ level: 0, path: routePath }];
        const lines = parts.map((seg) => {
          const line = new maps.Polyline({
            path: seg.path.map(toLatLng),
            strokeWeight: 7,
            strokeColor: SEGMENT_COLORS[seg.level] || COLORS.route,
            strokeOpacity: 1,
            zIndex: 7,
          });
          line.setMap(map);
          return line;
        });
        layers.route = [casing, ...lines];
        fitPath(routePath);
      }

      [
        [origin, '출발', 'origin'],
        [destination, '도착', 'destination'],
      ].forEach(([point, label, kind]) => {
        if (!point) return;
        layers.endpoints.push(
          addOverlay(new maps.LatLng(point.lat, point.lng), endpointHtml(label, kind), {
            width: 44,
            height: 40,
            yAnchor: 1,
            zIndex: 900,
          })
        );
      });
    },

    fitRoute() {
      if (routePath) fitPath(routePath);
    },

    setHazards(hazards, selectedId, onSelect) {
      clear(layers.hazards);
      layers.hazards = hazards.map((h, i) => {
        const selected = selectedId === h.id;
        const size = selected ? 34 : 26;
        return addOverlay(new maps.LatLng(h.lat, h.lng), hazardHtml(i + 1, h.kind, selected), {
          width: size,
          height: size,
          zIndex: selected ? 1000 : 800,
          title: h.name,
          onClick: () => onSelect?.(h),
        });
      });
    },

    // 선택 지점이 화면 가장자리(바깥 15%)에 있으면 가운데로
    focus(lat, lng) {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const padLat = (ne.getLat() - sw.getLat()) * 0.15;
      const padLng = (ne.getLng() - sw.getLng()) * 0.15;
      const inside =
        lat > sw.getLat() + padLat &&
        lat < ne.getLat() - padLat &&
        lng > sw.getLng() + padLng &&
        lng < ne.getLng() - padLng;
      if (!inside) map.panTo(new maps.LatLng(lat, lng));
    },

    zoomIn: () => map.setLevel(Math.max(MIN_LEVEL, map.getLevel() - 1), { animate: true }),
    zoomOut: () => map.setLevel(Math.min(MAX_LEVEL, map.getLevel() + 1), { animate: true }),

    setPickCursor(on) {
      pickCursor = on;
      restoreCursor();
    },

    destroy() {
      resizeObserver?.disconnect();
      container.removeEventListener('scroll', resetScroll);
      maps.event.removeListener(map, 'click', onMapClick);
      clickListeners.clear();
      [layers.spots, layers.zones, layers.hazards, layers.route, layers.endpoints].forEach(clear);
      layers.other?.setMap(null);
      closePopup();
      tooltip.setMap(null);
      container.innerHTML = '';
    },
  };
}
