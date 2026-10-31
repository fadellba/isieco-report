import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaPurgeService } from '../dist/infrastructure/storage/media-purge.service.js';

const reportPhotoId = '11111111-1111-4111-8111-111111111111';
const reportId = '22222222-2222-4222-8222-222222222222';
const interventionPhotoId = '33333333-3333-4333-8333-333333333333';
const interventionId = '44444444-4444-4444-8444-444444444444';

function harness(options = {}) {
  const calls = { removed: [], reportUpdates: [], interventionUpdates: [], events: [], transactionOptions: [] };
  const prisma = {
    photoSignalement: {
      findMany: async () => options.reportPhotos ?? [{
        idPhotoSignalement: reportPhotoId,
        idSignalement: reportId,
        referencePhoto: 'private/report/photo.jpg',
      }],
    },
    photoIntervention: {
      findMany: async () => options.interventionPhotos ?? [{
        idPhotoIntervention: interventionPhotoId,
        idIntervention: interventionId,
        referencePhoto: 'private/intervention/photo.webp',
      }],
    },
    $transaction: async (operation, transactionOptions) => {
      calls.transactionOptions.push(transactionOptions);
      const tx = {
        photoSignalement: {
          updateMany: async (args) => {
            calls.reportUpdates.push(args);
            return { count: options.reportUpdateCount ?? 1 };
          },
        },
        photoIntervention: {
          updateMany: async (args) => {
            calls.interventionUpdates.push(args);
            return { count: options.interventionUpdateCount ?? 1 };
          },
        },
        evenementMetier: {
          create: async ({ data }) => {
            calls.events.push(data);
            return data;
          },
        },
      };
      return operation(tx);
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

test('purges expired report and intervention objects and commits audit events atomically', async () => {
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
  assert.equal(calls.reportUpdates.length, 1);
  assert.equal(calls.interventionUpdates.length, 1);
  assert.equal(calls.events.length, 2);
  assert.equal(calls.events[0].typeEvenement, 'PHOTO_SIGNALEMENT_PURGEE');
  assert.equal(calls.events[0].idSignalementCible, reportId);
  assert.equal(calls.events[1].typeEvenement, 'PHOTO_INTERVENTION_PURGEE');
  assert.equal(calls.events[1].idInterventionCible, interventionId);
  assert.ok(calls.transactionOptions.every((options) => options.isolationLevel === 'Serializable'));
});

test('does not mark a photo as purged when Storage removal fails', async () => {
  const { service, calls } = harness({ removeError: new Error('Storage offline') });

  const result = await service.purgeExpiredMedia();

  assert.equal(result.failed, 2);
  assert.equal(result.purgedSignalement, 0);
  assert.equal(result.purgedIntervention, 0);
  assert.equal(calls.reportUpdates.length, 0);
  assert.equal(calls.interventionUpdates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('records concurrent purge claims as skipped without duplicating audit events', async () => {
  const { service, calls } = harness({ reportUpdateCount: 0, interventionUpdateCount: 0 });

  const result = await service.purgeExpiredMedia();

  assert.equal(result.skipped, 2);
  assert.equal(result.purgedSignalement, 0);
  assert.equal(result.purgedIntervention, 0);
  assert.equal(calls.events.length, 0);
});

test('clamps the batch size and returns an empty result when there are no expired photos', async () => {
  const { service } = harness({ reportPhotos: [], interventionPhotos: [] });

  const result = await service.purgeExpiredMedia(100000);

  assert.deepEqual(result, {
    scannedSignalement: 0,
    scannedIntervention: 0,
    purgedSignalement: 0,
    purgedIntervention: 0,
    skipped: 0,
    failed: 0,
  });
});
