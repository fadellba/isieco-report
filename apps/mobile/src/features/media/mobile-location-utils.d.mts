import type * as Location from 'expo-location';

export const LAST_KNOWN_MAX_AGE_MS: number;
export const LAST_KNOWN_MAX_ACCURACY_METERS: number;
export function isUsableRecentPosition(
  position: Location.LocationObject | null | undefined,
  now?: number,
): position is Location.LocationObject;
