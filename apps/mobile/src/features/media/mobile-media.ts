import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { isUsableRecentPosition } from './mobile-location-utils.mjs';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export interface PreparedMobilePhoto {
  uri: string;
  name: string;
  type: 'image/jpeg';
}

/**
 * Re-encodes picked assets as JPEG and bounds the longest edge so HEIC
 * photos from iOS can be accepted by the private
 * JPEG/PNG/WebP API without uploading the original camera file.
 */
export async function prepareMobilePhoto(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PreparedMobilePhoto> {
  const longestEdge = Math.max(asset.width, asset.height);
  const resize =
    asset.width >= asset.height
      ? {
          width: 1600,
          height: Math.max(1, Math.round((asset.height * 1600) / asset.width)),
        }
      : {
          width: Math.max(1, Math.round((asset.width * 1600) / asset.height)),
          height: 1600,
        };
  const actions = longestEdge > 1600 ? [{ resize }] : [];
  const saved = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.82,
  });

  const baseName =
    (asset.fileName ?? 'isieco-photo')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 60) || 'isieco-photo';

  return {
    uri: saved.uri,
    name: baseName + '.jpg',
    type: 'image/jpeg',
  };
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
    throw new Error(
      'L’autorisation caméra est nécessaire pour prendre une photo. Vous pouvez aussi choisir une image dans la galerie.',
    );
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
  source: 'current' | 'last-known';
}

function mapLocation(
  position: Location.LocationObject,
  source: ForegroundCoordinates['source'],
): ForegroundCoordinates {
  const { latitude, longitude, accuracy } = position.coords;
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Le téléphone a renvoyé des coordonnées GPS invalides.');
  }

  return {
    latitude,
    longitude,
    source,
    ...(typeof accuracy === 'number' && Number.isFinite(accuracy)
      ? { precisionLocalisation: Math.max(0, Math.round(accuracy)) }
      : {}),
  };
}

export async function requestCurrentForegroundCoordinates(): Promise<ForegroundCoordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      permission.canAskAgain
        ? 'Autorisez la localisation pendant l’utilisation d’ISIECO pour associer votre position au signalement.'
        : 'La localisation est bloquée pour ISIECO. Activez l’autorisation dans les réglages du téléphone, ou indiquez un repère dans le formulaire.',
    );
  }

  let servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled && Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      // The user may decline the system prompt. The check below gives the actionable message.
    }
    servicesEnabled = await Location.hasServicesEnabledAsync();
  }
  if (!servicesEnabled) {
    throw new Error(
      'La localisation du téléphone est désactivée. Activez le service de localisation puis réessayez, ou précisez le lieu dans le formulaire.',
    );
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const current = await Promise.race<Location.LocationObject>([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      }),
      new Promise<Location.LocationObject>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('LOCATION_FIX_TIMEOUT')), 20_000);
      }),
    ]);
    return mapLocation(current, 'current');
  } catch (reason) {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 2 * 60 * 1000,
      requiredAccuracy: 1000,
    }).catch(() => null);

    if (isUsableRecentPosition(lastKnown)) {
      return mapLocation(lastKnown, 'last-known');
    }

    if (reason instanceof Error && reason.message === 'LOCATION_FIX_TIMEOUT') {
      throw new Error(
        'Le GPS met trop de temps à répondre. Réessayez à l’extérieur, activez la localisation ou indiquez un repère dans le formulaire.',
      );
    }
    throw new Error(
      'Position GPS indisponible. Vérifiez les autorisations et les réglages de localisation, ou indiquez un repère dans le formulaire.',
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
