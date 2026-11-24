import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { CreateReportPayload } from './reports-api';
import {
  getMyReport,
  submitReportWithPhoto,
  uploadReportPhoto,
} from './reports-api';

export interface OfflinePhotoFile {
  photoUri: string;
  photoName: string;
  photoType: 'image/jpeg';
}

export interface OfflineReportQueueItem {
  id: string;
  ownerId: string;
  idempotencyKey: string;
  payload: CreateReportPayload;
  photoUri: string;
  photoName: string;
  photoType: 'image/jpeg';
  additionalPhotos?: OfflinePhotoFile[];
  reportId?: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export interface OfflineSyncResult {
  synced: number;
  remaining: number;
}

const STORAGE_PREFIX = 'isieco:offline-reports:v1:';
const DIRECTORY = (FileSystem.documentDirectory ?? '') + 'isieco-offline-reports/';

function storageKey(ownerId: string) {
  return STORAGE_PREFIX + ownerId;
}

async function readQueue(ownerId: string): Promise<OfflineReportQueueItem[]> {
  const raw = await AsyncStorage.getItem(storageKey(ownerId));
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is OfflineReportQueueItem => {
      if (typeof item !== 'object' || item === null) return false;
      const candidate = item as Partial<OfflineReportQueueItem>;
      return candidate.ownerId === ownerId &&
        typeof candidate.id === 'string' &&
        typeof candidate.idempotencyKey === 'string' &&
        typeof candidate.photoUri === 'string' &&
        typeof candidate.photoName === 'string' &&
        (candidate.additionalPhotos === undefined ||
          (Array.isArray(candidate.additionalPhotos) &&
            candidate.additionalPhotos.every((photo) =>
              typeof photo.photoUri === 'string' &&
              typeof photo.photoName === 'string' &&
              photo.photoType === 'image/jpeg')));
    });
  } catch {
    return [];
  }
}

async function writeQueue(ownerId: string, items: OfflineReportQueueItem[]) {
  if (items.length === 0) {
    await AsyncStorage.removeItem(storageKey(ownerId));
    return;
  }
  await AsyncStorage.setItem(storageKey(ownerId), JSON.stringify(items));
}

const queueMutationTails = new Map<string, Promise<void>>();

async function updateQueue(
  ownerId: string,
  update: (items: OfflineReportQueueItem[]) => OfflineReportQueueItem[],
): Promise<OfflineReportQueueItem[]> {
  const previous = queueMutationTails.get(ownerId) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = () => resolve();
  });
  queueMutationTails.set(ownerId, current);

  await previous;
  try {
    const currentItems = await readQueue(ownerId);
    const nextItems = update(currentItems);
    await writeQueue(ownerId, nextItems);
    return nextItems;
  } finally {
    release();
    if (queueMutationTails.get(ownerId) === current) {
      queueMutationTails.delete(ownerId);
    }
  }
}

async function ensureDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Le stockage local permanent est indisponible sur cet appareil.');
  }
  const info = await FileSystem.getInfoAsync(DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
  }
}

export async function queueOfflineReport(input: {
  ownerId: string;
  idempotencyKey: string;
  payload: CreateReportPayload;
  photos: Array<{ uri: string; name: string; type: 'image/jpeg' }>;
}): Promise<OfflineReportQueueItem> {
  if (!input.ownerId.trim()) throw new Error('Le compte connecté est requis pour la file hors ligne.');
  if (input.photos.length < 1 || input.photos.length > 3) {
    throw new Error('Un signalement hors ligne doit contenir entre 1 et 3 photos.');
  }
  await ensureDirectory();

  const id = 'offline-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const copyPhoto = async (photo: { uri: string; name: string }, suffix: string) => {
    const extension = photo.name.toLowerCase().endsWith('.jpg') ? '.jpg' : '.jpeg';
    const photoUri = DIRECTORY + id + suffix + extension;
    await FileSystem.copyAsync({ from: photo.uri, to: photoUri });
    return {
      photoUri,
      photoName: photo.name,
      photoType: 'image/jpeg' as const,
    };
  };

  const copied: OfflinePhotoFile[] = [];
  try {
    const primaryPhoto = input.photos[0];
    if (!primaryPhoto) throw new Error('La photo principale est absente.');
    const primary = await copyPhoto(primaryPhoto, '');
    copied.push(primary);
    const additionalPhotos: OfflinePhotoFile[] = [];
    for (let index = 1; index < input.photos.length; index += 1) {
      const selectedPhoto = input.photos[index];
      if (!selectedPhoto) continue;
      const extra = await copyPhoto(selectedPhoto, '-' + String(index + 1));
      additionalPhotos.push(extra);
      copied.push(extra);
    }

    const item: OfflineReportQueueItem = {
      id,
      ownerId: input.ownerId,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      ...primary,
      ...(additionalPhotos.length ? { additionalPhotos } : {}),
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    };

    await updateQueue(input.ownerId, (items) => [...items, item]);
    return item;
  } catch (error) {
    await Promise.all(copied.map((photo) =>
      FileSystem.deleteAsync(photo.photoUri, { idempotent: true }).catch(() => undefined),
    ));
    throw error;
  }
}

export async function getOfflineReportQueue(ownerId: string): Promise<OfflineReportQueueItem[]> {
  if (!ownerId) return [];
  return readQueue(ownerId);
}

export async function syncOfflineReports(ownerId: string): Promise<OfflineSyncResult> {
  if (!ownerId) return { synced: 0, remaining: 0 };
  const initialItems = await readQueue(ownerId);
  let synced = 0;

  for (const item of initialItems) {
    try {
      let reportId = item.reportId;
      if (!reportId) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
          const report = await submitReportWithPhoto(
            item.payload,
            item.idempotencyKey,
            { uri: item.photoUri, name: item.photoName, type: item.photoType },
            controller.signal,
          );
          reportId = report.idSignalement;
        } finally {
          clearTimeout(timeout);
        }
        await updateQueue(ownerId, (currentItems) =>
          currentItems.map((candidate) =>
            candidate.id === item.id ? { ...candidate, reportId } : candidate,
          ),
        );
      }

      const currentReport = await getMyReport(reportId);
      const alreadyAttached = Math.max(0, currentReport.photos.length - 1);
      const additionalPhotos = item.additionalPhotos ?? [];
      // The server-side photo count avoids re-uploading an attachment when
      // the previous request succeeded but its response never reached the app.
      for (const photo of additionalPhotos.slice(alreadyAttached)) {
        await uploadReportPhoto(reportId, {
          uri: photo.photoUri,
          name: photo.photoName,
          type: photo.photoType,
        });
      }

      await updateQueue(ownerId, (currentItems) =>
        currentItems.filter((candidate) => candidate.id !== item.id),
      );
      await Promise.all([
        FileSystem.deleteAsync(item.photoUri, { idempotent: true }).catch(() => undefined),
        ...additionalPhotos.map((photo) =>
          FileSystem.deleteAsync(photo.photoUri, { idempotent: true }).catch(() => undefined),
        ),
      ]);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Échec de synchronisation.';
      await updateQueue(ownerId, (currentItems) =>
        currentItems.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, attempts: candidate.attempts + 1, lastError: message }
            : candidate,
        ),
      );
      // Preserve ordering. Retry the oldest failed submission before later ones.
      break;
    }
  }

  return { synced, remaining: (await readQueue(ownerId)).length };
}
