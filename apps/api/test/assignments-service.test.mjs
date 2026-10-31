import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import test from 'node:test';
import { AssignmentsService } from '../dist/modules/assignments/assignments.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const caseId = '33333333-3333-4333-8333-333333333333';
const wasteTypeId = '44444444-4444-4444-8444-444444444444';
const teamId = '55555555-5555-4555-8555-555555555555';
const otherTeamId = '66666666-6666-4666-8666-666666666666';
const assignmentId = '77777777-7777-4777-8777-777777777777';
const competenceId = '88888888-8888-4888-8888-888888888888';
const idempotencyKey = 'assignment-test-key-001';

function createHarness(options = {}) {
  const calls = {
    transactions: [],
    assignmentsCreated: [],
    assignmentUpdates: [],
    contentUpdates: [],
    events: [],
    memberships: [],
    competenceReads: [],
    teamReads: [],
  };
  const content = options.content ?? {
    idDossier: caseId,
    idTypeDechet: wasteTypeId,
    etatContenuDossier: 'ACTIF',
    etatPriseEnCharge: options.contentState ?? 'EN_ATTENTE',
    dossier: { statutDossier: options.caseStatus ?? 'OUVERT' },
  };
  const assignment = options.assignment ?? {
    idAffectation: assignmentId,
    idDossier: caseId,
    idTypeDechet: wasteTypeId,
    idEquipe: teamId,
    idCompetenceEquipe: competenceId,
    dateFinAffectation: options.assignmentClosed ? new Date('2026-10-30T11:00:00.000Z') : null,
    etatAffectation: options.assignmentState ?? (options.assignmentClosed ? 'TERMINEE' : 'ACTIVE'),
    decisionEquipe: options.decisionEquipe ?? 'EN_ATTENTE',
    observation: null,
    contenuDossier: content,
  };
  const tx = {
    contenuDossier: {
      findUnique: async () => options.contentMissing ? null : content,
      updateMany: async (args) => {
        calls.contentUpdates.push(args);
        return { count: options.contentUpdateCount ?? 1 };
      },
    },
    equipe: {
      findUnique: async ({ where }) => {
        calls.teamReads.push(where);
        if (options.teamMissing) return null;
        return {
          idEquipe: where.idEquipe,
          etatEquipe: options.teamState ?? 'ACTIVE',
          nomEquipe: 'Équipe collecte',
        };
      },
    },
    competenceEquipe: {
      findFirst: async (args) => {
        calls.competenceReads.push(args);
        return options.competenceMissing ? null : { idCompetenceEquipe: competenceId };
      },
    },
    disponibiliteEquipe: {
      findUnique: async () => options.availability ?? null,
    },
    affectation: {
      findUnique: async ({ where }) => {
        if (where.referenceOperationUnique) return options.replay ?? null;
        if (options.assignmentMissing) return null;
        return assignment;
      },
      findFirst: async () => options.currentAssignment ?? null,
      create: async ({ data }) => {
        calls.assignmentsCreated.push(data);
        return { idAffectation: options.newAssignmentId ?? assignmentId };
      },
      findUniqueOrThrow: async () => ({
        ...assignment,
        idAffectation: options.newAssignmentId ?? assignmentId,
        idEquipe: options.newTeamId ?? teamId,
        equipe: { idEquipe: options.newTeamId ?? teamId, nomEquipe: 'Équipe collecte', etatEquipe: 'ACTIVE' },
        competence: { idCompetenceEquipe: competenceId, dateDebut: new Date('2026-01-01T00:00:00.000Z'), dateFin: null },
        contenuDossier: {
          ...content,
          typeDechet: { idTypeDechet: wasteTypeId, codeType: 'PLASTIQUE', libelle: 'Plastique' },
          dossier: { referenceDossier: 'DOS-TEST', statutDossier: 'OUVERT' },
        },
      }),
      updateMany: async (args) => {
        calls.assignmentUpdates.push(args);
        return { count: options.assignmentUpdateCount ?? 1 };
      },
    },
    appartenanceEquipe: {
      findFirst: async (args) => {
        calls.memberships.push(args);
        return options.membershipMissing ? null : { idUtilisateur: actorId, idEquipe: teamId };
      },
    },
    intervention: {
      count: async () => options.interventionCount ?? 0,
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
      findUnique: async () => ({ idEquipe: teamId, etatEquipe: 'ACTIVE' }),
    },
    appartenanceEquipe: {
      findFirst: async () => ({ idUtilisateur: actorId, idEquipe: teamId }),
    },
    affectation: {
      count: async () => 1,
      findMany: async () => [],
    },
    $transaction: async (operation, transactionOptions) => {
      calls.transactions.push(transactionOptions);
      if (options.transactionError) throw options.transactionError;
      if (Array.isArray(operation)) return Promise.all(operation);
      return operation(tx);
    },
  };

  return {
    service: new AssignmentsService(prisma),
    calls,
    tx,
    content,
    assignment,
  };
}

const createDto = {
  idDossier: caseId,
  idTypeDechet: wasteTypeId,
  idEquipe: teamId,
  motif: 'Priorité opérationnelle confirmée.',
};

test('creates an assignment only when content, team, skill and availability are eligible', async () => {
  const { service, calls } = createHarness();

  const result = await service.createAssignment(createDto, authUserId, idempotencyKey);

  assert.equal(result.idAffectation, assignmentId);
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.assignmentsCreated.length, 1);
  assert.equal(calls.assignmentsCreated[0].etatAffectation, 'ACTIVE');
  assert.equal(calls.assignmentsCreated[0].decisionEquipe, 'EN_ATTENTE');
  assert.equal(calls.assignmentsCreated[0].referenceOperationUnique.length, 64);
  assert.equal(calls.events[0].idAffectationCible, assignmentId);
  assert.equal(calls.events[0].typeEvenement, 'AFFECTATION_CREEE');
});

test('replays the same idempotency key and payload without creating a duplicate', async () => {
  const replay = { idAffectation: assignmentId, decisionEquipe: 'EN_ATTENTE' };
  const { service, calls } = createHarness({ replay });

  const result = await service.createAssignment(createDto, authUserId, idempotencyKey);

  assert.equal(result.idAffectation, assignmentId);
  assert.equal(calls.assignmentsCreated.length, 0);
  assert.equal(calls.events.length, 0);
});

test('requires a valid idempotency key before opening a transaction', async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    service.createAssignment(createDto, authUserId, 'short'),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.transactions.length, 0);
});

test('rejects an inactive team before creating an assignment', async () => {
  const { service, calls } = createHarness({ teamState: 'INACTIVE' });

  await assert.rejects(
    service.createAssignment(createDto, authUserId, idempotencyKey),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.assignmentsCreated.length, 0);
  assert.equal(calls.events.length, 0);
});

test('rejects a team without a valid competence for the waste type', async () => {
  const { service, calls } = createHarness({ competenceMissing: true });

  await assert.rejects(
    service.createAssignment(createDto, authUserId, idempotencyKey),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.assignmentsCreated.length, 0);
});

test('rejects an explicitly unavailable team', async () => {
  const { service, calls } = createHarness({
    availability: {
      etatDisponibilite: 'INDISPONIBLE',
      valideJusqua: new Date(Date.now() + 60_000),
    },
  });

  await assert.rejects(
    service.createAssignment(createDto, authUserId, idempotencyKey),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.assignmentsCreated.length, 0);
});

test('rejects a closed case or a content item that is not active and awaiting assignment', async () => {
  const { service, calls } = createHarness({
    content: {
      idDossier: caseId,
      idTypeDechet: wasteTypeId,
      etatContenuDossier: 'ACTIF',
      etatPriseEnCharge: 'EN_COURS',
      dossier: { statutDossier: 'OUVERT' },
    },
  });

  await assert.rejects(
    service.createAssignment(createDto, authUserId, idempotencyKey),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.assignmentsCreated.length, 0);
});

test('rejects a second active assignment for the same dossier content', async () => {
  const { service, calls } = createHarness({
    currentAssignment: { idAffectation: assignmentId, idEquipe: otherTeamId },
  });

  await assert.rejects(
    service.createAssignment(createDto, authUserId, idempotencyKey),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.assignmentsCreated.length, 0);
});

test('only an active member of the assigned team may accept an assignment', async () => {
  const { service, calls } = createHarness();

  const result = await service.respondToAssignment(
    assignmentId,
    { decisionEquipe: 'ACCEPTEE' },
    authUserId,
  );

  assert.equal(result.idAffectation, assignmentId);
  assert.equal(calls.memberships.length, 1);
  assert.equal(calls.assignmentUpdates[0].data.decisionEquipe, 'ACCEPTEE');
  assert.equal(calls.contentUpdates[0].data.etatPriseEnCharge, 'EN_COURS');
  assert.equal(calls.events[0].typeEvenement, 'EQUIPE_AFFECTATION_ACCEPTEE');
});

test('refuses access to an agent who is not an active member of the team', async () => {
  const { service, calls } = createHarness({ membershipMissing: true });

  await assert.rejects(
    service.respondToAssignment(assignmentId, { decisionEquipe: 'ACCEPTEE' }, authUserId),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(calls.assignmentUpdates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('requires a reason and closes the assignment when the team refuses', async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    service.respondToAssignment(assignmentId, { decisionEquipe: 'REFUSEE' }, authUserId),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.transactions.length, 0);

  await service.respondToAssignment(
    assignmentId,
    { decisionEquipe: 'REFUSEE', motifRefusEquipe: 'Équipement indisponible pour cette mission.' },
    authUserId,
  );

  assert.equal(calls.assignmentUpdates[0].data.decisionEquipe, 'REFUSEE');
  assert.equal(calls.assignmentUpdates[0].data.etatAffectation, 'TERMINEE');
  assert.ok(calls.assignmentUpdates[0].data.dateFinAffectation instanceof Date);
  assert.equal(calls.contentUpdates.length, 0);
  assert.equal(calls.events[0].typeEvenement, 'EQUIPE_AFFECTATION_REFUSEE');
});

test('reassigns a refused assignment while preserving its closed history', async () => {
  const newAssignmentId = '99999999-9999-4999-8999-999999999999';
  const { service, calls } = createHarness({
    assignmentClosed: true,
    decisionEquipe: 'REFUSEE',
    assignmentState: 'TERMINEE',
    newAssignmentId,
    newTeamId: otherTeamId,
  });

  const result = await service.reassign(
    assignmentId,
    { idEquipe: otherTeamId, motif: 'Réaffectation après refus motivé.' },
    authUserId,
    'reassign-operation-key-001',
  );

  assert.equal(result.idAffectation, newAssignmentId);
  assert.equal(calls.assignmentUpdates.length, 0);
  assert.equal(calls.assignmentsCreated.length, 1);
  assert.equal(calls.assignmentsCreated[0].idEquipe, otherTeamId);
  assert.equal(calls.events[0].typeEvenement, 'AFFECTATION_REAFFECTEE');
});

test('does not reassign work that already has an intervention', async () => {
  const { service, calls } = createHarness({ interventionCount: 1 });

  await assert.rejects(
    service.reassign(
      assignmentId,
      { idEquipe: otherTeamId, motif: 'Réorganisation de l’équipe terrain.' },
      authUserId,
      'reassign-operation-key-001',
    ),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.assignmentsCreated.length, 0);
});

test('maps a serializable transaction conflict to HTTP 409', async () => {
  const { service } = createHarness({
    transactionError: Object.assign(new Error('serialization failure'), { code: 'P2034' }),
  });

  await assert.rejects(
    service.createAssignment(createDto, authUserId, idempotencyKey),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
});
