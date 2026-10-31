import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import test from 'node:test';
import { QualificationService } from '../dist/modules/qualification/qualification.service.js';

const reportId = '11111111-1111-4111-8111-111111111111';
const photoId = '22222222-2222-4222-8222-222222222222';

function createHarness(photo) {
  const calls = { queries: [], signed: [] };
  const prisma = {
    photoSignalement: {
      findFirst: async (args) => {
        calls.queries.push(args);
        return photo === undefined ? {
          referencePhoto: 'private/report/photo.jpg',
          dateExpiration: new Date(Date.now() + 60000),
          mediaPurgeAt: null,
        } : photo;
      },
    },
  };
  const storage = {
    createSignedUrl: async (path) => {
      calls.signed.push(path);
      return { signedUrl: 'https://storage.example.test/signed', expiresInSeconds: 60 };
    },
  };
  return { service: new QualificationService(prisma, storage), calls };
}

test('signs a photo only when its report remains decisionable', async () => {
  const { service, calls } = createHarness(undefined);
  const result = await service.createPhotoUrl(reportId, photoId);
  assert.equal(result.expiresInSeconds, 60);
  assert.equal(calls.signed[0], 'private/report/photo.jpg');
  assert.equal(calls.queries[0].where.idSignalement, reportId);
  assert.deepEqual(calls.queries[0].where.signalement.statutSignalement.in, [
    'SOUMIS',
    'COMPLEMENT_REPONDU',
  ]);
});

test('does not sign expired, purged or unlinked photos', async () => {
  const expired = createHarness({
    referencePhoto: 'private/expired.jpg',
    dateExpiration: new Date(Date.now() - 1000),
    mediaPurgeAt: null,
  });
  await assert.rejects(
    expired.service.createPhotoUrl(reportId, photoId),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(expired.calls.signed.length, 0);

  const purged = createHarness({
    referencePhoto: 'private/purged.jpg',
    dateExpiration: new Date(Date.now() + 60000),
    mediaPurgeAt: new Date(),
  });
  await assert.rejects(
    purged.service.createPhotoUrl(reportId, photoId),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(purged.calls.signed.length, 0);

  const missing = createHarness(null);
  await assert.rejects(
    missing.service.createPhotoUrl(reportId, photoId),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(missing.calls.signed.length, 0);
});
