import assert from 'node:assert/strict';
import test from 'node:test';
import { CasesService } from '../dist/modules/cases/cases.service.js';

const reportId = '11111111-1111-4111-8111-111111111111';
const wasteTypeId = '22222222-2222-4222-8222-222222222222';

function createHarness(options = {}) {
  const calls = { count: [], findMany: [] };
  const rows = options.rows ?? [];
  const prisma = {
    signalement: {
      count: async ({ where }) => {
        calls.count.push(where);
        return options.total ?? rows.length;
      },
      findMany: async (args) => {
        calls.findMany.push(args);
        return rows;
      },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  return { service: new CasesService(prisma), calls };
}

test('lists only qualified reports that have no active dossier attachment', async () => {
  const row = {
    idSignalement: reportId,
    qualifications: [{
      idTypeDechet: wasteTypeId,
      typeDechet: { codeType: 'ORGANIQUE', libelle: 'Déchets organiques' },
    }],
  };
  const { service, calls } = createHarness({ rows: [row], total: 1 });
  const result = await service.listQualifiedUnassignedReports({ page: 1, pageSize: 20 });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].idSignalement, reportId);
  assert.equal(calls.findMany[0].where.statutSignalement, 'QUALIFIE');
  assert.deepEqual(calls.findMany[0].where.rattachements, {
    none: { dateFinRattachement: null },
  });
  assert.equal(calls.findMany[0].take, 20);
  assert.equal(calls.findMany[0].select.qualifications.where.etatQualification, 'RETENU');
});

test('caps the page size at 100', async () => {
  const { service, calls } = createHarness();
  const result = await service.listQualifiedUnassignedReports({ page: 2, pageSize: 1000 });
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 100);
  assert.equal(calls.findMany[0].skip, 100);
  assert.equal(calls.findMany[0].take, 100);
});
