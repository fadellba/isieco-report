import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import test from 'node:test';
import { CasesService } from '../dist/modules/cases/cases.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const dossierId = '44444444-4444-4444-8444-444444444444';
const typeId = '55555555-5555-4555-8555-555555555555';

const report = {
  idSignalement: reportId,
  idDossier: null,
  statutSignalement: 'QUALIFIE',
  description: 'Dépôt de déchets près du marché.',
  localisation: 'Près du marché',
  latitude: null,
  longitude: null,
  precisionLocalisation: null,
  dateDecision: new Date('2026-11-01T10:00:00.000Z'),
  contenus: [{
    idTypeDechet: typeId,
    quantiteEstimee: 4,
    volumeEstime: 1.5,
    remarque: 'Sacs et cartons',
    etatQualification: 'RETENU',
    typeDechet: { idTypeDechet: typeId, actif: true },
  }],
};

const dossier = {
  idDossier: dossierId,
  referenceDossier: 'DOS-20261101-ABC12345',
  descriptionSynthese: 'Dépôt de déchets près du marché.',
  dateCreationDossier: new Date('2026-11-01T11:00:00.000Z'),
  statutDossier: 'OUVERT',
  priorite: 'NORMALE',
  latitude: null,
  longitude: null,
  precisionLocalisation: null,
  descriptionLocalisation: 'Près du marché',
  dateCloture: null,
  creePar: actorId,
  contenus: [],
  signalements: [],
};

test('creates a dossier and stores the direct Signalement.idDossier association', async () => {
  const calls = { create: null, reportUpdate: null, isolation: null };
  const tx = {
    signalement: {
      findUnique: async () => report,
      updateMany: async (args) => { calls.reportUpdate = args; return { count: 1 }; },
    },
    dossierTraitement: {
      create: async ({ data }) => { calls.create = data; return { idDossier: dossierId }; },
      findUniqueOrThrow: async () => dossier,
    },
  };
  const prisma = {
    utilisateur: { findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }) },
    $transaction: async (operation, options) => {
      calls.isolation = options.isolationLevel;
      return operation(tx);
    },
  };
  const service = new CasesService(prisma);
  const result = await service.createFromReport(reportId, { priorite: 'HAUTE' }, authId);

  assert.equal(calls.create.priorite, 'HAUTE');
  assert.equal(calls.create.contenus.create.length, 1);
  assert.equal(calls.create.contenus.create[0].idTypeDechet, typeId);
  assert.deepEqual(calls.reportUpdate.where, {
    idSignalement: reportId,
    idDossier: null,
    statutSignalement: 'QUALIFIE',
  });
  assert.equal(calls.reportUpdate.data.idDossier, dossierId);
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(result.idDossier, dossierId);
});

test('refuses to create a dossier from a report that is not qualified', async () => {
  const tx = {
    signalement: { findUnique: async () => ({ ...report, statutSignalement: 'SOUMIS' }) },
  };
  const prisma = {
    utilisateur: { findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }) },
    $transaction: async (operation) => operation(tx),
  };
  const service = new CasesService(prisma);

  await assert.rejects(
    service.createFromReport(reportId, {}, authId),
    ConflictException,
  );
});

test('returns direct signalements rather than synthetic attachment history', async () => {
  const prisma = {
    dossierTraitement: {
      findUnique: async () => ({ ...dossier, signalements: [{ idSignalement: reportId, statutSignalement: 'QUALIFIE' }] }),
    },
  };
  const service = new CasesService(prisma);
  const result = await service.getCase(dossierId);

  assert.equal(result.signalements[0].idSignalement, reportId);
  assert.equal('rattachements' in result, false);
  assert.equal('historiquesPriorite' in result, false);
  assert.equal('historiquesLocalisation' in result, false);
});

test('qualified report queue only includes reports without a dossier', async () => {
  let where;
  const prisma = {
    signalement: {
      count: async (args) => { where = args.where; return 0; },
      findMany: async (args) => { where = args.where; return []; },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  const service = new CasesService(prisma);
  await service.listQualifiedUnassignedReports({ page: 1, pageSize: 20 });

  assert.equal(where.idDossier, null);
  assert.equal(where.statutSignalement, 'QUALIFIE');
});
