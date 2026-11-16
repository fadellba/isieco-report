'use dom';

import { useEffect, useRef } from 'react';

export interface NativeMapMarker {
  id: string;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  tone?: 'success' | 'warning' | 'danger';
}

interface NativeMapCanvasProps {
  markers: NativeMapMarker[];
  selectedId?: string | null;
  onSelect: (id: string) => Promise<void>;
  emptyLabel?: string;
  centerCoordinates?: { latitude: number; longitude: number } | null;
  allowCenterSelection?: boolean;
  onChooseCenter?: (coordinates: { latitude: number; longitude: number }) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
const DEFAULT_CENTER = { latitude: 14.7167, longitude: -17.4677 };

function worldPoint(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const boundedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((boundedLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function fitCenter(markers: NativeMapMarker[]) {
  const valid = markers.filter((marker) =>
    Number.isFinite(marker.latitude) &&
    Number.isFinite(marker.longitude) &&
    marker.latitude >= -90 && marker.latitude <= 90 &&
    marker.longitude >= -180 && marker.longitude <= 180,
  );
  if (!valid.length) return DEFAULT_CENTER;
  const latitudes = valid.map((marker) => marker.latitude);
  const longitudes = valid.map((marker) => marker.longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

export default function NativeMapCanvas({
  markers,
  selectedId = null,
  onSelect,
  emptyLabel,
  centerCoordinates = null,
  allowCenterSelection = false,
  onChooseCenter,
  dom,
}: NativeMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const onChooseCenterRef = useRef(onChooseCenter);
  const centerKey = centerCoordinates ? `${centerCoordinates.latitude}:${centerCoordinates.longitude}` : '';
  const lastCenterKey = useRef('');
  const viewState = useRef<{
    center: { latitude: number; longitude: number };
    zoom: number;
    initialized: boolean;
  }>({ center: DEFAULT_CENTER, zoom: 13, initialized: false });

  useEffect(() => {
    onSelectRef.current = onSelect;
    onChooseCenterRef.current = onChooseCenter;
  }, [onSelect, onChooseCenter]);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    const tileLayer = container.querySelector<HTMLDivElement>('[data-map-tiles]');
    const markerLayer = container.querySelector<HTMLDivElement>('[data-map-markers]');
    const emptyNotice = container.querySelector<HTMLDivElement>('[data-map-empty]');
    if (!tileLayer || !markerLayer || !emptyNotice) return;

    if (!viewState.current.initialized) {
      viewState.current.center = centerCoordinates ?? fitCenter(markers);
      viewState.current.zoom = markers.length > 1 ? 13 : 15;
      viewState.current.initialized = true;
      lastCenterKey.current = centerKey;
    } else if (centerKey && centerKey !== lastCenterKey.current && centerCoordinates) {
      viewState.current.center = centerCoordinates;
      lastCenterKey.current = centerKey;
    }

    let disposed = false;

    const render = () => {
      if (disposed) return;
      const bounds = container.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const { center, zoom } = viewState.current;
      const centerPoint = worldPoint(center.latitude, center.longitude, zoom);
      const originX = centerPoint.x - width / 2;
      const originY = centerPoint.y - height / 2;
      const worldTileCount = 2 ** zoom;
      const firstX = Math.floor(originX / TILE_SIZE) - 1;
      const lastX = Math.floor((originX + width) / TILE_SIZE) + 1;
      const firstY = Math.max(0, Math.floor(originY / TILE_SIZE) - 1);
      const lastY = Math.min(worldTileCount - 1, Math.floor((originY + height) / TILE_SIZE) + 1);

      tileLayer.replaceChildren();
      markerLayer.replaceChildren();

      for (let tileY = firstY; tileY <= lastY; tileY += 1) {
        for (let tileX = firstX; tileX <= lastX; tileX += 1) {
          const wrappedX = ((tileX % worldTileCount) + worldTileCount) % worldTileCount;
          const tile = document.createElement('img');
          tile.src = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`;
          tile.alt = '';
          tile.draggable = false;
          tile.decoding = 'async';
          tile.loading = 'lazy';
          tile.className = 'isieco-map__tile';
          tile.style.left = `${tileX * TILE_SIZE - originX}px`;
          tile.style.top = `${tileY * TILE_SIZE - originY}px`;
          tileLayer.appendChild(tile);
        }
      }

      const validMarkers = markers.filter((marker) =>
        Number.isFinite(marker.latitude) &&
        Number.isFinite(marker.longitude) &&
        marker.latitude >= -90 && marker.latitude <= 90 &&
        marker.longitude >= -180 && marker.longitude <= 180,
      );

      for (const marker of validMarkers) {
        const point = worldPoint(marker.latitude, marker.longitude, zoom);
        let deltaX = point.x - centerPoint.x;
        const worldSize = TILE_SIZE * worldTileCount;
        if (deltaX > worldSize / 2) deltaX -= worldSize;
        if (deltaX < -worldSize / 2) deltaX += worldSize;
        const left = width / 2 + deltaX;
        const top = height / 2 + point.y - centerPoint.y;
        if (left < -35 || left > width + 35 || top < -45 || top > height + 45) continue;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = `isieco-map__marker isieco-map__marker--${marker.tone ?? 'success'}${selectedId === marker.id ? ' is-selected' : ''}`;
        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        button.setAttribute('aria-label', marker.title);
        button.dataset.markerId = marker.id;
        button.title = marker.title;
        const dot = document.createElement('span');
        dot.className = 'isieco-map__marker-dot';
        button.appendChild(dot);
        if (selectedId === marker.id) {
          const popup = document.createElement('span');
          popup.className = 'isieco-map__popup';
          const title = document.createElement('strong');
          title.textContent = marker.title;
          popup.appendChild(title);
          if (marker.subtitle) {
            const subtitle = document.createElement('small');
            subtitle.textContent = marker.subtitle;
            popup.appendChild(subtitle);
          }
          button.appendChild(popup);
        }
        markerLayer.appendChild(button);
      }

      emptyNotice.hidden = validMarkers.length > 0;
      if (emptyLabel) emptyNotice.textContent = emptyLabel;
    };

    const zoomAtCenter = (nextZoom: number) => {
      viewState.current.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
      render();
    };

    let drag: { x: number; y: number; centerX: number; centerY: number } | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('button, a')) return;
      drag = {
        x: event.clientX,
        y: event.clientY,
        centerX: worldPoint(viewState.current.center.latitude, viewState.current.center.longitude, viewState.current.zoom).x,
        centerY: worldPoint(viewState.current.center.latitude, viewState.current.center.longitude, viewState.current.zoom).y,
      };
      container.setPointerCapture?.(event.pointerId);
      container.classList.add('is-dragging');
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag) return;
      const deltaX = event.clientX - drag.x;
      const deltaY = event.clientY - drag.y;
      tileLayer.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      markerLayer.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!drag) return;
      const pointX = drag.centerX - (event.clientX - drag.x);
      const pointY = drag.centerY - (event.clientY - drag.y);
      const scale = TILE_SIZE * 2 ** viewState.current.zoom;
      const longitude = (pointX / scale) * 360 - 180;
      const n = Math.PI - (2 * Math.PI * pointY) / scale;
      const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
      viewState.current.center = {
        latitude: Math.max(-85.05112878, Math.min(85.05112878, latitude)),
        longitude: ((longitude + 180) % 360 + 360) % 360 - 180,
      };
      drag = null;
      tileLayer.style.transform = '';
      markerLayer.style.transform = '';
      container.classList.remove('is-dragging');
      render();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAtCenter(viewState.current.zoom + (event.deltaY < 0 ? 1 : -1));
    };

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-map-zoom], [data-marker-id], [data-map-use-center]');
      if (!target) return;
      if (target.dataset.mapZoom) {
        zoomAtCenter(viewState.current.zoom + (target.dataset.mapZoom === 'in' ? 1 : -1));
        return;
      }
      if (target.dataset.mapUseCenter === 'true' && onChooseCenterRef.current) {
        const center = viewState.current.center;
        void onChooseCenterRef.current({ latitude: center.latitude, longitude: center.longitude });
        return;
      }
      const markerId = target.dataset.markerId;
      if (markerId) void onSelectRef.current(markerId);
    };

    const observer = new ResizeObserver(render);
    observer.observe(container);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);
    render();

    return () => {
      disposed = true;
      observer.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
    };
  }, [markers, selectedId, emptyLabel, allowCenterSelection, centerKey]);

  return (
    <div ref={mapRef} className="isieco-map" role="application" aria-label="Carte interactive des signalements et missions">
      <style>{`
        .isieco-map { position:relative; width:100%; height:100%; min-height:210px; overflow:hidden; background:#e8eee5; font-family:Inter,system-ui,sans-serif; cursor:grab; touch-action:none; }
        .isieco-map.is-dragging { cursor:grabbing; }
        .isieco-map__tiles,.isieco-map__markers { position:absolute; inset:0; }
        .isieco-map__tile { position:absolute; width:256px; height:256px; max-width:none; user-select:none; pointer-events:none; }
        .isieco-map__marker { position:absolute; z-index:4; display:grid; width:27px; height:27px; place-items:center; padding:0; transform:translate(-50%,-100%) rotate(-45deg); border:2px solid white; border-radius:50% 50% 50% 3px; background:#18864d; box-shadow:0 2px 8px rgba(20,35,28,.34); cursor:pointer; }
        .isieco-map__marker--warning { background:#d28a24; }
        .isieco-map__marker--danger { background:#c94b3e; }
        .isieco-map__marker.is-selected { z-index:8; outline:3px solid rgba(18,115,73,.25); outline-offset:3px; }
        .isieco-map__marker-dot { width:7px; height:7px; border-radius:50%; background:white; }
        .isieco-map__popup { position:absolute; left:23px; bottom:19px; display:flex; min-width:130px; max-width:190px; flex-direction:column; gap:3px; padding:8px 10px; transform:rotate(45deg); border:1px solid #e0e9df; border-radius:9px; background:white; box-shadow:0 4px 16px rgba(10,40,25,.17); color:#1b3b31; text-align:left; }
        .isieco-map__popup strong { overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
        .isieco-map__popup small { overflow:hidden; color:#74847a; font-size:8px; text-overflow:ellipsis; white-space:nowrap; }
        .isieco-map__controls { position:absolute; top:12px; right:12px; z-index:10; display:flex; flex-direction:column; gap:5px; }
        .isieco-map__controls button { display:grid; width:32px; height:32px; place-items:center; border:1px solid #dce5dc; border-radius:8px; background:rgba(255,255,255,.96); color:#1f4938; box-shadow:0 2px 8px rgba(0,0,0,.1); font-size:19px; font-weight:700; }
        .isieco-map__center-pin { position:absolute; top:50%; left:50%; z-index:3; width:18px; height:18px; border:3px solid #fff; border-radius:50% 50% 50% 3px; background:#148a4c; box-shadow:0 2px 8px rgba(0,0,0,.3); transform:translate(-50%,-85%) rotate(-45deg); pointer-events:none; }
        .isieco-map__choose { position:absolute; left:50%; bottom:22px; z-index:10; padding:9px 13px; transform:translateX(-50%); border:0; border-radius:999px; background:#087844; color:#fff; box-shadow:0 3px 12px rgba(0,0,0,.2); font-size:10px; font-weight:800; white-space:nowrap; }
        .isieco-map__attribution { position:absolute; right:0; bottom:0; z-index:10; padding:4px 7px; border-top-left-radius:7px; background:rgba(255,255,255,.94); color:#405047; font-size:8px; }
        .isieco-map__attribution a { color:inherit; text-decoration:underline; }
        .isieco-map__empty { position:absolute; top:50%; left:50%; z-index:5; width:min(260px,calc(100% - 32px)); padding:12px 15px; transform:translate(-50%,-50%); border:1px solid rgba(255,255,255,.85); border-radius:12px; background:rgba(255,255,255,.94); color:#68766d; font-size:10px; line-height:1.5; text-align:center; }
        .isieco-map__empty[hidden] { display:none; }
      `}</style>
      <div className="isieco-map__tiles" data-map-tiles />
      <div className="isieco-map__markers" data-map-markers />
      {allowCenterSelection ? <div className="isieco-map__center-pin" aria-hidden="true" /> : null}
      {allowCenterSelection && onChooseCenter ? <button type="button" className="isieco-map__choose" data-map-use-center="true">Utiliser le centre de la carte</button> : null}
      <div className="isieco-map__empty" data-map-empty>{emptyLabel ?? 'Aucune position géographique disponible.'}</div>
      <div className="isieco-map__controls">
        <button type="button" data-map-zoom="in" aria-label="Zoom avant">+</button>
        <button type="button" data-map-zoom="out" aria-label="Zoom arrière">−</button>
      </div>
      <div className="isieco-map__attribution">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
        <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Signaler une erreur</a>
      </div>
    </div>
  );
}
