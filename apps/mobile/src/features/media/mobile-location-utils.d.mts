export const LAST_KNOWN_MAX_AGE_MS: number;
export const LAST_KNOWN_MAX_ACCURACY_METERS: number;
export interface RecentLocationPosition {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
}
export function isUsableRecentPosition(position: RecentLocationPosition | null | undefined, now?: number): boolean;
