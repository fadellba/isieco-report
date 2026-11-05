import assert from 'node:assert/strict';
import test from 'node:test';
import { CasesService } from '../dist/modules/cases/cases.service.js';

const reportId = '11111111-1111-4111-8111-111111111111';
const typeId = '22222222-2222-4222-8222-222222222222';

function harness(options = {}) {
  const calls = { count: null, query: null };
  const prisma = {
    signalement: {
      count: async ({ where }) => { calls.count = where; return options.total ?? 0; },
      findMany: async (args) => { calls.query = args; return options.rows ?? []; },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  return { service: new CasesService(prisma), calls };
}

test('lists qualified signalements with no direct dossier association', async () => {
  const row = {
    idSignalement: reportId,
    contenus: [{
      idTypeDechet: typeId,
      typeDechet: { codeType: 'ORGANIQUE', libelle: 'Déchets organiques' },
    }],
  };
  const { service, calls } = harness({ rows: [row], total: 1 });
  const result = await service.listQualifiedUnassignedReports({ page: 1, pageSize: 20 });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].idSignalement, reportId);
  assert.deepEqual(calls.count, { statutSignalement: 'QUALIFIE', idDossier: null });
  assert.deepEqual(calls.query.where, calls.count);
  assert.equal(calls.query.select.contenus.where.etatQualification, 'RETENU');
});

test('caps the qualified report queue at 100 items', async () => {
  const { service, calls } = harness();
  const result = await service.listQualifiedUnassignedReports({ page: 2, pageSize: 1000 });

  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 100);
  assert.equal(calls.query.skip, 100);
  assert.equal(calls.query.take, 100);
});
