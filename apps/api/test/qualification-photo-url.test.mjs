import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import test from 'node:test';
import { QualificationService } from '../dist/modules/qualification/qualification.service.js';

const reportId = '11111111-1111-4111-8111-111111111111';
const photoId = '22222222-2222-4222-8222-222222222222';

function harness(photo) {
  const calls = { queries: [], signed: [] };
  const prisma = {
    signalement: {
      findFirst: async (args) => {
        calls.queries.push(args);
        return photo === undefined ? {
          photos: [{
            referencePhoto: 'private/report/photo.jpg',
            dateExpiration: new Date(Date.now() + 60000),
            mediaPurgeAt: null,
          }],
        } : (photo ? { photos: [photo] } : null);
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

test('signs a photo only while the signalement is decisionable', async () => {
  const { service, calls } = harness(undefined);
  const result = await service.createPhotoUrl(reportId, photoId);

  assert.equal(result.expiresInSeconds, 60);
  assert.equal(calls.signed[0], 'private/report/photo.jpg');
  assert.equal(calls.queries[0].where.idSignalement, reportId);
  assert.deepEqual(calls.queries[0].where.statutSignalement.in, ['SOUMIS', 'COMPLEMENT_REPONDU']);
  assert.deepEqual(calls.queries[0].where.photos.some, { idPhotoSignalement: photoId });
});

test('does not sign expired, purged or unlinked photos', async () => {
  const expired = harness({
    referencePhoto: 'private/expired.jpg',
    dateExpiration: new Date(Date.now() - 1000),
    mediaPurgeAt: null,
  });
  await assert.rejects(expired.service.createPhotoUrl(reportId, photoId), NotFoundException);
  assert.equal(expired.calls.signed.length, 0);

  const purged = harness({
    referencePhoto: 'private/purged.jpg',
    dateExpiration: new Date(Date.now() + 60000),
    mediaPurgeAt: new Date(),
  });
  await assert.rejects(purged.service.createPhotoUrl(reportId, photoId), NotFoundException);
  assert.equal(purged.calls.signed.length, 0);

  const missing = harness(null);
  await assert.rejects(missing.service.createPhotoUrl(reportId, photoId), NotFoundException);
  assert.equal(missing.calls.signed.length, 0);
});
