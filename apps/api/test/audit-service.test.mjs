import assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import test from 'node:test';
import { AuditService } from '../dist/modules/audit/audit.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const targetUserId = '33333333-3333-4333-8333-333333333333';
const reportId = '44444444-4444-4444-8444-444444444444';
const wasteTypeId = '55555555-5555-4555-8555-555555555555';
const eventId = '66666666-6666-4666-8666-666666666666';

function eventRow(overrides = {}) {
  return {
    idEvenement: eventId,
    typeEvenement: 'SIGNALEMENT_SOUMIS',
    dateEvenement: new Date('2026-10-31T10:00:00.000Z'),
    dateEnregistrement: new Date('2026-10-31T10:00:01.000Z'),
    origine: 'API',
    idActeur: actorId,
    idSignalementCible: reportId,
    idDossierCible: null,
    idRattachementCible: null,
    idAffectationCible: null,
    idInterventionCible: null,
    idVerificationCible: null,
    idUtilisateurCible: null,
    idEquipeCible: null,
    idRegionCible: null,
    idDepartementCible: null,
    idCommuneCible: null,
    idTypeDechetCible: null,
    idCompetenceEquipeCible: null,
    idDossierContenuCible: null,
    idTypeDechetContenuCible: null,
    ...overrides,
  };
}

function createHarness(options = {}) {
  const calls = { actorReads: [], targetReads: [], counts: [], eventReads: [], transactions: [] };
  const prisma = {
    utilisateur: {
      findUnique: async (args) => {
        if (args.where.authUserId) {
          calls.actorReads.push(args);
          return options.actor === undefined ? { idUtilisateur: actorId, etatCompte: 'ACTIF' } : options.actor;
        }
        calls.targetReads.push(args);
        return options.target === undefined ? { idUtilisateur: targetUserId } : options.target;
      },
    },
    evenementMetier: {
      count: async (args) => {
        calls.counts.push(args);
        return options.total ?? 1;
      },
      findMany: async (args) => {
        calls.eventReads.push(args);
        return options.events ?? [eventRow()];
      },
    },
    $transaction: async (operations) => {
      calls.transactions.push(operations);
      return Promise.all(operations);
    },
  };
  return { service: new AuditService(prisma), calls };
}

test('lists only events where the connected active account is actor or user target', async () => {
  const { service, calls } = createHarness();

  const result = await service.listMyEvents(authUserId, { page: 1, pageSize: 20 });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].idEvenement, eventId);
  assert.deepEqual(result.items[0].cible, { type: 'SIGNALEMENT', id: reportId });
  assert.deepEqual(calls.eventReads[0].where.AND[0].OR, [
    { idActeur: actorId },
    { idUtilisateurCible: actorId },
  ]);
  assert.equal(calls.eventReads[0].take, 20);
  assert.equal(calls.eventReads[0].skip, 0);
  assert.equal(calls.eventReads[0].select.donneesAvant, undefined);
  assert.equal(calls.eventReads[0].select.donneesApres, undefined);
  assert.equal(calls.eventReads[0].select.motif, undefined);
});

test('returns a composite target identifier for case-content audit events', async () => {
  const { service } = createHarness({
    events: [
      eventRow({
        idSignalementCible: null,
        idDossierContenuCible: '77777777-7777-4777-8777-777777777777',
        idTypeDechetContenuCible: wasteTypeId,
      }),
    ],
  });

  const result = await service.listMyEvents(authUserId, {});

  assert.deepEqual(result.items[0].cible, {
    type: 'CONTENU_DOSSIER',
    id: `77777777-7777-4777-8777-777777777777:${wasteTypeId}`,
  });
});

test('filters own activity by event type and inclusive registration dates', async () => {
  const { service, calls } = createHarness();

  await service.listMyEvents(authUserId, {
    typeEvenement: 'ROLE_ATTRIBUE',
    dateDebut: '2026-10-01T00:00:00.000Z',
    dateFin: '2026-10-31T23:59:59.999Z',
    page: 2,
    pageSize: 10,
  });

  const where = calls.eventReads[0].where.AND[1];
  assert.equal(where.typeEvenement, 'ROLE_ATTRIBUE');
  assert.equal(where.dateEnregistrement.gte.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(where.dateEnregistrement.lte.toISOString(), '2026-10-31T23:59:59.999Z');
  assert.equal(calls.eventReads[0].skip, 10);
});

test('requires an active business account before listing personal activity', async () => {
  const { service, calls } = createHarness({
    actor: { idUtilisateur: actorId, etatCompte: 'SUSPENDU' },
  });

  await assert.rejects(
    service.listMyEvents(authUserId, {}),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(calls.eventReads.length, 0);
});

test('rejects a reversed date range before querying the audit table', async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    service.listMyEvents(authUserId, {
      dateDebut: '2026-10-31T00:00:00.000Z',
      dateFin: '2026-10-01T00:00:00.000Z',
    }),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.eventReads.length, 0);
});

test('limits account role history to assignment and revocation events for the selected account', async () => {
  const { service, calls } = createHarness();

  await service.listAccountRoleEvents(targetUserId, authUserId, {});

  const where = calls.eventReads[0].where.AND[0];
  assert.equal(where.idUtilisateurCible, targetUserId);
  assert.deepEqual(where.typeEvenement, { in: ['ROLE_ATTRIBUE', 'ROLE_REVOQUE'] });
  assert.equal(calls.targetReads.length, 1);
});

test('a query type cannot widen the administrator role-history scope', async () => {
  const { service, calls } = createHarness();

  await service.listAccountRoleEvents(targetUserId, authUserId, {
    typeEvenement: 'SIGNALEMENT_SOUMIS',
  });

  const [securityScope, queryFilters] = calls.eventReads[0].where.AND;
  assert.deepEqual(securityScope.typeEvenement, { in: ['ROLE_ATTRIBUE', 'ROLE_REVOQUE'] });
  assert.equal(queryFilters.typeEvenement, 'SIGNALEMENT_SOUMIS');
});

test('does not disclose role history for a missing account', async () => {
  const { service, calls } = createHarness({ target: null });

  await assert.rejects(
    service.listAccountRoleEvents(targetUserId, authUserId, {}),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(calls.eventReads.length, 0);
});

test('does not expose audit snapshots or free-text details in the response', async () => {
  const { service } = createHarness({
    events: [
      eventRow({
        donneesAvant: { secret: 'before-secret' },
        donneesApres: { secret: 'after-secret' },
        motif: 'internal reason',
        destinataireExterne: 'private@example.test',
      }),
    ],
  });

  const result = await service.listMyEvents(authUserId, {});
  const json = JSON.stringify(result);

  assert.equal(json.includes('before-secret'), false);
  assert.equal(json.includes('after-secret'), false);
  assert.equal(json.includes('internal reason'), false);
  assert.equal(json.includes('private@example.test'), false);
});
