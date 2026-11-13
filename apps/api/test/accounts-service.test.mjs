import assert from 'node:assert/strict';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import test from 'node:test';
import { AccountsService } from '../dist/modules/accounts/accounts.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const roleId = '44444444-4444-4444-8444-444444444444';

function profileRow(overrides = {}) {
  return {
    idUtilisateur: userId,
    authUserId: authId,
    nom: 'Diop',
    prenom: 'Awa',
    email: 'awa@example.test',
    telephone: null,
    dateInscription: new Date('2026-11-01T10:00:00.000Z'),
    etatCompte: 'ACTIF',
    roles: [{ role: { codeRole: 'CITOYEN', libelleRole: 'Citoyen' } }],
    ...overrides,
  };
}

test('refuses to provision a profile before email confirmation', async () => {
  const service = new AccountsService({});
  await assert.rejects(
    service.getOrCreateMyProfile({ id: authId, email: 'awa@example.test', user_metadata: {} }),
    UnauthorizedException,
  );
});

test('public profile provisioning records account creation and the automatic citizen role atomically', async () => {
  const calls = { role: null, profile: null, audit: [], isolation: null };
  const role = { idRole: roleId, codeRole: 'CITOYEN', libelleRole: 'Citoyen' };
  const tx = {
    $executeRaw: async (strings, ...values) => {
      calls.audit.push({ sql: strings.join('?'), values });
      return 1;
    },
    role: { upsert: async (args) => { calls.role = args; return role; } },
    utilisateur: {
      findUnique: async () => null,
      upsert: async (args) => { calls.profile = args; return { idUtilisateur: userId }; },
    },
  };
  const prisma = {
    $transaction: async (operation, options) => {
      calls.isolation = options.isolationLevel;
      return operation(tx);
    },
    utilisateur: { findUnique: async () => profileRow() },
  };
  const service = new AccountsService(prisma);
  const result = await service.getOrCreateMyProfile({
    id: authId,
    email: ' AWA@EXAMPLE.TEST ',
    email_confirmed_at: '2026-11-01T09:00:00.000Z',
    user_metadata: { nom: 'Diop', prenom: 'Awa' },
  });

  assert.equal(calls.role.where.codeRole, 'CITOYEN');
  assert.equal(calls.profile.create.roles.create.role.connect.idRole, roleId);
  assert.equal(calls.profile.create.email, 'awa@example.test');
  assert.equal(result.roles.length, 1);
  assert.equal(result.roles[0].code, 'CITOYEN');
  assert.equal(result.referenceAvatar, null);
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(calls.audit.length, 2);
  assert.ok(calls.audit[0].sql.includes('INSERT INTO audit.evenement_metier'));
  assert.ok(calls.audit[1].sql.includes('INSERT INTO audit.evenement_metier'));
  assert.ok(calls.audit[0].values.includes('COMPTE_CREE'));
  assert.ok(calls.audit[1].values.includes('ROLE_ATTRIBUE'));
  assert.ok(calls.audit[1].values.includes(JSON.stringify({ result: 'CITOYEN' })));
});

test('profile edits append an audit event in the same transaction without recording PII', async () => {
  let updateArgs;
  let auditCall;
  let transactionCalls = 0;
  const tx = {
    utilisateur: {
      update: async (args) => { updateArgs = args; return profileRow({ telephone: '770000000' }); },
    },
    $executeRaw: async (strings, ...values) => {
      auditCall = { sql: strings.join('?'), values };
      return 1;
    },
  };
  const prisma = {
    $transaction: async (operation) => {
      transactionCalls += 1;
      return operation(tx);
    },
    utilisateur: {
      findUnique: async () => profileRow({ telephone: '770000000' }),
    },
  };
  const service = new AccountsService(prisma);
  service.getOrCreateMyProfile = async () => profileRow();

  await service.updateMyProfile(
    { id: authId },
    { telephone: '770000000' },
  );

  assert.equal(transactionCalls, 1);
  assert.deepEqual(updateArgs.data, { telephone: '770000000' });
  assert.ok(auditCall.sql.includes('INSERT INTO audit.evenement_metier'));
  assert.ok(auditCall.values.includes('COMPTE_PROFIL_MODIFIE'));
  assert.ok(!auditCall.values.includes('770000000'), 'Phone numbers must not be copied into audit metadata.');
});

test('confirmed email synchronization is audited atomically without recording the address', async () => {
  let upsertArgs;
  let auditCall;
  const tx = {
    $executeRaw: async (strings, ...values) => {
      auditCall = { sql: strings.join('?'), values };
      return 1;
    },
    role: { upsert: async () => ({ idRole: roleId, codeRole: 'CITOYEN' }) },
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: userId, email: 'old@example.test' }),
      upsert: async (args) => {
        upsertArgs = args;
        return { idUtilisateur: userId };
      },
    },
  };
  const prisma = {
    $transaction: async (operation) => operation(tx),
    utilisateur: {
      findUnique: async () => profileRow({ email: 'new@example.test' }),
    },
  };
  const service = new AccountsService(prisma);

  await service.getOrCreateMyProfile({
    id: authId,
    email: 'new@example.test',
    email_confirmed_at: '2026-11-01T09:00:00.000Z',
    user_metadata: {},
  });

  assert.deepEqual(upsertArgs.update, { email: 'new@example.test' });
  assert.ok(auditCall.sql.includes('INSERT INTO audit.evenement_metier'));
  assert.ok(auditCall.values.includes('COMPTE_PROFIL_MODIFIE'));
  assert.ok(!auditCall.values.includes('old@example.test'));
  assert.ok(!auditCall.values.includes('new@example.test'));
});

test('does not suppress a unique conflict while synchronizing an existing account', async () => {
  const duplicateEmail = Object.assign(new Error('Unique email constraint'), { code: 'P2002' });
  let outsideLookupCalls = 0;
  const tx = {
    role: { upsert: async () => ({ idRole: roleId, codeRole: 'CITOYEN' }) },
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: userId, email: 'old@example.test' }),
      upsert: async () => { throw duplicateEmail; },
    },
  };
  const prisma = {
    $transaction: async (operation) => operation(tx),
    utilisateur: {
      findUnique: async () => {
        outsideLookupCalls += 1;
        return profileRow();
      },
    },
  };
  const service = new AccountsService(prisma);

  await assert.rejects(
    service.getOrCreateMyProfile({
      id: authId,
      email: 'taken@example.test',
      email_confirmed_at: '2026-11-01T09:00:00.000Z',
      user_metadata: {},
    }),
    (error) => error === duplicateEmail,
  );
  assert.equal(outsideLookupCalls, 0, 'An existing profile must not turn an email uniqueness conflict into success.');
});

test('revokeRole protects the last active account administrator', async () => {
  const adminRole = { idRole: roleId, codeRole: 'ADMINISTRATEUR_COMPTES' };
  const active = { idUtilisateur: userId, idRole: roleId, dateDebut: new Date('2026-01-01T00:00:00.000Z'), dateFin: null };
  const tx = {
    utilisateurRole: {
      findFirst: async () => active,
      count: async () => 1,
      updateMany: async () => { throw new Error('must not update'); },
    },
  };
  const prisma = {
    utilisateur: {
      findUnique: async ({ where }) => where.authUserId
        ? {
            idUtilisateur: adminId,
            etatCompte: 'ACTIF',
            roles: [{ role: adminRole }],
          }
        : { idUtilisateur: userId, etatCompte: 'ACTIF' },
    },
    role: { findUnique: async () => adminRole },
    $transaction: async (operation) => operation(tx),
  };
  const service = new AccountsService(prisma);

  await assert.rejects(
    service.revokeRole(userId, authId, 'ADMINISTRATEUR_COMPTES'),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
});

test('assignRole writes only the role history row in a serializable transaction', async () => {
  const citizenRole = { idRole: roleId, codeRole: 'AGENT_TERRAIN', libelleRole: 'Agent terrain' };
  let created;
  let isolation;
  const calls = { audit: 0 };
  const tx = {
    $executeRaw: async () => { calls.audit += 1; return 1; },
    utilisateurRole: {
      findFirst: async () => null,
      create: async ({ data }) => { created = data; return data; },
    },
  };
  const admin = {
    idUtilisateur: adminId,
    etatCompte: 'ACTIF',
    roles: [{ role: { codeRole: 'ADMINISTRATEUR_COMPTES' } }],
  };
  const target = profileRow({ roles: [] });
  const prisma = {
    utilisateur: {
      findUnique: async ({ where }) => {
        if (where.authUserId) return admin;
        return target;
      },
    },
    role: { findUnique: async () => citizenRole },
    $transaction: async (operation, options) => {
      isolation = options.isolationLevel;
      return operation(tx);
    },
  };
  const service = new AccountsService(prisma);

  await service.assignRole(userId, authId, { codeRole: 'AGENT_TERRAIN', motif: 'Affectation au terrain' });
  assert.equal(created.idUtilisateur, userId);
  assert.equal(created.idRole, roleId);
  assert.equal(created.attribuePar, adminId);
  assert.equal(isolation, 'Serializable');
  assert.equal(calls.audit, 1);
});
