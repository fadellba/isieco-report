import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import test from 'node:test';
import { VerificationService } from '../dist/modules/verification/verification.service.js';

const authId = '11111111-1111-4111-8111-111111111111';
const verifierId = '22222222-2222-4222-8222-222222222222';
const authorId = '33333333-3333-4333-8333-333333333333';
const assignmentId = '44444444-4444-4444-8444-444444444444';
const interventionId = '55555555-5555-4555-8555-555555555555';
const contentId = '66666666-6666-4666-8666-666666666666';
const dossierId = '77777777-7777-4777-8777-777777777777';

function submittedIntervention(overrides = {}) {
  return {
    idIntervention: interventionId,
    idAffectation: assignmentId,
    renseignePar: authorId,
    resultatIntervention: 'TERMINEE',
    affectation: {
      idAffectation: assignmentId,
      dateFinAffectation: null,
      etatAffectation: 'ACTIVE',
      decisionEquipe: 'ACCEPTEE',
      contenuDossier: {
        idContenuDossier: contentId,
        idDossier: dossierId,
        etatContenuDossier: 'ACTIF',
        etatPriseEnCharge: 'EN_COURS',
        dossier: { statutDossier: 'EN_COURS' },
      },
    },
    ...overrides,
  };
}

test('creates Verification against the exact Intervention and closes completed work', async () => {
  const calls = { verification: null, assignment: null, content: null, dossier: null, audit: 0 };
  const tx = {
    $executeRaw: async () => { calls.audit += 1; return 1; },
    intervention: { findFirst: async () => submittedIntervention() },
    verification: {
      create: async ({ data }) => {
        calls.verification = data;
        return { idVerification: '88888888-8888-4888-8888-888888888888', ...data };
      },
    },
    affectation: {
      updateMany: async (args) => { calls.assignment = args; return { count: 1 }; },
    },
    contenuDossier: {
      updateMany: async (args) => { calls.content = args; return { count: 1 }; },
      count: async () => 0,
    },
    dossierTraitement: {
      updateMany: async (args) => { calls.dossier = args; return { count: 1 }; },
    },
  };
  const prisma = {
    utilisateur: { findUnique: async () => ({ idUtilisateur: verifierId, etatCompte: 'ACTIF' }) },
    $transaction: async (operation, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      return operation(tx);
    },
  };
  const service = new VerificationService(prisma, {});
  const result = await service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authId);

  assert.equal(calls.verification.idIntervention, interventionId);
  assert.equal(calls.verification.idVerificateur, verifierId);
  assert.equal(calls.assignment.data.etatAffectation, 'TERMINEE');
  assert.equal(calls.content.data.etatPriseEnCharge, 'TERMINE');
  assert.equal(calls.dossier.data.statutDossier, 'CLOTURE');
  assert.equal(result.verification.etatVerification, 'VALIDEE');
  assert.equal(result.dossierCloture, true);
  assert.equal(calls.audit, 2);
});

test('does not allow an intervention author to verify their own work', async () => {
  const tx = {
    intervention: { findFirst: async () => submittedIntervention({ renseignePar: verifierId }) },
    verification: { create: async () => { throw new Error('must not verify'); } },
  };
  const prisma = {
    utilisateur: { findUnique: async () => ({ idUtilisateur: verifierId, etatCompte: 'ACTIF' }) },
    $transaction: async (operation) => operation(tx),
  };
  const service = new VerificationService(prisma, {});

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authId),
    ForbiddenException,
  );
});

test('requires a motif to record a reprise', async () => {
  const prisma = {
    utilisateur: { findUnique: async () => ({ idUtilisateur: verifierId, etatCompte: 'ACTIF' }) },
    $transaction: async () => { throw new Error('transaction should not begin'); },
  };
  const service = new VerificationService(prisma, {});

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'A_REPRENDRE' }, authId),
    (error) => error instanceof ConflictException || error?.getStatus?.() === 400,
  );
});

test('only TERMINEE field results can be validated as conforming', async () => {
  const tx = {
    intervention: { findFirst: async () => submittedIntervention({ resultatIntervention: 'PARTIELLE' }) },
    verification: { create: async () => { throw new Error('must not validate'); } },
  };
  const prisma = {
    utilisateur: { findUnique: async () => ({ idUtilisateur: verifierId, etatCompte: 'ACTIF' }) },
    $transaction: async (operation) => operation(tx),
  };
  const service = new VerificationService(prisma, {});

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authId),
    ConflictException,
  );
});
