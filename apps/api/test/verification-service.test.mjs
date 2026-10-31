import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import test from 'node:test';
import { VerificationService } from '../dist/modules/verification/verification.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const reporterId = '33333333-3333-4333-8333-333333333333';
const assignmentId = '44444444-4444-4444-8444-444444444444';
const caseId = '55555555-5555-4555-8555-555555555555';
const verificationId = '66666666-6666-4666-8666-666666666666';
const interventionId = '77777777-7777-4777-8777-777777777777';
const wasteTypeId = '88888888-8888-4888-8888-888888888888';
const submittedAt = new Date('2026-10-30T15:00:00.000Z');

function makeAssignment(options = {}) {
  return {
    idAffectation: assignmentId,
    idEquipe: '99999999-9999-4999-8999-999999999999',
    etatAffectation: options.assignmentState ?? 'ACTIVE',
    decisionEquipe: options.teamDecision ?? 'ACCEPTEE',
    dateFinAffectation: options.assignmentClosed ? new Date('2026-10-30T16:00:00.000Z') : null,
    contenuDossier: {
      idDossier: caseId,
      idTypeDechet: wasteTypeId,
      etatContenuDossier: options.contentStatus ?? 'ACTIF',
      etatPriseEnCharge: options.contentState ?? 'EN_COURS',
      dossier: {
        referenceDossier: 'DOS-2026-TEST',
        statutDossier: options.caseStatus ?? 'EN_COURS',
      },
    },
    interventions: options.interventions ?? [{
      idIntervention: interventionId,
      dateHeureDebut: new Date('2026-10-30T14:00:00.000Z'),
      dateSoumissionCompteRendu: options.submittedAt ?? submittedAt,
      statutIntervention: options.interventionStatus ?? 'SOUMISE',
      resultatIntervention: options.interventionResult ?? 'TERMINEE',
      compteRendu: options.report ?? 'Les déchets ont été retirés et la zone a été nettoyée.',
      motifException: null,
      renseignePar: options.reporterId ?? reporterId,
    }],
    verifications: options.verifications ?? [],
  };
}

function createHarness(options = {}) {
  const calls = {
    transactions: [],
    verificationCreates: [],
    assignmentUpdates: [],
    contentUpdates: [],
    caseUpdates: [],
    events: [],
    listReads: [],
  };
  const assignment = options.assignment ?? makeAssignment();
  const tx = {
    affectation: {
      findUnique: async () => options.assignmentMissing ? null : assignment,
      updateMany: async (args) => {
        calls.assignmentUpdates.push(args);
        return { count: options.assignmentUpdateCount ?? 1 };
      },
    },
    verificationResolution: {
      create: async ({ data }) => {
        calls.verificationCreates.push(data);
        return { idVerification: verificationId, ...data };
      },
    },
    contenuDossier: {
      updateMany: async (args) => {
        calls.contentUpdates.push(args);
        return { count: options.contentUpdateCount ?? 1 };
      },
      count: async () => options.remainingContentCount ?? 0,
    },
    dossierTraitement: {
      updateMany: async (args) => {
        calls.caseUpdates.push(args);
        return { count: options.caseUpdateCount ?? 1 };
      },
    },
    evenementMetier: {
      create: async ({ data }) => {
        calls.events.push(data);
        return data;
      },
    },
  };
  const prisma = {
    utilisateur: {
      findUnique: async () => ({
        idUtilisateur: actorId,
        etatCompte: options.accountState ?? 'ACTIF',
      }),
    },
    affectation: {
      findUnique: async () => options.assignmentMissing ? null : assignment,
      findMany: async (args) => {
        calls.listReads.push(args);
        return options.candidates ?? [assignment];
      },
    },
    $transaction: async (operation, transactionOptions) => {
      calls.transactions.push(transactionOptions);
      if (options.transactionError) throw options.transactionError;
      if (Array.isArray(operation)) return Promise.all(operation);
      return operation(tx);
    },
  };
  return { service: new VerificationService(prisma), calls, assignment };
}

test('lists only the latest submitted reports that still await a verification decision', async () => {
  const pending = makeAssignment();
  const alreadyVerified = makeAssignment({
    idAffectation: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    verifications: [{
      idVerification: verificationId,
      dateVerification: new Date('2026-10-30T16:00:00.000Z'),
      resultatVerification: 'A_REPRENDRE',
      etatVerification: 'REPRISE',
    }],
  });
  const noLatestSubmission = makeAssignment({
    interventions: [{
      idIntervention: interventionId,
      dateHeureDebut: new Date('2026-10-30T14:00:00.000Z'),
      dateSoumissionCompteRendu: null,
      statutIntervention: 'EN_COURS',
      resultatIntervention: null,
      compteRendu: null,
      motifException: null,
      renseignePar: reporterId,
    }],
  });
  const { service, calls } = createHarness({ candidates: [pending, alreadyVerified, noLatestSubmission] });

  const result = await service.listPending({ page: 1, pageSize: 20 }, authUserId);

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].affectation.idAffectation, assignmentId);
  assert.equal(calls.listReads.length, 1);
});

test('returns the latest submitted report for a pending assignment', async () => {
  const { service } = createHarness();

  const result = await service.getPending(assignmentId, authUserId);

  assert.equal(result.affectation.idAffectation, assignmentId);
  assert.equal(result.intervention.idIntervention, interventionId);
  assert.equal(result.intervention.statutIntervention, 'SOUMISE');
  assert.equal(result.derniereVerification, null);
});

test('rejects details for an assignment whose latest report has already been verified', async () => {
  const { service } = createHarness({
    assignment: makeAssignment({
      verifications: [{
        idVerification: verificationId,
        dateVerification: new Date('2026-10-30T16:00:00.000Z'),
        resultatVerification: 'A_REPRENDRE',
        etatVerification: 'REPRISE',
      }],
    }),
  });

  await assert.rejects(
    service.getPending(assignmentId, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
});

test('requires a reason before creating a reprise decision', async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'A_REPRENDRE' }, authUserId),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.transactions.length, 0);
  assert.equal(calls.verificationCreates.length, 0);
});

test('prevents an agent from verifying their own intervention', async () => {
  const { service, calls } = createHarness({
    assignment: makeAssignment({ reporterId: actorId }),
  });

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authUserId),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(calls.verificationCreates.length, 0);
  assert.equal(calls.assignmentUpdates.length, 0);
});

test('does not validate partial or impossible field results as conform', async () => {
  const { service, calls } = createHarness({
    assignment: makeAssignment({ interventionResult: 'PARTIELLE' }),
  });

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.verificationCreates.length, 0);
  assert.equal(calls.contentUpdates.length, 0);
});

test('records a reprise and leaves the assignment active for another intervention', async () => {
  const { service, calls } = createHarness();

  const result = await service.decide(
    assignmentId,
    {
      resultatVerification: 'A_REPRENDRE',
      motif: 'Le nettoyage est incomplet près du point de collecte.',
    },
    authUserId,
  );

  assert.equal(result.verification.idVerification, verificationId);
  assert.equal(result.verification.etatVerification, 'REPRISE');
  assert.equal(calls.verificationCreates[0].resultatVerification, 'A_REPRENDRE');
  assert.equal(calls.assignmentUpdates.length, 0);
  assert.equal(calls.contentUpdates.length, 0);
  assert.equal(calls.events[0].idVerificationCible, verificationId);
  assert.equal(calls.events[0].typeEvenement, 'REPRISE_DEMANDEE');
  assert.equal(calls.events[0].motif, 'Le nettoyage est incomplet près du point de collecte.');
  assert.equal(result.dossierCloture, false);
});

test('validates a completed intervention, ends its assignment and closes a fully completed case', async () => {
  const { service, calls } = createHarness();

  const result = await service.decide(
    assignmentId,
    { resultatVerification: 'CONFORME', referencePreuve: 'audit://proof/123' },
    authUserId,
  );

  assert.equal(result.verification.idVerification, verificationId);
  assert.equal(result.verification.etatVerification, 'VALIDEE');
  assert.equal(calls.assignmentUpdates[0].data.etatAffectation, 'TERMINEE');
  assert.ok(calls.assignmentUpdates[0].data.dateFinAffectation instanceof Date);
  assert.equal(calls.contentUpdates[0].data.etatPriseEnCharge, 'TERMINE');
  assert.equal(calls.caseUpdates.length, 1);
  assert.equal(calls.caseUpdates[0].data.statutDossier, 'CLOTURE');
  assert.ok(calls.caseUpdates[0].data.dateCloture instanceof Date);
  assert.equal(calls.events[0].typeEvenement, 'RESOLUTION_VALIDEE');
  assert.equal(calls.events[0].idVerificationCible, verificationId);
  assert.equal(calls.events[1].typeEvenement, 'DOSSIER_CLOTURE_VERIFIEE');
  assert.equal(calls.events[1].idDossierCible, caseId);
  assert.equal(result.dossierCloture, true);
});

test('keeps the dossier open while another active content still requires treatment', async () => {
  const { service, calls } = createHarness({ remainingContentCount: 1 });

  const result = await service.decide(
    assignmentId,
    { resultatVerification: 'CONFORME' },
    authUserId,
  );

  assert.equal(calls.assignmentUpdates.length, 1);
  assert.equal(calls.contentUpdates.length, 1);
  assert.equal(calls.caseUpdates.length, 0);
  assert.equal(result.dossierCloture, false);
  assert.equal(calls.events.length, 1);
});

test('rejects a concurrent assignment update and rolls the transaction back', async () => {
  const { service, calls } = createHarness({ assignmentUpdateCount: 0 });

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.caseUpdates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('rejects an already closed dossier or retired content from verification', async () => {
  const { service, calls } = createHarness({
    assignment: makeAssignment({ caseStatus: 'CLOTURE' }),
  });

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.verificationCreates.length, 0);
});

test('maps serialization failures to HTTP 409', async () => {
  const { service } = createHarness({
    transactionError: Object.assign(new Error('serialization failure'), { code: 'P2034' }),
  });

  await assert.rejects(
    service.decide(assignmentId, { resultatVerification: 'CONFORME' }, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
});
