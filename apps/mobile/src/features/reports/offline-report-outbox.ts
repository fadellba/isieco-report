import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { CreateReportPayload } from './reports-api';
import { submitReportWithPhoto } from './reports-api';

export interface OfflineReportQueueItem {
  id: string;
  ownerId: string;
  idempotencyKey: string;
  payload: CreateReportPayload;
  photoUri: string;
  photoName: string;
  photoType: 'image/jpeg';
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
        typeof candidate.photoName === 'string';
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
  photo: { uri: string; name: string; type: 'image/jpeg' };
}): Promise<OfflineReportQueueItem> {
  if (!input.ownerId.trim()) throw new Error('Le compte connecté est requis pour la file hors ligne.');
  await ensureDirectory();

  const id = 'offline-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const extension = input.photo.name.toLowerCase().endsWith('.jpg') ? '.jpg' : '.jpeg';
  const photoUri = DIRECTORY + id + extension;
  await FileSystem.copyAsync({ from: input.photo.uri, to: photoUri });

  const item: OfflineReportQueueItem = {
    id,
    ownerId: input.ownerId,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    photoUri,
    photoName: input.photo.name,
    photoType: 'image/jpeg',
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  try {
    await updateQueue(input.ownerId, (items) => [...items, item]);
  } catch (error) {
    await FileSystem.deleteAsync(photoUri, { idempotent: true }).catch(() => undefined);
    throw error;
  }

  return item;
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        await submitReportWithPhoto(
          item.payload,
          item.idempotencyKey,
          { uri: item.photoUri, name: item.photoName, type: item.photoType },
          controller.signal,
        );
      } finally {
        clearTimeout(timeout);
      }
      await updateQueue(ownerId, (currentItems) =>
        currentItems.filter((candidate) => candidate.id !== item.id),
      );
      await FileSystem.deleteAsync(item.photoUri, { idempotent: true }).catch(() => undefined);
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
