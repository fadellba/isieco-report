import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../dist/modules/notifications/notifications.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

test('lists notifications for an active account with a bounded page size', async () => {
  let query;
  let values;
  const events = [{
    id: '33333333-3333-4333-8333-333333333333',
    actionCode: 'SIGNALEMENT_SOUMIS',
    entityType: 'SIGNALEMENT',
    entityId: '44444444-4444-4444-8444-444444444444',
    dossierId: null,
    occurredAt: new Date('2026-11-18T10:00:00.000Z'),
    title: 'Nouveau signalement',
    message: 'Un signalement attend une qualification.',
  }];
  const prisma = {
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: userId, etatCompte: 'ACTIF' }),
    },
    $queryRawUnsafe: async (sql, ...params) => {
      query = sql;
      values = params;
      return events;
    },
  };

  const result = await new NotificationsService(prisma).listMine(authUserId, 500);

  assert.deepEqual(result, events);
  assert.match(query, /audit\.evenement_metier/);
  assert.match(query, /user_role\.date_fin/);
  assert.match(query, /JOIN public\.appartenance_equipe AS membership/);
  assert.match(query, /membership\.date_fin IS NULL/);
  assert.deepEqual(values, [userId, 100]);
});

test('does not expose notifications for an inactive business account', async () => {
  let reads = 0;
  const prisma = {
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: userId, etatCompte: 'SUSPENDU' }),
    },
    $queryRawUnsafe: async () => { reads += 1; return []; },
  };

  await assert.rejects(
    new NotificationsService(prisma).listMine(authUserId),
    ForbiddenException,
  );
  assert.equal(reads, 0);
});
