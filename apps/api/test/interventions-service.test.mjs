import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import test from 'node:test';
import { InterventionsService } from '../dist/modules/interventions/interventions.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const assignmentId = '33333333-3333-4333-8333-333333333333';
const interventionId = '44444444-4444-4444-8444-444444444444';
const teamId = '55555555-5555-4555-8555-555555555555';

function createHarness(options = {}) {
  const calls = {
    transactions: [],
    interventionsCreated: [],
    interventionUpdates: [],
    events: [],
    memberships: [],
  };
  const assignment = options.assignment ?? {
    idAffectation: assignmentId,
    idEquipe: teamId,
    dateFinAffectation: null,
    etatAffectation: 'ACTIVE',
    decisionEquipe: options.decisionEquipe ?? 'ACCEPTEE',
    equipe: { etatEquipe: options.teamState ?? 'ACTIVE' },
    contenuDossier: {
      etatContenuDossier: options.contentStatus ?? 'ACTIF',
      etatPriseEnCharge: options.contentState ?? 'EN_COURS',
      dossier: { statutDossier: options.caseStatus ?? 'OUVERT' },
    },
  };
  const currentIntervention = {
    idIntervention: interventionId,
    idAffectation: assignmentId,
    dateHeureDebut: new Date('2026-10-31T10:00:00.000Z'),
    dateHeureFin: null,
    dateSoumissionCompteRendu: null,
    statutIntervention: 'EN_COURS',
    renseignePar: options.interventionAuthor ?? actorId,
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
  };
  const tx = {
    affectation: {
      findUnique: async () => options.assignmentMissing ? null : assignment,
    },
    appartenanceEquipe: {
      findFirst: async (args) => {
        calls.memberships.push(args);
        return options.membershipMissing ? null : { idUtilisateur: actorId, idEquipe: teamId };
      },
    },
    intervention: {
      findFirst: async (args) => {
        if (args.where?.statutIntervention === 'EN_COURS') return options.openIntervention ?? null;
        return options.latestIntervention ?? null;
      },
      create: async ({ data }) => {
        calls.interventionsCreated.push(data);
        return { idIntervention: interventionId };
      },
      findUnique: async () => options.interventionMissing ? null : currentIntervention,
      findUniqueOrThrow: async () => ({
        ...currentIntervention,
        statutIntervention: options.returnStatus ?? 'EN_COURS',
      }),
      updateMany: async (args) => {
        calls.interventionUpdates.push(args);
        return { count: options.interventionUpdateCount ?? 1 };
      },
    },
    verificationResolution: {
      findFirst: async () => options.latestVerification ?? null,
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
    equipe: {
      findUnique: async () => ({ idEquipe: teamId }),
    },
    appartenanceEquipe: {
      findFirst: async () => ({ idEquipe: teamId, idUtilisateur: actorId }),
    },
    affectation: {
      findMany: async () => [{ idAffectation: assignmentId }],
    },
    intervention: {
      findMany: async () => [],
    },
    $transaction: async (operation, transactionOptions) => {
      calls.transactions.push(transactionOptions);
      if (options.transactionError) throw options.transactionError;
      if (Array.isArray(operation)) return Promise.all(operation);
      return operation(tx);
    },
  };

  return { service: new InterventionsService(prisma), calls, assignment, currentIntervention };
}

test('starts an intervention only for an accepted active assignment and active team member', async () => {
  const { service, calls } = createHarness();

  const result = await service.startIntervention(assignmentId, authUserId);

  assert.equal(result.idIntervention, interventionId);
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.interventionsCreated.length, 1);
  assert.equal(calls.interventionsCreated[0].statutIntervention, 'EN_COURS');
  assert.equal(calls.interventionsCreated[0].renseignePar, actorId);
  assert.equal(calls.events[0].idInterventionCible, interventionId);
  assert.equal(calls.events[0].typeEvenement, 'INTERVENTION_DEMARREE');
});

test('rejects starting an intervention before the team accepts the assignment', async () => {
  const { service, calls } = createHarness({ decisionEquipe: 'EN_ATTENTE' });

  await assert.rejects(
    service.startIntervention(assignmentId, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.interventionsCreated.length, 0);
});

test('rejects a field agent who is no longer a member of the assigned team', async () => {
  const { service, calls } = createHarness({ membershipMissing: true });

  await assert.rejects(
    service.startIntervention(assignmentId, authUserId),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(calls.interventionsCreated.length, 0);
});

test('rejects a duplicate open intervention for the same assignment', async () => {
  const { service, calls } = createHarness({
    openIntervention: { idIntervention: interventionId },
  });

  await assert.rejects(
    service.startIntervention(assignmentId, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.interventionsCreated.length, 0);
});

test('does not allow a second intervention until the verifier requests a reprise', async () => {
  const latestIntervention = {
    idIntervention: interventionId,
    statutIntervention: 'SOUMISE',
    dateSoumissionCompteRendu: new Date('2026-10-30T15:00:00.000Z'),
  };
  const { service, calls } = createHarness({ latestIntervention });

  await assert.rejects(
    service.startIntervention(assignmentId, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.interventionsCreated.length, 0);
});

test('allows a new intervention after an explicit verifier reprise decision', async () => {
  const latestIntervention = {
    idIntervention: interventionId,
    statutIntervention: 'SOUMISE',
    dateSoumissionCompteRendu: new Date('2026-10-30T15:00:00.000Z'),
  };
  const { service, calls } = createHarness({
    latestIntervention,
    latestVerification: { etatVerification: 'REPRISE' },
  });

  await service.startIntervention(assignmentId, authUserId);

  assert.equal(calls.interventionsCreated.length, 1);
});

test('requires a reason for partial or impossible intervention results', async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    service.submitIntervention(
      interventionId,
      { resultatIntervention: 'PARTIELLE', compteRendu: 'Le nettoyage a été réalisé partiellement.' },
      authUserId,
    ),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.transactions.length, 0);
});

test('submits a completed intervention with its report and a business event', async () => {
  const { service, calls } = createHarness({ returnStatus: 'SOUMISE' });

  const result = await service.submitIntervention(
    interventionId,
    {
      resultatIntervention: 'TERMINEE',
      compteRendu: 'Les déchets ont été enlevés et la zone a été remise en état.',
    },
    authUserId,
  );

  assert.equal(result.idIntervention, interventionId);
  assert.equal(calls.interventionUpdates[0].data.statutIntervention, 'SOUMISE');
  assert.equal(calls.interventionUpdates[0].data.resultatIntervention, 'TERMINEE');
  assert.equal(calls.interventionUpdates[0].data.compteRendu, 'Les déchets ont été enlevés et la zone a été remise en état.');
  assert.ok(calls.interventionUpdates[0].data.dateSoumissionCompteRendu instanceof Date);
  assert.equal(calls.events[0].typeEvenement, 'INTERVENTION_COMPTE_RENDU_SOUMIS');
});

test('submits a partial result with a recorded exception reason', async () => {
  const { service, calls } = createHarness({ returnStatus: 'SOUMISE' });

  await service.submitIntervention(
    interventionId,
    {
      resultatIntervention: 'PARTIELLE',
      compteRendu: 'Une partie du dépôt reste inaccessible pour cette intervention.',
      motifException: 'Accès bloqué par des travaux sur la voie.',
    },
    authUserId,
  );

  assert.equal(calls.interventionUpdates[0].data.resultatIntervention, 'PARTIELLE');
  assert.equal(calls.interventionUpdates[0].data.motifException, 'Accès bloqué par des travaux sur la voie.');
  assert.equal(calls.events[0].motif, 'Accès bloqué par des travaux sur la voie.');
});

test('only the agent who started an intervention may submit it', async () => {
  const { service, calls } = createHarness({
    interventionAuthor: '99999999-9999-4999-8999-999999999999',
  });

  await assert.rejects(
    service.submitIntervention(
      interventionId,
      {
        resultatIntervention: 'TERMINEE',
        compteRendu: 'Les déchets ont été enlevés et la zone a été remise en état.',
      },
      authUserId,
    ),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(calls.interventionUpdates.length, 0);
});

test('rejects a closed intervention when the report was already submitted', async () => {
  const { service, calls, currentIntervention } = createHarness();
  currentIntervention.dateSoumissionCompteRendu = new Date('2026-10-31T11:00:00.000Z');

  await assert.rejects(
    service.submitIntervention(
      interventionId,
      {
        resultatIntervention: 'TERMINEE',
        compteRendu: 'Les déchets ont été enlevés et la zone a été remise en état.',
      },
      authUserId,
    ),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.interventionUpdates.length, 0);
});

test('maps serializable write conflicts to HTTP 409', async () => {
  const { service } = createHarness({
    transactionError: Object.assign(new Error('serialization failure'), { code: 'P2034' }),
  });

  await assert.rejects(
    service.startIntervention(assignmentId, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
});
