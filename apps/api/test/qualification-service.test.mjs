import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import test from 'node:test';
import { QualificationService } from '../dist/modules/qualification/qualification.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const typeId = '44444444-4444-4444-8444-444444444444';

function actorPrisma() {
  return {
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }),
    },
  };
}

test('requestSupplement changes the report state and creates the inline request in one transaction', async () => {
  const calls = { created: null, reportUpdate: null, history: null, isolation: null };
  const tx = {
    signalement: {
      findUnique: async () => ({ idSignalement: reportId, statutSignalement: 'SOUMIS' }),
      update: async ({ data }) => { calls.reportUpdate = data; return data; },
    },
    demandeComplement: {
      findFirst: async () => null,
      create: async ({ data }) => { calls.created = data; return { idDemande: '55555555-5555-4555-8555-555555555555', ...data }; },
    },
    historiqueStatutSignalement: {
      create: async ({ data }) => { calls.history = data; return data; },
    },
  };
  const prisma = actorPrisma();
  prisma.$transaction = async (operation, options) => {
    calls.isolation = options.isolationLevel;
    return operation(tx);
  };
  const service = new QualificationService(prisma, {});

  const result = await service.requestSupplement(reportId, { motif: 'Merci de préciser le lieu exact du dépôt.' }, authId);
  assert.equal(calls.created.idSignalement, reportId);
  assert.equal(calls.created.demandePar, actorId);
  assert.equal(calls.reportUpdate.statutSignalement, 'EN_ATTENTE_COMPLEMENT');
  assert.equal(calls.history.nouveauStatut, 'EN_ATTENTE_COMPLEMENT');
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(result.etatDemande, 'OUVERTE');
});

test('acceptReport stores qualification fields directly on ContenuSignalement', async () => {
  const calls = { upserts: [], status: null, reportUpdate: null };
  const tx = {
    signalement: {
      findUnique: async () => ({ idSignalement: reportId, statutSignalement: 'SOUMIS' }),
      update: async ({ data }) => { calls.reportUpdate = data; return data; },
    },
    demandeComplement: { count: async () => 0 },
    typeDechet: { findMany: async () => [{ idTypeDechet: typeId }] },
    contenuSignalement: {
      findMany: async () => [{ idTypeDechet: typeId }],
      upsert: async ({ create, update }) => {
        calls.upserts.push({ create, update });
        return create;
      },
      updateMany: async () => ({ count: 0 }),
    },
    historiqueStatutSignalement: {
      create: async ({ data }) => { calls.status = data; return data; },
    },
  };
  const prisma = actorPrisma();
  prisma.$transaction = async (operation) => operation(tx);
  prisma.signalement = {
    findUnique: async () => ({ idSignalement: reportId, statutSignalement: 'QUALIFIE', dateDecision: new Date() }),
  };
  const service = new QualificationService(prisma, {});

  const result = await service.acceptReport(reportId, {
    contenus: [{ idTypeDechet: typeId, quantiteEstimee: 3, volumeEstime: 1.5, remarque: 'Quantité estimée' }],
  }, authId);

  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.upserts[0].create.etatQualification, 'RETENU');
  assert.equal(calls.upserts[0].create.qualifiePar, actorId);
  assert.equal(calls.upserts[0].create.quantiteEstimee, 3);
  assert.equal(calls.reportUpdate.statutSignalement, 'QUALIFIE');
  assert.equal(calls.status.nouveauStatut, 'QUALIFIE');
  assert.equal(result.statutSignalement, 'QUALIFIE');
});

test('rejectReport refuses to decide while an inline supplement request remains open', async () => {
  let reportUpdateCount = 0;
  const tx = {
    signalement: {
      findUnique: async () => ({ idSignalement: reportId, statutSignalement: 'EN_ATTENTE_COMPLEMENT' }),
      update: async () => { reportUpdateCount += 1; },
    },
    demandeComplement: { count: async () => 1 },
  };
  const prisma = actorPrisma();
  prisma.$transaction = async (operation) => operation(tx);
  const service = new QualificationService(prisma, {});

  await assert.rejects(
    service.rejectReport(reportId, { motif: 'Signalement hors périmètre.' }, authId),
    ConflictException,
  );
  assert.equal(reportUpdateCount, 0);
});
