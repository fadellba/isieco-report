import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import test from 'node:test';
import { ReportsService } from '../dist/modules/reports/reports.service.js';
import { InterventionsService } from '../dist/modules/interventions/interventions.service.js';
import { VerificationService } from '../dist/modules/verification/verification.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const otherAuthUserId = '99999999-9999-4999-8999-999999999999';
const actorId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const interventionId = '44444444-4444-4444-8444-444444444444';
const assignmentId = '55555555-5555-4555-8555-555555555555';
const teamId = '66666666-6666-4666-8666-666666666666';
const photoId = '77777777-7777-4777-8777-777777777777';

const jpeg = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  mimetype: 'image/jpeg',
  size: 4,
};

function activeActor() {
  return { idUtilisateur: actorId, etatCompte: 'ACTIF' };
}

function storageHarness() {
  const calls = { uploads: [], removals: [], signedUrls: [] };
  return {
    calls,
    service: {
      getExpirationDate: (from) => new Date(from.getTime() + 86400000),
      upload: async (path, image) => calls.uploads.push({ path, image }),
      remove: async (path) => calls.removals.push(path),
      createSignedUrl: async (path) => {
        calls.signedUrls.push(path);
        return { signedUrl: 'https://storage.example.test/sign/' + path + '?token=temporary', expiresInSeconds: 60 };
      },
    },
  };
}

function reportHarness(options = {}) {
  const storage = storageHarness();
  const calls = { transactions: [], photoCreates: [], events: [], ownerReads: [], photoReads: [] };
  const transaction = {
    signalement: {
      findFirst: async (args) => {
        calls.ownerReads.push(args);
        return options.ownerMissing ? null : { idSignalement: reportId };
      },
    },
    photoSignalement: {
      create: async ({ data }) => {
        calls.photoCreates.push(data);
        return {
          idPhotoSignalement: photoId,
          description: data.description,
          dateAjout: data.dateAjout,
          etatPublication: data.etatPublication,
        };
      },
    },
    evenementMetier: {
      create: async ({ data }) => {
        calls.events.push(data);
        return data;
      },
    },
  };
  const prisma = {
    utilisateur: { findUnique: async () => activeActor() },
    signalement: {
      findFirst: async (args) => {
        calls.ownerReads.push(args);
        return options.ownerMissing ? null : { idSignalement: reportId };
      },
    },
    photoSignalement: {
      findFirst: async (args) => {
        calls.photoReads.push(args);
        return options.photo ?? {
          referencePhoto: 'private/user/reports/report/photo.jpg',
          dateExpiration: new Date(Date.now() + 86400000),
          mediaPurgeAt: null,
        };
      },
    },
    $transaction: async (operation, txOptions) => {
      calls.transactions.push(txOptions);
      if (options.transactionError) throw options.transactionError;
      return operation(transaction);
    },
  };
  return {
    service: new ReportsService(prisma, storage.service),
    calls,
    storage: storage.calls,
  };
}

test('stores an owned report photo privately and writes metadata plus audit atomically', async () => {
  const { service, calls, storage } = reportHarness();

  const result = await service.addPhoto(reportId, authUserId, jpeg, 'Façade du site');

  assert.equal(result.idPhoto, photoId);
  assert.equal(result.etatPublication, 'EN_ATTENTE');
  assert.equal(Object.hasOwn(result, 'referencePhoto'), false);
  assert.equal(storage.uploads.length, 1);
  assert.match(storage.uploads[0].path, new RegExp(authUserId));
  assert.equal(calls.transactions.length, 1);
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.photoCreates[0].referencePhoto, storage.uploads[0].path);
  assert.equal(calls.photoCreates[0].mediaStockeeLocale, false);
  assert.equal(calls.photoCreates[0].etatPublication, 'EN_ATTENTE');
  assert.equal(calls.events[0].typeEvenement, 'PHOTO_SIGNALEMENT_AJOUTEE');
  assert.equal(calls.events[0].idSignalementCible, reportId);
});

test('does not upload a report photo when the signalement is not owned', async () => {
  const { service, calls, storage } = reportHarness({ ownerMissing: true });

  await assert.rejects(
    service.addPhoto(reportId, authUserId, jpeg),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(storage.uploads.length, 0);
  assert.equal(calls.photoCreates.length, 0);
});

test('removes an uploaded report photo when its database transaction fails', async () => {
  const { service, storage } = reportHarness({
    transactionError: new Error('database write failed'),
  });

  await assert.rejects(service.addPhoto(reportId, authUserId, jpeg), /database write failed/u);
  assert.equal(storage.uploads.length, 1);
  assert.deepEqual(storage.removals, [storage.uploads[0].path]);
});

test('returns a short-lived report photo URL only after checking ownership', async () => {
  const { service, calls, storage } = reportHarness();

  const result = await service.createPhotoUrl(reportId, photoId, authUserId);

  assert.equal(result.expiresInSeconds, 60);
  assert.equal(storage.signedUrls.length, 1);
  assert.equal(calls.photoReads[0].where.signalement.idUtilisateur, actorId);
});

test('does not create a signed URL for an expired report photo', async () => {
  const { service, storage } = reportHarness({
    photo: {
      referencePhoto: 'private/path.jpg',
      dateExpiration: new Date(Date.now() - 1000),
      mediaPurgeAt: null,
    },
  });

  await assert.rejects(
    service.createPhotoUrl(reportId, photoId, authUserId),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(storage.signedUrls.length, 0);
});

function interventionRecord(authorId = actorId, status = 'EN_COURS') {
  return {
    idIntervention: interventionId,
    statutIntervention: status,
    dateHeureFin: null,
    dateSoumissionCompteRendu: null,
    renseignePar: authorId,
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
  };
}

function interventionHarness(options = {}) {
  const storage = storageHarness();
  const calls = { transactions: [], photoCreates: [], events: [], membershipReads: [] };
  const current = options.current ?? interventionRecord();
  const tx = {
    intervention: {
      findUnique: async () => options.transactionCurrent ?? current,
    },
    appartenanceEquipe: {
      findFirst: async (args) => {
        calls.membershipReads.push(args);
        return options.membershipMissing ? null : { idUtilisateur: actorId };
      },
    },
    photoIntervention: {
      create: async ({ data }) => {
        calls.photoCreates.push(data);
        return {
          idPhotoIntervention: photoId,
          description: data.description,
          dateAjout: data.dateAjout,
          etatPublication: data.etatPublication,
        };
      },
    },
    evenementMetier: {
      create: async ({ data }) => {
        calls.events.push(data);
        return data;
      },
    },
  };
  const prisma = {
    utilisateur: { findUnique: async () => activeActor() },
    intervention: { findUnique: async () => current },
    appartenanceEquipe: {
      findFirst: async (args) => {
        calls.membershipReads.push(args);
        return options.membershipMissing ? null : { idUtilisateur: actorId };
      },
    },
    $transaction: async (operation, txOptions) => {
      calls.transactions.push(txOptions);
      return operation(tx);
    },
  };
  return {
    service: new InterventionsService(prisma, storage.service),
    calls,
    storage: storage.calls,
  };
}

test('stores an intervention photo only for the active intervention author', async () => {
  const { service, calls, storage } = interventionHarness();

  const result = await service.addPhoto(
    interventionId,
    { contextePhoto: 'Après intervention', description: 'Zone nettoyée' },
    jpeg,
    authUserId,
  );

  assert.equal(result.idPhoto, photoId);
  assert.equal(storage.uploads.length, 1);
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.photoCreates[0].contextePhoto, 'Après intervention');
  assert.equal(calls.photoCreates[0].etatPublication, 'EN_ATTENTE');
  assert.equal(calls.events[0].typeEvenement, 'PHOTO_INTERVENTION_AJOUTEE');
  assert.equal(calls.events[0].idInterventionCible, interventionId);
});

test('does not allow another team member to add photos to an agent intervention', async () => {
  const { service, calls, storage } = interventionHarness({
    current: interventionRecord(otherAuthUserId),
  });

  await assert.rejects(
    service.addPhoto(interventionId, { contextePhoto: 'Après intervention' }, jpeg, authUserId),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(storage.uploads.length, 0);
  assert.equal(calls.photoCreates.length, 0);
});

test('does not allow photos after the intervention report has been submitted', async () => {
  const submitted = interventionRecord(actorId, 'SOUMISE');
  submitted.dateHeureFin = new Date();
  submitted.dateSoumissionCompteRendu = new Date();
  const { service, calls, storage } = interventionHarness({ current: submitted });

  await assert.rejects(
    service.addPhoto(interventionId, { contextePhoto: 'Après intervention' }, jpeg, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(storage.uploads.length, 0);
  assert.equal(calls.photoCreates.length, 0);
});

function pendingAssignment(interventionAuthor = otherAuthUserId) {
  return {
    idAffectation: assignmentId,
    idEquipe: teamId,
    dateFinAffectation: null,
    etatAffectation: 'ACTIVE',
    decisionEquipe: 'ACCEPTEE',
    contenuDossier: {
      idDossier: '88888888-8888-4888-8888-888888888888',
      idTypeDechet: '99999999-9999-4999-8999-999999999999',
      etatContenuDossier: 'ACTIF',
      etatPriseEnCharge: 'EN_COURS',
      dossier: { referenceDossier: 'DOS-2026-0001', statutDossier: 'EN_COURS' },
    },
    interventions: [{
      idIntervention: interventionId,
      dateHeureDebut: new Date(Date.now() - 60000),
      dateSoumissionCompteRendu: new Date(Date.now() - 30000),
      statutIntervention: 'SOUMISE',
      resultatIntervention: 'TERMINEE',
      compteRendu: 'Compte rendu de test suffisamment long.',
      motifException: null,
      renseignePar: interventionAuthor,
      photos: [{ idPhotoIntervention: photoId }],
    }],
    verifications: [],
  };
}

function verificationHarness(options = {}) {
  const storage = storageHarness();
  const calls = { photoReads: [] };
  const prisma = {
    utilisateur: { findUnique: async () => activeActor() },
    affectation: {
      findUnique: async () => options.assignment ?? pendingAssignment(options.author),
    },
    photoIntervention: {
      findFirst: async (args) => {
        calls.photoReads.push(args);
        return {
          referencePhoto: 'private/intervention/photo.jpg',
          dateExpiration: new Date(Date.now() + 60000),
          mediaPurgeAt: null,
        };
      },
    },
  };
  return {
    service: new VerificationService(prisma, storage.service),
    calls,
    storage: storage.calls,
  };
}

test('allows a separate verifier to obtain a signed URL for a pending intervention proof', async () => {
  const { service, calls, storage } = verificationHarness({ author: otherAuthUserId });

  const result = await service.createInterventionPhotoUrl(assignmentId, photoId, authUserId);

  assert.equal(result.expiresInSeconds, 60);
  assert.equal(calls.photoReads[0].where.idIntervention, interventionId);
  assert.equal(storage.signedUrls.length, 1);
});

test('prevents an intervention author from verifying their own photo evidence', async () => {
  const { service, calls, storage } = verificationHarness({ author: authUserId });

  await assert.rejects(
    service.createInterventionPhotoUrl(assignmentId, photoId, authUserId),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(calls.photoReads.length, 0);
  assert.equal(storage.signedUrls.length, 0);
});
