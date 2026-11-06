import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import test from 'node:test';
import { AssignmentsService } from '../dist/modules/assignments/assignments.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const dossierId = '33333333-3333-4333-8333-333333333333';
const typeId = '44444444-4444-4444-8444-444444444444';
const teamId = '55555555-5555-4555-8555-555555555555';
const contentId = '66666666-6666-4666-8666-666666666666';
const skillId = '77777777-7777-4777-8777-777777777777';
const assignmentId = '88888888-8888-4888-8888-888888888888';

function assignmentRow() {
  return {
    idAffectation: assignmentId,
    idContenuDossier: contentId,
    idEquipe: teamId,
    idCompetenceEquipe: skillId,
    dateHeureAffectation: new Date('2026-11-01T10:00:00.000Z'),
    idDecideur: actorId,
    etatAffectation: 'ACTIVE',
    motif: null,
    observation: null,
    dateFinAffectation: null,
    decisionEquipe: 'EN_ATTENTE',
    reponduPar: null,
    dateReponseEquipe: null,
    motifRefusEquipe: null,
    referenceOperationUnique: 'operation-hash',
    equipe: { idEquipe: teamId, nomEquipe: 'Équipe collecte', etatEquipe: 'ACTIVE' },
    competence: { idCompetenceEquipe: skillId, actif: true, dateAttribution: new Date('2026-10-01T00:00:00.000Z') },
    contenuDossier: {
      idDossier: dossierId,
      idTypeDechet: typeId,
      etatContenuDossier: 'ACTIF',
      etatPriseEnCharge: 'EN_ATTENTE',
      dossier: { referenceDossier: 'DOS-001', statutDossier: 'OUVERT', priorite: 'NORMALE' },
      typeDechet: { idTypeDechet: typeId, codeType: 'PLASTIQUE', libelle: 'Plastique' },
    },
  };
}

function basePrisma() {
  return {
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }),
    },
  };
}

test('eligible teams are selected by active competence without availability dependencies', async () => {
  const prisma = basePrisma();
  prisma.equipe = {
    findMany: async ({ where }) => {
      assert.equal(where.etatEquipe, 'ACTIVE');
      assert.deepEqual(where.competences, { some: { idTypeDechet: typeId, actif: true } });
      return [{
        idEquipe: teamId,
        nomEquipe: 'Équipe collecte',
        etatEquipe: 'ACTIVE',
        competences: [{
          idCompetenceEquipe: skillId,
          actif: true,
          dateAttribution: new Date('2026-10-01T00:00:00.000Z'),
        }],
      }];
    },
  };
  const service = new AssignmentsService(prisma);
  const teams = await service.listEligibleTeams(typeId);

  assert.equal(teams.length, 1);
  assert.equal(teams[0].idEquipe, teamId);
  assert.equal('disponibilite' in teams[0], false);
});

test('creates an assignment using the direct dossier content identifier and team skill', async () => {
  const calls = { created: null, isolation: null, audit: 0 };
  const row = assignmentRow();
  const tx = {
    affectation: {
      findUnique: async ({ where }) => where.referenceOperationUnique ? null : row,    $executeRaw: async () => { calls.audit += 1; return 1; },

      findFirst: async () => null,
      create: async ({ data }) => {
        calls.created = data;
        return { idAffectation: assignmentId };
      },
      findUniqueOrThrow: async () => row,
    },
    contenuDossier: {
      findUnique: async () => ({
        idContenuDossier: contentId,
        idTypeDechet: typeId,
        etatContenuDossier: 'ACTIF',
        etatPriseEnCharge: 'EN_ATTENTE',
        dossier: { statutDossier: 'OUVERT' },
      }),
    },
    equipe: { findUnique: async () => ({ idEquipe: teamId, etatEquipe: 'ACTIVE' }) },
    competenceEquipe: { findFirst: async () => ({ idCompetenceEquipe: skillId }) },
  };
  const prisma = basePrisma();
  prisma.$transaction = async (operation, options) => {
    calls.isolation = options.isolationLevel;
    return operation(tx);
  };
  const service = new AssignmentsService(prisma);

  const result = await service.createAssignment({
    idContenuDossier: contentId,
    idEquipe: teamId,
  }, authId, 'assignment-key-0001');

  assert.equal(calls.created.idContenuDossier, contentId);
  assert.equal(calls.created.idCompetenceEquipe, skillId);
  assert.equal(result.idAffectation, assignmentId);
  assert.equal(result.idDossier, dossierId);
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(calls.audit, 1);
});

test('refuses to create an assignment when the team has no active competence', async () => {
  const tx = {
    affectation: {
      findUnique: async () => null,
    },
    contenuDossier: {
      findUnique: async () => ({
        idContenuDossier: contentId,
        etatContenuDossier: 'ACTIF',
        etatPriseEnCharge: 'EN_ATTENTE',
        dossier: { statutDossier: 'OUVERT' },
      }),
    },
    equipe: { findUnique: async () => ({ idEquipe: teamId, etatEquipe: 'ACTIVE' }) },
    competenceEquipe: { findFirst: async () => null },
  };
  const prisma = basePrisma();
  prisma.$transaction = async (operation) => operation(tx);
  const service = new AssignmentsService(prisma);

  await assert.rejects(
    service.createAssignment({ idContenuDossier: contentId, idEquipe: teamId }, authId, 'assignment-key-0002'),
    ConflictException,
  );
});

test('only an active team member can view the team assignment queue', async () => {
  const prisma = basePrisma();
  prisma.equipe = { findUnique: async () => ({ idEquipe: teamId }) };
  prisma.appartenanceEquipe = { findFirst: async () => null };
  const service = new AssignmentsService(prisma);

  await assert.rejects(service.listTeamAssignments(teamId, authId), ForbiddenException);
});
