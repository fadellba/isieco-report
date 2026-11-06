import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import test from 'node:test';
import { InterventionsService } from '../dist/modules/interventions/interventions.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const otherUserId = '33333333-3333-4333-8333-333333333333';
const assignmentId = '44444444-4444-4444-8444-444444444444';
const interventionId = '55555555-5555-4555-8555-555555555555';
const teamId = '66666666-6666-4666-8666-666666666666';

function actorPrisma() {
  return {
    utilisateur: { findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }) },
  };
}

function currentIntervention(overrides = {}) {
  return {
    idIntervention: interventionId,
    idAffectation: assignmentId,
    dateHeureFin: null,
    dateSoumissionCompteRendu: null,
    statutIntervention: 'EN_COURS',
    renseignePar: actorId,
    affectation: {
      idEquipe: teamId,
      dateFinAffectation: null,
      etatAffectation: 'ACTIVE',
      decisionEquipe: 'ACCEPTEE',
      contenuDossier: {
        etatContenuDossier: 'ACTIF',
        etatPriseEnCharge: 'EN_COURS',
        dossier: { statutDossier: 'OUVERT' },
      },
    },
    ...overrides,
  };
}

function responseRow() {
  return {
    idIntervention: interventionId,
    idAffectation: assignmentId,
    dateHeureDebut: new Date('2026-11-01T08:00:00.000Z'),
    dateHeureFin: new Date('2026-11-01T09:00:00.000Z'),
    dateSoumissionCompteRendu: new Date('2026-11-01T09:00:00.000Z'),
    statutIntervention: 'SOUMISE',
    resultatIntervention: 'TERMINEE',
    compteRendu: 'La zone a été nettoyée et les déchets collectés.',
    motifException: null,
    renseignePar: actorId,
    photos: [],
    verification: null,
    affectation: {
      idAffectation: assignmentId,
      idEquipe: teamId,
      etatAffectation: 'ACTIVE',
      decisionEquipe: 'ACCEPTEE',
      contenuDossier: {
        idDossier: '77777777-7777-4777-8777-777777777777',
        idTypeDechet: '88888888-8888-4888-8888-888888888888',
        etatContenuDossier: 'ACTIF',
        etatPriseEnCharge: 'EN_COURS',
        dossier: { referenceDossier: 'DOS-001', statutDossier: 'OUVERT' },
        typeDechet: { codeType: 'PLASTIQUE', libelle: 'Plastique' },
      },
    },
  };
}

test('only the intervention author may submit the field report', async () => {
  const tx = {
    intervention: {
      findUnique: async () => currentIntervention({ renseignePar: otherUserId }),
      updateMany: async () => { throw new Error('must not submit'); },
    },
  };
  const prisma = actorPrisma();
  prisma.$transaction = async (operation) => operation(tx);
  const service = new InterventionsService(prisma, {});

  await assert.rejects(
    service.submitIntervention(interventionId, {
      resultatIntervention: 'TERMINEE',
      compteRendu: 'La zone a été nettoyée et les déchets collectés.',
    }, authId),
    ForbiddenException,
  );
});

test('submits the intervention report and records a business audit event', async () => {
  const calls = { update: null, isolation: null, audit: 0 };
  const membership = { findFirst: async () => ({ idEquipe: teamId }) };
  const tx = {
    $executeRaw: async () => { calls.audit += 1; return 1; },
    intervention: {
      findUnique: async () => currentIntervention(),
      updateMany: async (args) => { calls.update = args; return { count: 1 }; },
      findUniqueOrThrow: async () => responseRow(),
    },
    appartenanceEquipe: membership,
  };
  const prisma = actorPrisma();
  prisma.$transaction = async (operation, options) => {
    calls.isolation = options.isolationLevel;
    return operation(tx);
  };
  const service = new InterventionsService(prisma, {});

  const result = await service.submitIntervention(interventionId, {
    resultatIntervention: 'TERMINEE',
    compteRendu: 'La zone a été nettoyée et les déchets collectés.',
  }, authId);

  assert.equal(calls.update.data.statutIntervention, 'SOUMISE');
  assert.equal(calls.update.data.resultatIntervention, 'TERMINEE');
  assert.equal(calls.isolation, 'Serializable');
  assert.equal(result.idIntervention, interventionId);
  assert.equal(calls.audit, 1);
});

test('requires an explicit Verification A_REPRENDRE before starting a new intervention', async () => {
  const now = new Date('2026-11-01T10:00:00.000Z');
  const tx = {
    affectation: {
      findUnique: async () => ({
        idAffectation: assignmentId,
        idEquipe: teamId,
        dateFinAffectation: null,
        etatAffectation: 'ACTIVE',
        decisionEquipe: 'ACCEPTEE',
        equipe: { etatEquipe: 'ACTIVE' },
        contenuDossier: {
          idContenuDossier: '77777777-7777-4777-8777-777777777777',
          etatContenuDossier: 'ACTIF',
          etatPriseEnCharge: 'EN_COURS',
          dossier: { statutDossier: 'OUVERT' },
        },
      }),
    },
    appartenanceEquipe: { findFirst: async () => ({ idEquipe: teamId }) },
    intervention: {
      findFirst: async () => ({
        idIntervention: interventionId,
        statutIntervention: 'SOUMISE',
        dateSoumissionCompteRendu: now,
        verification: { resultatVerification: 'CONFORME', dateVerification: new Date(now.getTime() + 1000) },
      }),
      create: async () => { throw new Error('must not start'); },
    },
  };
  const prisma = actorPrisma();
  prisma.$transaction = async (operation) => operation(tx);
  const service = new InterventionsService(prisma, {});

  await assert.rejects(service.startIntervention(assignmentId, authId), ConflictException);
});
