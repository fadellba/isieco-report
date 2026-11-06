import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import test from 'node:test';
import { ReportsService } from '../dist/modules/reports/reports.service.js';
import { InterventionsService } from '../dist/modules/interventions/interventions.service.js';
import { VerificationService } from '../dist/modules/verification/verification.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const interventionId = '44444444-4444-4444-8444-444444444444';
const assignmentId = '55555555-5555-4555-8555-555555555555';
const teamId = '66666666-6666-4666-8666-666666666666';
const photoId = '77777777-7777-4777-8777-777777777777';

const jpeg = { buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]), mimetype: 'image/jpeg', size: 4 };

function storageHarness() {
  const calls = { uploads: [], removals: [], signed: [] };
  return {
    calls,
    storage: {
      getExpirationDate: (from) => new Date(from.getTime() + 86400000),
      upload: async (path, file) => { calls.uploads.push({ path, file }); },
      remove: async (path) => { calls.removals.push(path); },
      createSignedUrl: async (path) => {
        calls.signed.push(path);
        return { signedUrl: 'https://storage.example.test/signed', expiresInSeconds: 60 };
      },
    },
  };
}

function activeUserPrisma() {
  return {
    utilisateur: { findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }) },
  };
}

test('uploads report photos privately and rejects non-owners before storage access', async () => {
  const storage = storageHarness();
  const photoPrisma = activeUserPrisma();
  photoPrisma.signalement = {
    findFirst: async () => ({ idSignalement: reportId, statutSignalement: 'SOUMIS' }),
  };
  const reportTx = {
    $queryRawUnsafe: async () => [{ idSignalement: reportId }],
    $executeRaw: async () => 1,
    photoSignalement: {
      count: async () => 0,
      create: async ({ data }) => ({ idPhotoSignalement: photoId, description: data.description, dateAjout: data.dateAjout }),
    },
  };
  photoPrisma.$transaction = async (operation) => operation(reportTx);
  const service = new ReportsService(photoPrisma, storage.storage);
  const uploaded = await service.addPhoto(reportId, authId, jpeg, 'Façade du site');

  assert.equal(uploaded.idPhotoSignalement, photoId);
  assert.equal(storage.calls.uploads.length, 1);
  assert.equal(uploaded.etatPublication, 'PRIVEE');

  const unauthorizedStorage = storageHarness();
  const unauthorizedPrisma = activeUserPrisma();
  unauthorizedPrisma.signalement = { findFirst: async () => null };
  unauthorizedPrisma.photoSignalement = { count: async () => 0 };
  const unauthorized = new ReportsService(unauthorizedPrisma, unauthorizedStorage.storage);
  await assert.rejects(unauthorized.addPhoto(reportId, authId, jpeg), NotFoundException);
  assert.equal(unauthorizedStorage.calls.uploads.length, 0);
});

test('removes a report image from Storage when metadata persistence fails', async () => {
  const storage = storageHarness();
  const prisma = activeUserPrisma();
  prisma.signalement = { findFirst: async () => ({ idSignalement: reportId }) };
  const reportTx = {
    $queryRawUnsafe: async () => [{ idSignalement: reportId }],
    photoSignalement: {
      count: async () => 0,
      create: async () => { throw new Error('database write failed'); },
    },
  };
  prisma.$transaction = async (operation) => operation(reportTx);
  const service = new ReportsService(prisma, storage.storage);

  await assert.rejects(service.addPhoto(reportId, authId, jpeg), /database write failed/u);
  assert.equal(storage.calls.uploads.length, 1);
  assert.equal(storage.calls.removals.length, 1);
});

test('uploads intervention proof only for its active author', async () => {
  const storage = storageHarness();
  const prisma = activeUserPrisma();
  prisma.intervention = {
    findUnique: async () => ({
      idIntervention: interventionId,
      statutIntervention: 'EN_COURS',
      dateHeureFin: null,
      dateSoumissionCompteRendu: null,
      renseignePar: actorId,
      affectation: {
        idEquipe: teamId,
        dateFinAffectation: null,
        etatAffectation: 'ACTIVE',
        decisionEquipe: 'ACCEPTEE',
        equipe: { etatEquipe: 'ACTIVE' },
        contenuDossier: {
          etatContenuDossier: 'ACTIF',
          etatPriseEnCharge: 'EN_COURS',
          dossier: { statutDossier: 'OUVERT' },
        },
      },
    }),
  };
  prisma.appartenanceEquipe = { findFirst: async () => ({ idEquipe: teamId }) };
  const interventionTx = {
    $queryRawUnsafe: async () => [{ idIntervention: interventionId }],
    $executeRaw: async () => 1,
    intervention: {
      findUnique: async () => ({
        idIntervention: interventionId,
        statutIntervention: 'EN_COURS',
        dateHeureFin: null,
        dateSoumissionCompteRendu: null,
        renseignePar: actorId,
        affectation: {
          idEquipe: teamId,
          dateFinAffectation: null,
          etatAffectation: 'ACTIVE',
          decisionEquipe: 'ACCEPTEE',
          equipe: { etatEquipe: 'ACTIVE' },
          contenuDossier: {
            idContenuDossier: '88888888-8888-4888-8888-888888888888',
            idDossier: '99999999-9999-4999-8999-999999999999',
            etatContenuDossier: 'ACTIF',
            etatPriseEnCharge: 'EN_COURS',
            dossier: { statutDossier: 'OUVERT' },
          },
        },
      }),
    },
    appartenanceEquipe: { findFirst: async () => ({ idEquipe: teamId }) },
    photoIntervention: {
      create: async ({ data }) => ({ idPhotoIntervention: photoId, description: data.description, dateAjout: data.dateAjout }),
    },
  };
  prisma.$transaction = async (operation) => operation(interventionTx);
  const service = new InterventionsService(prisma, storage.storage);
  const result = await service.addPhoto(interventionId, { contextePhoto: 'Après collecte' }, jpeg, authId);

  assert.equal(result.idPhotoIntervention, photoId);
  assert.equal(storage.calls.uploads.length, 1);
});

test('refuses to upload intervention proof after the field report has been submitted', async () => {
  const storage = storageHarness();
  const prisma = activeUserPrisma();
  prisma.intervention = {
    findUnique: async () => ({
      idIntervention: interventionId,
      statutIntervention: 'SOUMISE',
      dateHeureFin: new Date(),
      dateSoumissionCompteRendu: new Date(),
      renseignePar: actorId,
      affectation: {},
    }),
  };
  const service = new InterventionsService(prisma, storage.storage);

  await assert.rejects(
    service.addPhoto(interventionId, { contextePhoto: 'Après collecte' }, jpeg, authId),
    ConflictException,
  );
  assert.equal(storage.calls.uploads.length, 0);
});

test('only a separate verifier receives a signed URL for a private intervention photo', async () => {
  const storage = storageHarness();
  const prisma = activeUserPrisma();
  prisma.intervention = {
    findFirst: async () => ({
      idIntervention: interventionId,
      renseignePar: '88888888-8888-4888-8888-888888888888',
      statutIntervention: 'SOUMISE',
      dateSoumissionCompteRendu: new Date(),
      affectation: {
        idEquipe: teamId,
        etatAffectation: 'ACTIVE',
        decisionEquipe: 'ACCEPTEE',
        contenuDossier: {
          idDossier: '99999999-9999-4999-8999-999999999999',
          idTypeDechet: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          etatContenuDossier: 'ACTIF',
          etatPriseEnCharge: 'EN_COURS',
          dossier: { referenceDossier: 'DOS-001', statutDossier: 'OUVERT' },
        },
      },
    }),
  };
  prisma.photoIntervention = {
    findFirst: async () => ({
      referencePhoto: 'private/intervention/proof.jpg',
      dateExpiration: new Date(Date.now() + 60000),
      mediaPurgeAt: null,
    }),
  };
  const service = new VerificationService(prisma, storage.storage);
  const result = await service.createInterventionPhotoUrl(assignmentId, photoId, authId);

  assert.equal(result.expiresInSeconds, 60);
  assert.equal(storage.calls.signed.length, 1);
});

test('prevents an intervention author from receiving a verifier photo URL', async () => {
  const storage = storageHarness();
  const prisma = activeUserPrisma();
  prisma.intervention = {
    findFirst: async () => ({
      idIntervention: interventionId,
      renseignePar: actorId,
      statutIntervention: 'SOUMISE',
      dateSoumissionCompteRendu: new Date(),
      affectation: {
        idEquipe: teamId,
        etatAffectation: 'ACTIVE',
        decisionEquipe: 'ACCEPTEE',
        contenuDossier: {
          idDossier: '99999999-9999-4999-8999-999999999999',
          idTypeDechet: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          etatContenuDossier: 'ACTIF',
          etatPriseEnCharge: 'EN_COURS',
          dossier: { referenceDossier: 'DOS-001', statutDossier: 'OUVERT' },
        },
      },
    }),
  };
  prisma.photoIntervention = { findFirst: async () => null };
  const service = new VerificationService(prisma, storage.storage);

  await assert.rejects(
    service.createInterventionPhotoUrl(assignmentId, photoId, authId),
    ForbiddenException,
  );
  assert.equal(storage.calls.signed.length, 0);
});


test('serializes report-photo quota checks under the report row lock', async () => {
  const storage = storageHarness();
  const prisma = activeUserPrisma();
  const events = [];
  prisma.signalement = { findFirst: async () => ({ idSignalement: reportId }) };
  const tx = {
    $queryRawUnsafe: async () => { events.push('lock'); return [{ idSignalement: reportId }]; },
    photoSignalement: {
      count: async () => { events.push('count'); return 3; },
      create: async () => { events.push('create'); throw new Error('must not create'); },
    },
  };
  prisma.$transaction = async (operation) => operation(tx);
  const service = new ReportsService(prisma, storage.storage);

  await assert.rejects(service.addPhoto(reportId, authId, jpeg), BadRequestException);
  assert.deepEqual(events, ['lock', 'count']);
  assert.equal(storage.calls.uploads.length, 1);
  assert.equal(storage.calls.removals.length, 1);
});
