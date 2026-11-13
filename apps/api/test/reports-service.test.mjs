import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import test from 'node:test';
import { ReportsService } from '../dist/modules/reports/reports.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const typeId = '44444444-4444-4444-8444-444444444444';
const demandId = '55555555-5555-4555-8555-555555555555';

function reportRow(overrides = {}) {
  return {
    idSignalement: reportId,
    dateConstat: null,
    dateSoumission: new Date('2026-11-01T10:00:00.000Z'),
    description: 'Un dépôt de déchets est visible près du marché.',
    localisation: 'Près du marché',
    latitude: null,
    longitude: null,
    precisionLocalisation: null,
    statutSignalement: 'SOUMIS',
    dateDecision: null,
    motifDecision: null,
    contenus: [],
    photos: [],
    ...overrides,
  };
}

function basePrisma(options = {}) {
  return {
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: userId, etatCompte: 'ACTIF' }),
    },
    typeDechet: {
      findMany: async () => [{ idTypeDechet: typeId }],
    },
    signalement: {
      findFirst: async ({ where } = {}) => where?.cleIdempotence
        ? (options.existingIdempotency ?? null)
        : reportRow(),
      count: async () => 0,
      findMany: async () => [],
    },
    demandeComplement: {},
    historiqueStatutSignalement: {},
    contenuSignalement: {},
  };
}

test('lists only active waste types for a citizen', async () => {
  const prisma = basePrisma();
  let query;
  prisma.typeDechet.findMany = async (args) => {
    query = args;
    return [{ idTypeDechet: typeId, codeType: 'PLASTIQUE', libelle: 'Plastique' }];
  };
  const service = new ReportsService(prisma, {});
  const result = await service.listActiveWasteTypes(authId);

  assert.deepEqual(query.where, { actif: true });
  assert.deepEqual(result, [{ idTypeDechet: typeId, codeType: 'PLASTIQUE', libelle: 'Plastique' }]);
});

test('rejects an entirely empty report when no initial photo is provided', async () => {
  let writes = 0;
  const prisma = basePrisma();
  prisma.$transaction = async () => { writes += 1; };
  const service = new ReportsService(prisma, {});

  await assert.rejects(
    service.createReport({ contenus: [] }, authId, 'report-idem-0003'),
    BadRequestException,
  );
  assert.equal(writes, 0);
});

test('creates a signalement, qualification content and initial status history atomically', async () => {
  const calls = { report: null, contents: null, status: null, isolation: null, audit: 0 };
  const prisma = basePrisma();
  const tx = {
    $executeRaw: async () => { calls.audit += 1; return 1; },
    signalement: {
      create: async ({ data }) => {
        calls.report = data;
        return { idSignalement: reportId };
      },
    },
    contenuSignalement: {
      createMany: async ({ data }) => { calls.contents = data; return { count: data.length }; },
    },
    historiqueStatutSignalement: {
      create: async ({ data }) => { calls.status = data; return data; },
    },
  };
  prisma.$transaction = async (operation, options) => {
    calls.isolation = options.isolationLevel;
    return operation(tx);
  };
  prisma.signalement.findFirst = async ({ where } = {}) => where?.cleIdempotence
    ? null
    : reportRow({ contenus: [{ idTypeDechet: typeId, quantiteEstimee: '2.5', volumeEstime: null, remarque: null, typeDechet: { codeType: 'PLASTIQUE', libelle: 'Plastique' } }] });
  const storage = {};
  const service = new ReportsService(prisma, storage);

  const result = await service.createReport({
    description: 'Un dépôt de déchets est visible près du marché.',
    contenus: [{ idTypeDechet: typeId, quantiteEstimee: 2.5 }],
  }, authId, 'report-idem-0001');

  assert.equal(calls.report.idUtilisateur, userId);
  assert.equal(calls.report.statutSignalement, 'SOUMIS');
  assert.equal(calls.report.cleIdempotence, 'report-idem-0001');
  assert.equal(calls.contents[0].idTypeDechet, typeId);
  assert.equal(calls.contents[0].etatQualification, 'EN_ATTENTE');
  assert.equal(calls.status.nouveauStatut, 'SOUMIS');
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(result.idSignalement, reportId);
  assert.equal(calls.audit, 1);
});

test('replays an existing idempotent request without creating a second signalement', async () => {
  let transactions = 0;
  const prisma = basePrisma({
    existingIdempotency: { idSignalement: reportId, empreinteRequete: null },
  });
  prisma.signalement.findFirst = async ({ where }) => {
    if (where.cleIdempotence) return { idSignalement: reportId, empreinteRequete: null };
    return reportRow();
  };
  prisma.signalement.findFirst = async ({ where }) => {
    if (where?.cleIdempotence) return { idSignalement: reportId, empreinteRequete: 'different' };
    return reportRow();
  };
  prisma.$transaction = async () => { transactions += 1; };
  const service = new ReportsService(prisma, {});
  await assert.rejects(
    service.createReport({ description: 'Un dépôt de déchets est visible près du marché.', contenus: [{ idTypeDechet: typeId }] }, authId, 'report-idem-0002'),
    ConflictException,
  );
  assert.equal(transactions, 0);
});

test('answers an open supplement in the same transaction as the report status change', async () => {
  const calls = { demandUpdate: null, reportUpdate: null, status: null, audit: 0 };
  const tx = {
    $executeRaw: async () => { calls.audit += 1; return 1; },
    demandeComplement: {
      findFirst: async () => ({ idDemande: demandId, etatDemande: 'OUVERTE', reponse: null }),
      update: async ({ data }) => { calls.demandUpdate = data; return data; },
    },
    signalement: {
      findUnique: async () => ({ statutSignalement: 'EN_ATTENTE_COMPLEMENT' }),
      update: async ({ data }) => { calls.reportUpdate = data; return data; },
    },
    historiqueStatutSignalement: {
      create: async ({ data }) => { calls.status = data; return data; },
    },
  };
  const prisma = basePrisma();
  prisma.$transaction = async (operation) => operation(tx);
  const service = new ReportsService(prisma, {});
  const result = await service.answerSupplement(reportId, demandId, 'Le dépôt est situé derrière le marché.', authId);

  assert.equal(calls.demandUpdate.reponse, 'Le dépôt est situé derrière le marché.');
  assert.equal(calls.demandUpdate.etatDemande, 'REPONDUE');
  assert.equal(calls.reportUpdate.statutSignalement, 'COMPLEMENT_REPONDU');
  assert.equal(calls.status.nouveauStatut, 'COMPLEMENT_REPONDU');
  assert.equal(result.idDemande, demandId);
  assert.equal(calls.audit, 1);
});

test('does not reveal a report owned by another citizen', async () => {
  const prisma = basePrisma();
  prisma.signalement.findFirst = async () => null;
  const service = new ReportsService(prisma, {});
  await assert.rejects(service.getMine(reportId, authId), NotFoundException);
});


test('creates a photo-first report without description or waste categories in one transaction', async () => {
  const calls = { report: null, photo: null, history: null, audit: [], uploaded: null, removed: null };
  const prisma = basePrisma();
  const tx = {
    $executeRaw: async () => { return 1; },
    signalement: {
      create: async ({ data }) => {
        calls.report = data;
        return { idSignalement: data.idSignalement };
      },
    },
    photoSignalement: {
      create: async ({ data }) => { calls.photo = data; return data; },
    },
    historiqueStatutSignalement: {
      create: async ({ data }) => { calls.history = data; return data; },
    },
  };
  prisma.$transaction = async (operation, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return operation(tx);
  };
  const now = new Date('2026-11-13T12:00:00.000Z');
  const storage = {
    upload: async (path) => { calls.uploaded = path; },
    remove: async (path) => { calls.removed = path; },
    getExpirationDate: () => new Date('2026-12-13T12:00:00.000Z'),
  };
  const service = new ReportsService(prisma, storage);
  const file = {
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    mimetype: 'image/png',
    size: 8,
  };

  const result = await service.createReport({}, authId, 'report-photo-0001', file);

  assert.equal(calls.report.description, null);
  assert.equal(calls.report.statutSignalement, 'SOUMIS');
  assert.deepEqual(calls.photo.idSignalement, calls.report.idSignalement);
  assert.match(calls.uploaded, new RegExp(calls.report.idSignalement));
  assert.equal(calls.history.nouveauStatut, 'SOUMIS');
  assert.equal(result.idSignalement, reportId);
  assert.equal(calls.removed, null);
});

test('returns a citizen-safe timeline with status and operational milestones', async () => {
  const prisma = basePrisma();
  prisma.signalement.findFirst = async () => ({ idSignalement: reportId, idDossier: '66666666-6666-4666-8666-666666666666' });
  prisma.historiqueStatutSignalement = {
    findMany: async () => [
      { idHistoriqueStatut: 'status-1', dateChangement: new Date('2026-11-01T10:00:00Z'), nouveauStatut: 'SOUMIS' },
      { idHistoriqueStatut: 'status-2', dateChangement: new Date('2026-11-01T11:00:00Z'), nouveauStatut: 'QUALIFIE' },
    ],
  };
  prisma.$queryRaw = async () => [
    { id: 'event-1', occurredAt: new Date('2026-11-02T09:00:00Z'), actionCode: 'AFFECTATION_CREEE' },
    { id: 'event-2', occurredAt: new Date('2026-11-02T10:00:00Z'), actionCode: 'INTERVENTION_DEMARREE' },
  ];
  const service = new ReportsService(prisma, {});
  const result = await service.getMyHistory(reportId, authId);

  assert.equal(result.idSignalement, reportId);
  assert.deepEqual(result.events.map((item) => item.type), ['STATUT', 'STATUT', 'OPERATION', 'OPERATION']);
  assert.deepEqual(result.events.map((item) => item.title), [
    'Signalement reçu',
    'Signalement qualifié',
    'Une équipe a été affectée',
    'L’intervention a commencé',
  ]);
  assert.equal('actorId' in result.events[2], false);
  assert.equal('metadata' in result.events[2], false);
});

test('does not expose a timeline for another citizen report', async () => {
  const prisma = basePrisma();
  prisma.signalement.findFirst = async () => null;
  const service = new ReportsService(prisma, {});
  await assert.rejects(service.getMyHistory(reportId, authId), NotFoundException);
});
