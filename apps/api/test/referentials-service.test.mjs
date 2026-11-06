import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import test from 'node:test';
import { ReferentialsService } from '../dist/modules/referentials/referentials.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const teamId = '33333333-3333-4333-8333-333333333333';
const memberId = '44444444-4444-4444-8444-444444444444';
const typeId = '55555555-5555-4555-8555-555555555555';
const skillId = '66666666-6666-4666-8666-666666666666';

function basePrisma() {
  const prisma = {
    utilisateur: {
      findUnique: async ({ where }) => where.authUserId
        ? { idUtilisateur: actorId, etatCompte: 'ACTIF' }
        : { idUtilisateur: memberId, etatCompte: 'ACTIF' },
    },
    auditEvents: [],
  };
  prisma.$executeRaw = async (strings, ...values) => {
    prisma.auditEvents.push({ sql: strings.join('?'), values });
    return 1;
  };
  prisma.$transaction = async (operation) => operation(prisma);
  return prisma;
}

test('creates a waste type with the simplified active flag', async () => {
  let created;
  const prisma = basePrisma();
  prisma.typeDechet = {
    create: async ({ data }) => { created = data; return { idTypeDechet: typeId, ...data }; },
  };
  const service = new ReferentialsService(prisma);
  const result = await service.createWasteType({
    codeType: ' plastique ',
    libelle: ' Plastique ',
    description: ' Déchets plastiques ',
  }, authId);

  assert.equal(created.codeType, 'PLASTIQUE');
  assert.equal(created.libelle, 'Plastique');
  assert.equal(created.actif, true);
  assert.equal(result.idTypeDechet, typeId);
  assert.equal(prisma.auditEvents[0].values[1], 'TYPE_DECHET_CREE');
  assert.equal(prisma.auditEvents[0].values[2], 'REFERENTIEL');
});

test('reactivates an existing inactive team competence instead of inserting a duplicate', async () => {
  const calls = { lookup: null, update: null };
  const prisma = basePrisma();
  prisma.equipe = {
    findUnique: async () => ({ idEquipe: teamId, etatEquipe: 'ACTIVE' }),
  };
  prisma.typeDechet = {
    findUnique: async () => ({ idTypeDechet: typeId, actif: true }),
  };
  prisma.competenceEquipe = {
    findUnique: async ({ where }) => {
      calls.lookup = where;
      return { idCompetenceEquipe: skillId, actif: false };
    },
    update: async ({ where, data }) => {
      calls.update = { where, data };
      return { idCompetenceEquipe: skillId, ...data };
    },
    create: async () => { throw new Error('must not insert duplicate competence'); },
  };
  const service = new ReferentialsService(prisma);
  const result = await service.addSkill(teamId, { idTypeDechet: typeId, commentaire: 'Compétence renouvelée' }, authId);

  assert.deepEqual(calls.lookup.idEquipe_idTypeDechet, { idEquipe: teamId, idTypeDechet: typeId });
  assert.equal(calls.update.where.idCompetenceEquipe, skillId);
  assert.equal(calls.update.data.actif, true);
  assert.equal(result.idCompetenceEquipe, skillId);
  assert.equal(prisma.auditEvents[0].values[1], 'COMPETENCE_EQUIPE_AJOUTEE');
  assert.equal(prisma.auditEvents[0].values[2], 'COMPETENCE');
});

test('does not insert a second active competence for the same team and waste type', async () => {
  const prisma = basePrisma();
  prisma.equipe = { findUnique: async () => ({ idEquipe: teamId, etatEquipe: 'ACTIVE' }) };
  prisma.typeDechet = { findUnique: async () => ({ idTypeDechet: typeId, actif: true }) };
  prisma.competenceEquipe = {
    findUnique: async () => ({ idCompetenceEquipe: skillId, actif: true }),
    create: async () => { throw new Error('must not create'); },
  };
  const service = new ReferentialsService(prisma);

  await assert.rejects(
    service.addSkill(teamId, { idTypeDechet: typeId }, authId),
    ConflictException,
  );
});

test('adds an active account to a team without delegation or availability records', async () => {
  let created;
  const prisma = basePrisma();
  prisma.equipe = { findUnique: async () => ({ idEquipe: teamId }) };
  prisma.appartenanceEquipe = {
    findFirst: async () => null,
    create: async ({ data }) => { created = data; return data; },
  };
  const service = new ReferentialsService(prisma);
  await service.addMembership(teamId, {
    idUtilisateur: memberId,
    dateDebut: '2026-11-01T10:00:00.000Z',
    fonction: 'Agent terrain',
  }, authId);

  assert.equal(created.idEquipe, teamId);
  assert.equal(created.idUtilisateur, memberId);
  assert.equal(created.dateFin, null);
  assert.equal(created.fonction, 'Agent terrain');
  assert.equal(prisma.auditEvents[0].values[1], 'APPARTENANCE_EQUIPE_AJOUTEE');
  assert.equal(prisma.auditEvents[0].values[2], 'APPARTENANCE');
});
