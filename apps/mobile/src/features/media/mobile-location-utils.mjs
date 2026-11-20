export const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;
export const LAST_KNOWN_MAX_ACCURACY_METERS = 1000;

export function isUsableRecentPosition(position, now = Date.now()) {
  if (!position || !position.coords) return false;

  const { latitude, longitude, accuracy } = position.coords;
  const age = now - Number(position.timestamp);

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= LAST_KNOWN_MAX_ACCURACY_METERS &&
    Number.isFinite(position.timestamp) &&
    age >= 0 &&
    age <= LAST_KNOWN_MAX_AGE_MS
  );
}
