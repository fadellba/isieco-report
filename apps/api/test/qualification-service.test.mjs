import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import test from 'node:test';
import { QualificationService } from '../dist/modules/qualification/qualification.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const demandId = '44444444-4444-4444-8444-444444444444';
const wasteTypeId = '55555555-5555-4555-8555-555555555555';

function createHarness(options = {}) {
  const calls = {
    transactions: [],
    demandCreates: [],
    demandReads: [],
    reportUpdates: [],
    qualificationCreates: [],
    qualificationReads: [],
    wasteTypeReads: [],
    events: [],
  };
  const report = {
    idSignalement: reportId,
    statutSignalement: options.status ?? 'SOUMIS',
  };
  let openDemand = options.openDemand ?? null;
  const activeWasteTypes = options.activeWasteTypes ?? [{ idTypeDechet: wasteTypeId }];

  const tx = {
    signalement: {
      findUnique: async () => report,
      updateMany: async ({ where, data }) => {
        calls.reportUpdates.push({ where, data });
        if (where.statutSignalement && where.statutSignalement !== report.statutSignalement) {
          return { count: 0 };
        }
        Object.assign(report, data);
        return { count: 1 };
      },
    },
    demandeComplement: {
      findFirst: async () => {
        calls.demandReads.push(true);
        return openDemand;
      },
      create: async ({ data }) => {
        calls.demandCreates.push(data);
        const created = { idDemande: demandId, ...data };
        openDemand = created;
        return created;
      },
    },
    typeDechet: {
      findMany: async (args) => {
        calls.wasteTypeReads.push(args);
        return activeWasteTypes;
      },
    },
    qualificationSignalement: {
      createMany: async ({ data }) => {
        calls.qualificationCreates.push(...data);
        return { count: data.length };
      },
      findMany: async () => {
        calls.qualificationReads.push(true);
        return calls.qualificationCreates.map((data, index) => ({
          idQualification: `qualification-${index + 1}`,
          ...data,
          typeDechet: { codeType: 'ORGANIQUE', libelle: 'Déchets organiques' },
        }));
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
    $transaction: async (operation, transactionOptions) => {
      calls.transactions.push(transactionOptions);
      return operation(tx);
    },
  };

  return {
    service: new QualificationService(prisma),
    calls,
    report,
    getOpenDemand: () => openDemand,
  };
}

const acceptDto = {
  contenus: [
    {
      idTypeDechet: wasteTypeId,
      quantiteEstimee: 2,
      uniteQuantite: 'kg',
      volumeEstime: 1.5,
      remarque: 'Quantité confirmée par l’agent.',
    },
  ],
};

test('requests a supplement and atomically moves the report to the waiting state', async () => {
  const { service, calls, report, getOpenDemand } = createHarness();

  const result = await service.requestSupplement(
    reportId,
    { motif: 'Merci de préciser la quantité et le point de repère exact.' },
    authUserId,
  );

  assert.equal(result.idDemande, demandId);
  assert.equal(result.etatDemande, 'OUVERTE');
  assert.equal(report.statutSignalement, 'EN_ATTENTE_COMPLEMENT');
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.demandCreates.length, 1);
  assert.equal(getOpenDemand().demandePar, actorId);
  assert.equal(calls.events[0].typeEvenement, 'COMPLEMENT_DEMANDE');
  assert.equal(calls.events[0].idSignalementCible, reportId);
});

test('does not create a second open supplement request', async () => {
  const { service, calls } = createHarness({
    status: 'EN_ATTENTE_COMPLEMENT',
    openDemand: { idDemande: demandId },
  });

  await assert.rejects(
    service.requestSupplement(reportId, { motif: 'Merci de préciser le lieu exact.' }, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.demandCreates.length, 0);
  assert.equal(calls.reportUpdates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('accepts a report with active waste types and stores qualification rows', async () => {
  const { service, calls, report } = createHarness();

  const result = await service.acceptReport(reportId, acceptDto, authUserId);

  assert.equal(report.statutSignalement, 'QUALIFIE');
  assert.equal(calls.qualificationCreates.length, 1);
  assert.equal(calls.qualificationCreates[0].idTypeDechet, wasteTypeId);
  assert.equal(calls.qualificationCreates[0].qualifiePar, actorId);
  assert.equal(calls.qualificationCreates[0].etatQualification, 'RETENU');
  assert.equal(calls.reportUpdates[0].data.decisionPar, actorId);
  assert.equal(calls.events[0].typeEvenement, 'SIGNALEMENT_QUALIFIE');
  assert.equal(result.length, 1);
});

test('rejects qualification when a waste type is inactive or unknown', async () => {
  const { service, calls, report } = createHarness({ activeWasteTypes: [] });

  await assert.rejects(
    service.acceptReport(reportId, acceptDto, authUserId),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.qualificationCreates.length, 0);
  assert.equal(calls.reportUpdates.length, 0);
  assert.equal(report.statutSignalement, 'SOUMIS');
});

test('rejects an already non-decisionable report', async () => {
  const { service, calls, report } = createHarness({ status: 'EN_ATTENTE_COMPLEMENT' });

  await assert.rejects(
    service.acceptReport(reportId, acceptDto, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.reportUpdates.length, 0);
  assert.equal(calls.qualificationCreates.length, 0);
  assert.equal(report.statutSignalement, 'EN_ATTENTE_COMPLEMENT');
});

test('does not finalize a report while a supplement request is still open', async () => {
  const { service, calls } = createHarness({
    openDemand: { idDemande: demandId, etatDemande: 'OUVERTE' },
  });

  await assert.rejects(
    service.rejectReport(reportId, { motif: 'Informations insuffisantes pour confirmer le signalement.' }, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.reportUpdates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('rejects a report with a required reason and records the decision', async () => {
  const { service, calls, report } = createHarness();

  const result = await service.rejectReport(
    reportId,
    { motif: 'Le signalement est hors du périmètre de la plateforme.' },
    authUserId,
  );

  assert.equal(result.statutSignalement, 'REJETE');
  assert.equal(result.motifDecision, 'Le signalement est hors du périmètre de la plateforme.');
  assert.equal(report.statutSignalement, 'REJETE');
  assert.equal(calls.reportUpdates[0].data.decisionPar, actorId);
  assert.equal(calls.events[0].typeEvenement, 'SIGNALEMENT_REJETE');
  assert.equal(calls.events[0].motif, result.motifDecision);
});

test('rejects an empty decision reason before opening a transaction', async () => {
  const { service, calls } = createHarness();

  await assert.rejects(
    service.rejectReport(reportId, { motif: ' non ' }, authUserId),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.transactions.length, 0);
});

test('requires an active operator account before writes', async () => {
  const { service, calls } = createHarness({ accountState: 'SUSPENDU' });

  await assert.rejects(
    service.requestSupplement(reportId, { motif: 'Merci de préciser la quantité.' }, authUserId),
    (error) => error instanceof Error && error.message.includes('compte agent actif'),
  );
  assert.equal(calls.transactions.length, 0);
});
