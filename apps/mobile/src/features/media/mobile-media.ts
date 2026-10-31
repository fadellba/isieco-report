import * as ImageManipulator from 'expo-image-manipulator';
import type * as ImagePicker from 'expo-image-picker';

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
