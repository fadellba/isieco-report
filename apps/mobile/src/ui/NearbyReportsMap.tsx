import { useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import type { NearbyReportMarker } from '../features/reports/reports-api';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface NearbyReportsMapProps {
  center: Coordinates;
  markers: NearbyReportMarker[];
}

const TILE_SIZE = 256;
const ZOOM = 14;
const USER_AGENT = 'ISIECO/0.1.0 (+https://github.com/fadellba/isieco-report)';

function worldPoint(latitude: number, longitude: number) {
  const scale = TILE_SIZE * 2 ** ZOOM;
  const boundedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((boundedLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export function NearbyReportsMap({ center, markers }: NearbyReportsMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const layout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  };

  const map = useMemo(() => {
    if (size.width <= 0 || size.height <= 0) return { tiles: [], pins: [] };
    const centerPoint = worldPoint(center.latitude, center.longitude);
    const originX = centerPoint.x - size.width / 2;
    const originY = centerPoint.y - size.height / 2;
    const tileCount = 2 ** ZOOM;
    const firstX = Math.floor(originX / TILE_SIZE);
    const lastX = Math.floor((originX + size.width) / TILE_SIZE);
    const firstY = Math.max(0, Math.floor(originY / TILE_SIZE));
    const lastY = Math.min(tileCount - 1, Math.floor((originY + size.height) / TILE_SIZE));
    const tiles: Array<{ key: string; uri: string; left: number; top: number }> = [];

    for (let tileY = firstY; tileY <= lastY; tileY += 1) {
      for (let tileX = firstX; tileX <= lastX; tileX += 1) {
        const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
        tiles.push({
          key: tileX + ':' + tileY,
          uri: `https://tile.openstreetmap.org/${ZOOM}/${wrappedX}/${tileY}.png`,
          left: tileX * TILE_SIZE - originX,
          top: tileY * TILE_SIZE - originY,
        });
      }
    }

    const pins = markers.flatMap((marker) => {
      const point = worldPoint(marker.latitude, marker.longitude);
      let deltaX = point.x - centerPoint.x;
      const worldSize = TILE_SIZE * tileCount;
      if (deltaX > worldSize / 2) deltaX -= worldSize;
      if (deltaX < -worldSize / 2) deltaX += worldSize;
      const left = size.width / 2 + deltaX;
      const top = size.height / 2 + point.y - centerPoint.y;
      if (left < 0 || left > size.width || top < 0 || top > size.height) return [];
      return [{ id: marker.idSignalement, left, top, distance: marker.distanceMeters }];
    });

    return { tiles, pins };
  }, [center.latitude, center.longitude, markers, size.height, size.width]);

  return (
    <View
      onLayout={layout}
      className="h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#e8eee5]"
      accessibilityLabel="Carte OpenStreetMap des signalements qualifiés à proximité"
    >
      {map.tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.uri, headers: { 'User-Agent': USER_AGENT } }}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            left: tile.left,
            top: tile.top,
            width: TILE_SIZE,
            height: TILE_SIZE,
          }}
        />
      ))}

      {map.pins.map((pin) => (
        <Pressable
          key={pin.id}
          onPress={() => setSelectedId((current) => current === pin.id ? null : pin.id)}
          accessibilityRole="button"
          accessibilityLabel={`Signalement qualifié à ${pin.distance} mètres`}
          style={{
            position: 'absolute',
            left: pin.left - 14,
            top: pin.top - 28,
            zIndex: selectedId === pin.id ? 20 : 10,
            alignItems: 'center',
          }}
        >
          <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-700 shadow-md">
            <Text className="text-xs text-white">●</Text>
          </View>
          {selectedId === pin.id ? (
            <View className="mt-1 rounded-lg bg-white px-2 py-1 shadow">
              <Text className="text-[10px] font-bold text-slate-800">
                Signalement • {pin.distance} m
              </Text>
            </View>
          ) : null}
        </Pressable>
      ))}

      <View
        pointerEvents="none"
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-2 -translate-y-2 items-center justify-center rounded-full border-2 border-white bg-sky-600 shadow"
      >
        <View className="h-1.5 w-1.5 rounded-full bg-white" />
      </View>

      <View className="absolute bottom-0 right-0 rounded-tl-lg bg-white/95 px-2 py-1">
        <Text className="text-[9px] text-slate-700">© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}
