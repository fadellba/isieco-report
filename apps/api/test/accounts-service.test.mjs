import assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import test from 'node:test';
import { AccountsService } from '../src/modules/accounts/accounts.service.ts';

const targetId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const targetAuthId = '33333333-3333-4333-8333-333333333333';
const actorAuthId = '44444444-4444-4444-8444-444444444444';
const roleId = '55555555-5555-4555-8555-555555555555';

function profileRow(overrides = {}) {
  return {
    idUtilisateur: targetId,
    authUserId: targetAuthId,
    nom: 'Diallo',
    prenom: 'Aminata',
    email: 'aminata@example.test',
    telephone: null,
    referenceAvatar: null,
    dateInscription: new Date('2026-01-01T00:00:00.000Z'),
    etatCompte: 'ACTIF',
    roles: [{ role: { codeRole: 'CITOYEN', libelleRole: 'Citoyen' } }],
    ...overrides,
  };
}

function createRoleChangeHarness(options = {}) {
  const target = profileRow();
  const actor = profileRow({
    idUtilisateur: actorId,
    authUserId: actorAuthId,
    nom: 'Admin',
    prenom: null,
    email: 'admin@example.test',
    roles: [{ role: { codeRole: 'ADMINISTRATEUR_COMPTES', libelleRole: 'Administrateur des comptes' } }],
  });
  const role = {
    idRole: roleId,
    codeRole: options.codeRole ?? 'AGENT_TERRAIN',
    libelleRole: options.libelleRole ?? 'Agent de terrain',
  };
  const calls = {
    transactions: [],
    roleAssignments: [],
    updates: [],
    events: [],
    roleReads: [],
  };

  const tx = {
    utilisateurRole: {
      findFirst: async (args) => options.assignment ?? null,
      create: async (args) => {
        calls.roleAssignments.push(args);
        if (options.createError) throw options.createError;
        return { idUtilisateur: targetId, idRole: roleId };
      },
      updateMany: async (args) => {
        calls.updates.push(args);
        if (options.updateError) throw options.updateError;
        return { count: options.updateCount ?? 1 };
      },
      count: async (args) => options.adminCount ?? 2,
    },
    evenementMetier: {
      create: async (args) => {
        calls.events.push(args);
        if (options.eventError) throw options.eventError;
        return args.data;
      },
    },
  };

  const prisma = {
    utilisateur: {
      findUnique: async ({ where }) => {
        if (where.authUserId === actorAuthId) return actor;
        if (where.idUtilisateur === targetId) return target;
        return null;
      },
    },
    role: {
      findUnique: async ({ where }) => {
        calls.roleReads.push(where);
        if (where.codeRole === role.codeRole) return role;
        if (where.codeRole === 'ADMINISTRATEUR_COMPTES') {
          return { idRole: '66666666-6666-4666-8666-666666666666', codeRole: 'ADMINISTRATEUR_COMPTES' };
        }
        return null;
      },
    },
    $transaction: async (callback, transactionOptions) => {
      calls.transactions.push(transactionOptions);
      return callback(tx);
    },
  };

  return { service: new AccountsService(prisma), calls, role, target, actor };
}

test('rejects profile initialization until Supabase email confirmation exists', async () => {
  const service = new AccountsService({});
  await assert.rejects(
    service.getOrCreateMyProfile({
      id: targetAuthId,
      email: 'citizen@example.test',
      email_confirmed_at: null,
      user_metadata: {},
    }),
    (error) => error instanceof UnauthorizedException && error.getStatus() === 401,
  );
});

test('public profile initialization can only provision CITOYEN from trusted server code', async () => {
  const roleCreateCalls = [];
  let userUpsertArgs;
  const service = new AccountsService({
    role: {
      upsert: async (args) => {
        roleCreateCalls.push(args);
        return { idRole: roleId, codeRole: 'CITOYEN', libelleRole: 'Citoyen' };
      },
    },
    utilisateur: {
      upsert: async (args) => {
        userUpsertArgs = args;
      },
      findUnique: async () => profileRow({
        authUserId: targetAuthId,
        roles: [{ role: { codeRole: 'CITOYEN', libelleRole: 'Citoyen' } }],
      }),
    },
  });

  const result = await service.getOrCreateMyProfile({
    id: targetAuthId,
    email: ' AMINATA@EXAMPLE.TEST ',
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    user_metadata: {
      nom: ' Diallo ',
      prenom: ' Aminata ',
      roles: ['ADMINISTRATEUR_COMPTES', 'AGENT_TERRAIN'],
    },
  });

  assert.equal(roleCreateCalls.length, 1);
  assert.equal(roleCreateCalls[0].where.codeRole, 'CITOYEN');
  assert.equal(userUpsertArgs.create.email, 'aminata@example.test');
  assert.equal(userUpsertArgs.create.nom, 'Diallo');
  assert.equal(userUpsertArgs.create.prenom, 'Aminata');
  assert.equal(userUpsertArgs.create.roles.create.role.connect.idRole, roleId);
  assert.equal('roles' in userUpsertArgs.create, true);
  assert.equal(userUpsertArgs.create.roles.create.role.connect.idRole, roleId);
  assert.equal(JSON.stringify(userUpsertArgs.create).includes('ADMINISTRATEUR_COMPTES'), false);
  assert.equal(result.roles[0].code, 'CITOYEN');
});

test('assignRole writes the role and its audit event in one serializable transaction', async () => {
  const { service, calls } = createRoleChangeHarness();
  const result = await service.assignRole(targetId, actorAuthId, {
    codeRole: 'AGENT_TERRAIN',
    motif: 'Validation de la prise de poste',
  });

  assert.equal(calls.transactions.length, 1);
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.roleAssignments.length, 1);
  assert.equal(calls.roleAssignments[0].data.utilisateur.connect.idUtilisateur, targetId);
  assert.equal(calls.roleAssignments[0].data.attribuant.connect.idUtilisateur, actorId);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].data.typeEvenement, 'ROLE_ATTRIBUE');
  assert.equal(calls.events[0].data.idActeur, actorId);
  assert.equal(calls.events[0].data.idUtilisateurCible, targetId);
  assert.equal(calls.events[0].data.donneesApres.codeRole, 'AGENT_TERRAIN');
  assert.equal(result.utilisateurId, targetId);
});

test('assignRole rejects an already active role without writing an audit event', async () => {
  const { service, calls } = createRoleChangeHarness({
    assignment: { dateDebut: new Date('2026-01-01T00:00:00.000Z'), dateFin: null },
  });

  await assert.rejects(
    service.assignRole(targetId, actorAuthId, { codeRole: 'AGENT_TERRAIN' }),
    (error) => error.getStatus?.() === 409,
  );
  assert.equal(calls.roleAssignments.length, 0);
  assert.equal(calls.events.length, 0);
});

test('assignRole converts concurrent unique-index violations to HTTP 409', async () => {
  const { service, calls } = createRoleChangeHarness({
    createError: Object.assign(new Error('unique constraint'), { code: 'P2002' }),
  });

  await assert.rejects(
    service.assignRole(targetId, actorAuthId, { codeRole: 'AGENT_TERRAIN' }),
    (error) => error.getStatus?.() === 409,
  );
  assert.equal(calls.events.length, 0);
});

test('revokeRole closes the exact active interval, including a scheduled end date, and audits it', async () => {
  const scheduledEnd = new Date('2026-12-31T00:00:00.000Z');
  const start = new Date('2026-01-01T00:00:00.000Z');
  const { service, calls } = createRoleChangeHarness({
    assignment: { dateDebut: start, dateFin: scheduledEnd },
  });

  await service.revokeRole(targetId, actorAuthId, 'AGENT_TERRAIN');

  assert.equal(calls.updates.length, 1);
  assert.equal(calls.updates[0].where.dateDebut, start);
  assert.equal(calls.updates[0].where.dateFin, scheduledEnd);
  assert.equal(calls.updates[0].data.dateFin instanceof Date, true);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].data.typeEvenement, 'ROLE_REVOQUE');
  assert.equal(calls.events[0].data.idActeur, actorId);
  assert.equal(calls.events[0].data.idUtilisateurCible, targetId);
  assert.equal(calls.events[0].data.donneesAvant.dateFinPrevue, scheduledEnd.toISOString());
});

test('revokeRole protects the last active account administrator', async () => {
  const { service, calls } = createRoleChangeHarness({
    codeRole: 'ADMINISTRATEUR_COMPTES',
    assignment: { dateDebut: new Date('2026-01-01T00:00:00.000Z'), dateFin: null },
    adminCount: 1,
  });

  await assert.rejects(
    service.revokeRole(targetId, actorAuthId, 'ADMINISTRATEUR_COMPTES'),
    (error) => error.getStatus?.() === 409,
  );
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('revokeRole maps serialization failures to HTTP 409', async () => {
  const { service } = createRoleChangeHarness({
    assignment: { dateDebut: new Date('2026-01-01T00:00:00.000Z'), dateFin: null },
    updateError: Object.assign(new Error('serialization failure'), { code: 'P2034' }),
  });

  await assert.rejects(
    service.revokeRole(targetId, actorAuthId, 'AGENT_TERRAIN'),
    (error) => error.getStatus?.() === 409,
  );
});
