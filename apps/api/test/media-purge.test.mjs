import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaPurgeService } from '../dist/infrastructure/storage/media-purge.service.js';

const reportPhotoId = '11111111-1111-4111-8111-111111111111';
const interventionPhotoId = '22222222-2222-4222-8222-222222222222';

function harness(options = {}) {
  const calls = { removed: [], reportUpdates: [], interventionUpdates: [], reportBatch: null, interventionBatch: null };
  const prisma = {
    photoSignalement: {
      findMany: async (args) => {
        calls.reportBatch = args;
        return options.reportPhotos ?? [{ idPhotoSignalement: reportPhotoId, referencePhoto: 'private/report/photo.jpg' }];
      },
      updateMany: async (args) => {
        calls.reportUpdates.push(args);
        return { count: options.reportUpdateCount ?? 1 };
      },
    },
    photoIntervention: {
      findMany: async (args) => {
        calls.interventionBatch = args;
        return options.interventionPhotos ?? [{ idPhotoIntervention: interventionPhotoId, referencePhoto: 'private/intervention/photo.webp' }];
      },
      updateMany: async (args) => {
        calls.interventionUpdates.push(args);
        return { count: options.interventionUpdateCount ?? 1 };
      },
    },
  };
  const storage = {
    remove: async (path) => {
      if (options.removeError) throw options.removeError;
      calls.removed.push(path);
    },
  };
  return { service: new MediaPurgeService(prisma, storage), calls };
}

test('purges expired report and intervention objects and marks their metadata', async () => {
  const { service, calls } = harness();
  const result = await service.purgeExpiredMedia();

  assert.deepEqual(result, {
    scannedSignalement: 1,
    scannedIntervention: 1,
    purgedSignalement: 1,
    purgedIntervention: 1,
    skipped: 0,
    failed: 0,
  });
  assert.deepEqual(calls.removed, ['private/report/photo.jpg', 'private/intervention/photo.webp']);
  assert.equal(calls.reportUpdates[0].data.mediaPurgeAt instanceof Date, true);
  assert.equal(calls.interventionUpdates[0].data.mediaPurgeAt instanceof Date, true);
  assert.equal(calls.reportBatch.where.mediaPurgeAt, null);
  assert.equal(calls.interventionBatch.where.mediaPurgeAt, null);
});

test('does not mark media as purged when Storage removal fails', async () => {
  const { service, calls } = harness({ removeError: new Error('Storage offline') });
  const result = await service.purgeExpiredMedia();

  assert.equal(result.failed, 2);
  assert.equal(result.purgedSignalement, 0);
  assert.equal(result.purgedIntervention, 0);
  assert.equal(calls.reportUpdates.length, 0);
  assert.equal(calls.interventionUpdates.length, 0);
});

test('records concurrent purge updates as skipped', async () => {
  const { service } = harness({ reportUpdateCount: 0, interventionUpdateCount: 0 });
  const result = await service.purgeExpiredMedia();

  assert.equal(result.skipped, 2);
  assert.equal(result.purgedSignalement, 0);
  assert.equal(result.purgedIntervention, 0);
});

test('clamps the batch size and handles an empty expiry queue', async () => {
  const { service, calls } = harness({ reportPhotos: [], interventionPhotos: [] });
  const result = await service.purgeExpiredMedia(100000);

  assert.equal(calls.reportBatch.take, 500);
  assert.equal(calls.interventionBatch.take, 500);
  assert.deepEqual(result, {
    scannedSignalement: 0,
    scannedIntervention: 0,
    purgedSignalement: 0,
    purgedIntervention: 0,
    skipped: 0,
    failed: 0,
  });
});
