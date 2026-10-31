import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export interface PreparedMobilePhoto {
  uri: string;
  name: string;
  type: 'image/jpeg';
}

export const MOBILE_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Re-encodes picked assets as JPEG, strips source EXIF metadata, and bounds
 * the longest edge so HEIC photos from iOS can be accepted by the private
 * JPEG/PNG/WebP API without uploading the original camera file.
 */
export async function prepareMobilePhoto(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PreparedMobilePhoto> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > 1600) {
    context.resize({ width: 1600, height: null });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.82,
  });

  const baseName = (asset.fileName ?? 'isieco-photo')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 60) || 'isieco-photo';

  return {
    uri: saved.uri,
    name: baseName + '.jpg',
    type: 'image/jpeg',
  };
}

/**
 * React Native's FormData implementation accepts the documented
 * { uri, name, type } file descriptor. The API client leaves Content-Type
 * unset so fetch can generate the correct multipart boundary.
 */
export function appendMobilePhoto(form: FormData, photo: PreparedMobilePhoto): void {
  form.append('file', photo as unknown as Blob);
}

export async function pickMobilePhotos(selectionLimit = 3): Promise<PreparedMobilePhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit,
    quality: 0.86,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, selectionLimit).map(prepareMobilePhoto));
}

export async function captureMobilePhoto(): Promise<PreparedMobilePhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('L’autorisation caméra est nécessaire pour prendre une photo. Vous pouvez aussi choisir une image dans la galerie.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.86,
  });
  if (result.canceled || !result.assets[0]) return null;
  return prepareMobilePhoto(result.assets[0]);
}

export interface ForegroundCoordinates {
  latitude: number;
  longitude: number;
  precisionLocalisation?: number;
}

export async function requestCurrentForegroundCoordinates(): Promise<ForegroundCoordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('L’autorisation de localisation a été refusée. Vous pouvez toujours saisir les coordonnées manuellement.');
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const accuracy = current.coords.accuracy;
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    ...(typeof accuracy === 'number' && Number.isFinite(accuracy)
      ? { precisionLocalisation: Math.max(0, Math.round(accuracy)) }
      : {}),
  };
}
