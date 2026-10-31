import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import test from 'node:test';
import { ReportsService } from '../dist/modules/reports/reports.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const communeId = '44444444-4444-4444-8444-444444444444';
const wasteTypeId = '55555555-5555-4555-8555-555555555555';

function reportRow() {
  return {
    idSignalement: reportId,
    dateConstat: new Date('2026-10-30T10:00:00.000Z'),
    dateSoumission: new Date('2026-10-30T11:00:00.000Z'),
    description: 'Déchets abandonnés près du marché central.',
    idCommune: communeId,
    latitude: -14.7167,
    longitude: -17.4677,
    precisionLocalisation: 15,
    descriptionLocalisation: 'Près de l’entrée principale.',
    statutSignalement: 'SOUMIS',
    dateDecision: null,
    motifDecision: null,
    contenus: [],
    photos: [],
  };
}

function createHarness(options = {}) {
  const calls = {
    transactions: [],
    creates: [],
    contentCreates: [],
    idempotencyCreates: [],
    events: [],
    wasteTypeReads: [],
    communeReads: [],
    listReads: [],
    detailReads: [],
  };
  let storedIdempotency = options.existing ?? null;
  const report = options.report ?? reportRow();
  const actor = options.actor ?? { idUtilisateur: actorId, etatCompte: 'ACTIF' };

  const tx = {
    idempotenceSignalement: {
      findUnique: async () => storedIdempotency,
      create: async ({ data }) => {
        calls.idempotencyCreates.push(data);
        storedIdempotency = { empreinteRequete: data.empreinteRequete, signalement: report };
        return storedIdempotency;
      },
    },
    typeDechet: {
      findMany: async (args) => {
        calls.wasteTypeReads.push(args);
        return options.activeWasteTypes ?? [{ idTypeDechet: wasteTypeId }];
      },
    },
    commune: {
      findFirst: async (args) => {
        calls.communeReads.push(args);
        return options.commune === undefined ? { idCommune: communeId } : options.commune;
      },
    },
    signalement: {
      create: async (args) => {
        calls.creates.push(args);
        return { idSignalement: reportId };
      },
      findUniqueOrThrow: async () => report,
    },
    contenuSignalement: {
      createMany: async (args) => {
        calls.contentCreates.push(args);
        return { count: args.data.length };
      },
    },
    evenementMetier: {
      create: async (args) => {
        calls.events.push(args);
        return args.data;
      },
    },
  };

  const prisma = {
    utilisateur: {
      findUnique: async () => actor,
    },
    idempotenceSignalement: {
      findUnique: async () => storedIdempotency,
    },
    signalement: {
      count: async (args) => {
        calls.listReads.push(args);
        return 1;
      },
      findMany: async (args) => {
        calls.listReads.push(args);
        return [report];
      },
      findFirst: async (args) => {
        calls.detailReads.push(args);
        return Object.hasOwn(options, 'detail') ? options.detail : report;
      },
    },
    $transaction: async (operation, transactionOptions) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      calls.transactions.push(transactionOptions);
      return operation(tx);
    },
  };

  return { service: new ReportsService(prisma), calls, report, getStoredIdempotency: () => storedIdempotency };
}

const payload = {
  description: ' Déchets abandonnés près du marché central. ',
  dateConstat: '2026-10-30T10:00:00.000Z',
  idCommune: communeId,
  latitude: -14.7167,
  longitude: -17.4677,
  precisionLocalisation: 15,
  descriptionLocalisation: ' Près de l’entrée principale. ',
  contenus: [{ idTypeDechet: wasteTypeId, quantiteEstimee: 2, volumeEstime: 1.5, remarque: ' Sacs visibles ' }],
};

test('creates a citizen report, validates references and atomically writes idempotency and audit records', async () => {
  const { service, calls } = createHarness();

  const result = await service.createReport(payload, authUserId, 'report-create-0001');

  assert.equal(result.idSignalement, reportId);
  assert.equal(calls.transactions.length, 1);
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.creates.length, 1);
  assert.equal(calls.creates[0].data.statutSignalement, 'SOUMIS');
  assert.equal(calls.creates[0].data.description, 'Déchets abandonnés près du marché central.');
  assert.equal(calls.contentCreates.length, 1);
  assert.equal(calls.contentCreates[0].data[0].idTypeDechet, wasteTypeId);
  assert.equal(calls.idempotencyCreates.length, 1);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].data.typeEvenement, 'SIGNALEMENT_SOUMIS');
  assert.equal(calls.events[0].data.idActeur, actorId);
  assert.equal(calls.events[0].data.idSignalementCible, reportId);
});

test('replays an identical idempotent request without creating a second report', async () => {
  const { service, calls } = createHarness();

  const first = await service.createReport(payload, authUserId, 'report-create-0002');
  const second = await service.createReport(payload, authUserId, 'report-create-0002');

  assert.equal(first.idSignalement, second.idSignalement);
  assert.equal(calls.transactions.length, 1);
  assert.equal(calls.creates.length, 1);
  assert.equal(calls.events.length, 1);
});

test('rejects reusing an idempotency key with a different request body', async () => {
  const { service, calls } = createHarness();

  await service.createReport(payload, authUserId, 'report-create-0003');
  await assert.rejects(
    service.createReport({ ...payload, description: 'Une autre description pour un autre signalement.' }, authUserId, 'report-create-0003'),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.transactions.length, 1);
});

test('rejects an inactive waste type without creating a report', async () => {
  const { service, calls } = createHarness({ activeWasteTypes: [] });

  await assert.rejects(
    service.createReport(payload, authUserId, 'report-create-0004'),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.creates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('rejects an inactive commune without creating a report', async () => {
  const { service, calls } = createHarness({ commune: null });

  await assert.rejects(
    service.createReport(payload, authUserId, 'report-create-0005'),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.creates.length, 0);
});

test('rejects incomplete coordinates and invalid idempotency keys', async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    service.createReport({ ...payload, longitude: undefined }, authUserId, 'report-create-0006'),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  await assert.rejects(
    service.createReport(payload, authUserId, 'bad'),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.transactions.length, 0);
});

test('rejects an inactive account before any persistence write', async () => {
  const { service, calls } = createHarness({
    actor: { idUtilisateur: actorId, etatCompte: 'SUSPENDU' },
  });

  await assert.rejects(
    service.createReport(payload, authUserId, 'report-create-0007'),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(calls.transactions.length, 0);
});

test('lists only records owned by the authenticated citizen with bounded pagination', async () => {
  const { service, calls } = createHarness();

  const result = await service.listMine(authUserId, { page: 2, pageSize: 200 });

  assert.equal(result.total, 1);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 100);
  assert.equal(calls.listReads[0].where.idUtilisateur, actorId);
  assert.equal(calls.listReads[1].where.idUtilisateur, actorId);
  assert.equal(calls.listReads[1].skip, 100);
});

test('does not reveal another citizen report when ownership does not match', async () => {
  const { service, calls } = createHarness({ detail: null });

  await assert.rejects(
    service.getMine(reportId, authUserId),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(calls.detailReads[0].where.idUtilisateur, actorId);
});
