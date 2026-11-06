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

test('public profile provisioning creates only the citizen role', async () => {
  const calls = { role: null, profile: null };
  const role = { idRole: roleId, codeRole: 'CITOYEN', libelleRole: 'Citoyen' };
  const prisma = {
    role: { upsert: async (args) => { calls.role = args; return role; } },
    utilisateur: {
      upsert: async (args) => { calls.profile = args; },
      findUnique: async () => profileRow(),
    },
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

test('public profile provisioning creates only the citizen role', async () => {
  const calls = { role: null, profile: null };
  const role = { idRole: roleId, codeRole: 'CITOYEN', libelleRole: 'Citoyen' };
  const prisma = {
    role: { upsert: async (args) => { calls.role = args; return role; } },
    utilisateur: {
      upsert: async (args) => { calls.profile = args; },
      findUnique: async () => profileRow(),
    },
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
  const tx = {
    utilisateurRole: {
      findFirst: async () => null,    $executeRaw: async () => { calls.audit = (calls.audit ?? 0) + 1; return 1; },

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
