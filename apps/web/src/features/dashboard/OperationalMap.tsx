import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

interface MapFeature {
  kind: 'DOSSIER' | 'SIGNALEMENT';
  id: string;
  title: string;
  status: string;
  priority: string | null;
  latitude: string | null;
  longitude: string | null;
  locationLabel: string | null;
  occurredAt: string | null;
  teamNames: string[];
  activeInterventions: number;
  wasteTypes: string[];
}

interface MapViewportBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface OperationalMapProps {
  features: MapFeature[];
  selectedFeatureId: string | null;
  onSelectFeature: (id: string) => void;
  onViewportChange: (bounds: MapViewportBounds) => void;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface Tile {
  key: string;
  left: number;
  top: number;
  url: string;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 6;
const MAX_ZOOM = 18;
const DEFAULT_CENTER = { latitude: 14.7167, longitude: -17.4677 };
const DEFAULT_ZOOM = 12;
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ENV = import.meta.env as unknown as {
  VITE_MAP_TILE_URL?: string;
  VITE_MAP_ATTRIBUTION?: string;
};
const TILE_URL_TEMPLATE = MAP_ENV.VITE_MAP_TILE_URL?.trim() || OSM_TILE_URL;
const TILE_ATTRIBUTION = MAP_ENV.VITE_MAP_ATTRIBUTION?.trim() || '© OpenStreetMap contributors';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function project(coordinate: Coordinate, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const latitude = clamp(coordinate.latitude, -85.05112878, 85.05112878);
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((coordinate.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function unproject(point: { x: number; y: number }, zoom: number): Coordinate {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (point.x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * point.y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitude, longitude };
}

function mapTileUrl(zoom: number, x: number, y: number) {
  return TILE_URL_TEMPLATE
    .replaceAll('{z}', String(zoom))
    .replaceAll('{x}', String(x))
    .replaceAll('{y}', String(y));
}

function featureCoordinate(feature: MapFeature): Coordinate | null {
  const latitude = feature.latitude === null ? Number.NaN : Number(feature.latitude);
  const longitude = feature.longitude === null ? Number.NaN : Number(feature.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export function OperationalMap({ features, selectedFeatureId, onSelectFeature, onViewportChange }: OperationalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; centerX: number; centerY: number } | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 960, height: 460 });
  const [center, setCenter] = useState<Coordinate>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [tileError, setTileError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fittedRef = useRef(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        setViewport({ width: Math.round(bounds.width), height: Math.round(bounds.height) });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fittedRef.current || !features.length) return;
    const coordinates = features.map(featureCoordinate).filter((item): item is Coordinate => item !== null);
    if (!coordinates.length) return;
    const latitudes = coordinates.map((item) => item.latitude);
    const longitudes = coordinates.map((item) => item.longitude);
    const latitudeSpan = Math.max(...latitudes) - Math.min(...latitudes);
    const longitudeSpan = Math.max(...longitudes) - Math.min(...longitudes);
    const span = Math.max(latitudeSpan, longitudeSpan, 0.002);
    setCenter({
      latitude: (Math.max(...latitudes) + Math.min(...latitudes)) / 2,
      longitude: (Math.max(...longitudes) + Math.min(...longitudes)) / 2,
    });
    setZoom(clamp(Math.floor(Math.log2(180 / span)), 9, 15));
    fittedRef.current = true;
  }, [features]);

  const centerPoint = useMemo(() => project(center, zoom), [center, zoom]);
  const visibleBounds = useMemo<MapViewportBounds>(() => {
    const southWest = unproject({
      x: centerPoint.x - viewport.width / 2,
      y: centerPoint.y + viewport.height / 2,
    }, zoom);
    const northEast = unproject({
      x: centerPoint.x + viewport.width / 2,
      y: centerPoint.y - viewport.height / 2,
    }, zoom);
    const normalizeLongitude = (longitude: number) =>
      ((longitude + 180) % 360 + 360) % 360 - 180;
    return {
      minLat: clamp(southWest.latitude, -90, 90),
      maxLat: clamp(northEast.latitude, -90, 90),
      minLon: normalizeLongitude(southWest.longitude),
      maxLon: normalizeLongitude(northEast.longitude),
    };
  }, [centerPoint, viewport, zoom]);

  useEffect(() => {
    const timer = window.setTimeout(() => onViewportChange(visibleBounds), 350);
    return () => window.clearTimeout(timer);
  }, [onViewportChange, visibleBounds]);
  const mapOrigin = useMemo(() => ({
    x: centerPoint.x - viewport.width / 2,
    y: centerPoint.y - viewport.height / 2,
  }), [centerPoint, viewport]);

  const tiles = useMemo<Tile[]>(() => {
    const worldTileCount = 2 ** zoom;
    const firstX = Math.floor(mapOrigin.x / TILE_SIZE);
    const lastX = Math.floor((mapOrigin.x + viewport.width) / TILE_SIZE);
    const firstY = Math.max(0, Math.floor(mapOrigin.y / TILE_SIZE));
    const lastY = Math.min(worldTileCount - 1, Math.floor((mapOrigin.y + viewport.height) / TILE_SIZE));
    const result: Tile[] = [];
    for (let tileY = firstY; tileY <= lastY; tileY += 1) {
      for (let tileX = firstX; tileX <= lastX; tileX += 1) {
        const wrappedX = ((tileX % worldTileCount) + worldTileCount) % worldTileCount;
        result.push({
          key: `${zoom}/${tileX}/${tileY}`,
          left: tileX * TILE_SIZE - mapOrigin.x,
          top: tileY * TILE_SIZE - mapOrigin.y,
          url: mapTileUrl(zoom, wrappedX, tileY),
        });
      }
    }
    return result;
  }, [mapOrigin, viewport, zoom]);

  const markers = useMemo(() => features.flatMap((feature) => {
    const coordinate = featureCoordinate(feature);
    if (!coordinate) return [];
    const point = project(coordinate, zoom);
    const worldSize = TILE_SIZE * 2 ** zoom;
    let deltaX = point.x - centerPoint.x;
    if (deltaX > worldSize / 2) deltaX -= worldSize;
    if (deltaX < -worldSize / 2) deltaX += worldSize;
    const left = viewport.width / 2 + deltaX;
    const top = viewport.height / 2 + point.y - centerPoint.y;
    if (left < -18 || left > viewport.width + 18 || top < -18 || top > viewport.height + 18) return [];
    return [{ feature, left, top }];
  }), [features, centerPoint, viewport, zoom]);

  function zoomBy(amount: number) {
    setZoom((current) => clamp(current + amount, MIN_ZOOM, MAX_ZOOM));
  }

  function fitAll() {
    const coordinates = features.map(featureCoordinate).filter((item): item is Coordinate => item !== null);
    if (!coordinates.length) {
      setCenter(DEFAULT_CENTER);
      setZoom(DEFAULT_ZOOM);
      return;
    }
    const latitudes = coordinates.map((item) => item.latitude);
    const longitudes = coordinates.map((item) => item.longitude);
    const span = Math.max(
      Math.max(...latitudes) - Math.min(...latitudes),
      Math.max(...longitudes) - Math.min(...longitudes),
      0.002,
    );
    setCenter({
      latitude: (Math.max(...latitudes) + Math.min(...latitudes)) / 2,
      longitude: (Math.max(...longitudes) + Math.min(...longitudes)) / 2,
    });
    setZoom(clamp(Math.floor(Math.log2(180 / span)), 9, 15));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button, a')) return;
    const point = project(center, zoom);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerX: point.x,
      centerY: point.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextPoint = {
      x: drag.centerX - (event.clientX - drag.startX),
      y: drag.centerY - (event.clientY - drag.startY),
    };
    setCenter(unproject(nextPoint, zoom));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div className="operational-map">
      <div
        ref={containerRef}
        className={dragging ? 'operational-map__viewport is-dragging' : 'operational-map__viewport'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="region"
        aria-label="Carte interactive des dossiers et signalements géolocalisés"
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            className="operational-map__tile"
            src={tile.url}
            alt=""
            draggable={false}
            onError={() => setTileError(true)}
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
        {markers.map(({ feature, left, top }) => (
          <button
            key={feature.kind + ':' + feature.id}
            type="button"
            className={[
              'operational-map__marker',
              feature.kind === 'DOSSIER' ? 'is-case' : 'is-report',
              feature.priority === 'CRITIQUE' ? 'is-critical' : '',
              selectedFeatureId === feature.id ? 'is-selected' : '',
            ].filter(Boolean).join(' ')}
            style={{ left, top }}
            onClick={() => onSelectFeature(feature.id)}
            title={feature.title}
            aria-label={`${feature.kind === 'DOSSIER' ? 'Dossier' : 'Signalement'} : ${feature.title}`}
          >
            <span />
          </button>
        ))}
        {!markers.length ? (
          <div className="operational-map__empty">
            <strong>Aucun élément à afficher dans cette zone</strong>
            <span>Les points apparaissent uniquement lorsque des coordonnées sont enregistrées.</span>
          </div>
        ) : null}
        <div className="operational-map__controls" aria-label="Contrôles de la carte">
          <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom avant">+</button>
          <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom arrière">−</button>
          <button type="button" onClick={fitAll} aria-label="Centrer sur les opérations">⌖</button>
        </div>
        <div className="operational-map__zoom">Niveau {zoom}</div>
        <div className="operational-map__attribution">
          <span>{TILE_ATTRIBUTION}</span>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Licence</a>
          <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Signaler une erreur</a>
        </div>
      </div>
      {tileError ? <p className="operational-map__tile-error">Certaines tuiles de fond ne sont pas disponibles. Les données métier restent consultables.</p> : null}
    </div>
  );
}
