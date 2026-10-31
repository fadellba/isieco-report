import assert from 'node:assert/strict';
import { BadRequestException, ConflictException } from '@nestjs/common';
import test from 'node:test';
import { CasesService } from '../dist/modules/cases/cases.service.js';

const authUserId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const caseId = '44444444-4444-4444-8444-444444444444';
const communeId = '55555555-5555-4555-8555-555555555555';
const wasteTypeId = '66666666-6666-4666-8666-666666666666';
const qualificationId = '77777777-7777-4777-8777-777777777777';
const attachmentId = '88888888-8888-4888-8888-888888888888';

function createHarness(options = {}) {
  const calls = {
    transactions: [],
    dossierCreates: [],
    attachmentCreates: [],
    contentCreates: [],
    provenanceCreates: [],
    attachmentUpdates: [],
    provenanceUpdates: [],
    contentUpdates: [],
    priorityHistory: [],
    locationHistory: [],
    events: [],
    communeReads: [],
    reportReads: [],
    qualificationReads: [],
  };
  const report = {
    idSignalement: reportId,
    statutSignalement: options.reportStatus ?? 'QUALIFIE',
    description: 'Déchets déposés près du marché.',
    dateDecision: new Date('2026-10-20T10:00:00.000Z'),
    idCommune: options.reportCommuneId ?? null,
    latitude: null,
    longitude: null,
    precisionLocalisation: null,
    descriptionLocalisation: 'À proximité du marché.',
  };
  const caseRow = options.caseRow ?? {
    idDossier: caseId,
    statutDossier: options.caseStatus ?? 'OUVERT',
    priorite: options.priority ?? 'NORMALE',
    idCommune: null,
    latitude: null,
    longitude: null,
    precisionLocalisation: null,
    descriptionLocalisation: null,
  };
  const qualifications = options.qualifications ?? [{
    idQualification: qualificationId,
    idSignalement: reportId,
    idTypeDechet: wasteTypeId,
    quantiteEstimee: '2.000',
    uniteQuantite: 'kg',
    quantiteEstimeeLegacy: null,
    volumeEstime: '1.500',
    remarque: 'Quantité confirmée.',
    qualifiePar: actorId,
    dateQualification: new Date('2026-10-20T10:00:00.000Z'),
  }];
  const activeProvenances = options.activeProvenances ?? [{ idTypeDechet: wasteTypeId }];

  const tx = {
    signalement: {
      findUnique: async (args) => {
        calls.reportReads.push(args);
        return options.reportMissing ? null : report;
      },
    },
    qualificationSignalement: {
      findMany: async (args) => {
        calls.qualificationReads.push(args);
        return qualifications;
      },
    },
    typeDechet: {
      findMany: async () => options.activeTypes ?? [{ idTypeDechet: wasteTypeId }],
    },
    commune: {
      findFirst: async (args) => {
        calls.communeReads.push(args);
        return options.communeActive === false ? null : { idCommune: communeId };
      },
    },
    dossierTraitement: {
      create: async ({ data, select }) => {
        calls.dossierCreates.push(data);
        return { idDossier: caseId };
      },
      findUnique: async () => options.caseMissing ? null : caseRow,
      findUniqueOrThrow: async () => ({
        idDossier: caseId,
        referenceDossier: 'DOS-20261031-TEST1234',
        descriptionSynthese: 'Dossier de test',
        statutDossier: 'OUVERT',
        priorite: 'NORMALE',
        contenus: [],
        rattachements: [],
      }),
      updateMany: async (args) => {
        calls.dossierUpdates ??= [];
        calls.dossierUpdates.push(args);
        return { count: options.dossierUpdateCount ?? 1 };
      },
    },
    rattachementSignalement: {
      findFirst: async ({ where }) => {
        if (where.idDossier) {
          return options.detachAttachment === false
            ? null
            : options.detachAttachment ?? { idRattachement: attachmentId };
        }
        return options.linkedAttachment ?? null;
      },
      create: async ({ data }) => {
        calls.attachmentCreates.push(data);
        return { idRattachement: attachmentId };
      },
      updateMany: async (args) => {
        calls.attachmentUpdates.push(args);
        return { count: options.attachmentUpdateCount ?? 1 };
      },
    },
    contenuDossier: {
      createMany: async ({ data }) => {
        calls.contentCreates.push(...data);
        return { count: data.length };
      },
      findMany: async () => options.existingContent ?? [],
      updateMany: async (args) => {
        calls.contentUpdates.push(args);
        return { count: 1 };
      },
    },
    provenanceContenuDossier: {
      createMany: async ({ data }) => {
        calls.provenanceCreates.push(...data);
        return { count: data.length };
      },
      findMany: async () => activeProvenances,
      updateMany: async (args) => {
        calls.provenanceUpdates.push(args);
        return { count: activeProvenances.length };
      },
      count: async () => options.remainingProvenanceCount ?? 0,
    },
    historiquePrioriteDossier: {
      create: async ({ data }) => {
        calls.priorityHistory.push(data);
        return data;
      },
    },
    historiqueLocalisationDossier: {
      create: async ({ data }) => {
        calls.locationHistory.push(data);
        return data;
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
    dossierTraitement: {
      count: async () => 1,
      findMany: async () => [],
      findUnique: async () => options.caseMissing ? null : caseRow,
    },
    evenementMetier: {
      findMany: async () => [],
    },
    $transaction: async (operation, transactionOptions) => {
      calls.transactions.push(transactionOptions);
      if (options.transactionError) throw options.transactionError;
      if (Array.isArray(operation)) return Promise.all(operation);
      return operation(tx);
    },
  };

  return { service: new CasesService(prisma), calls, report, caseRow };
}

test('creates a treatment case, initial attachment, content and provenance atomically', async () => {
  const { service, calls } = createHarness();

  const result = await service.createFromReport(reportId, {}, authUserId);

  assert.equal(result.idDossier, caseId);
  assert.equal(calls.transactions[0].isolationLevel, 'Serializable');
  assert.equal(calls.dossierCreates.length, 1);
  assert.equal(calls.dossierCreates[0].statutDossier, 'OUVERT');
  assert.equal(calls.dossierCreates[0].priorite, 'NORMALE');
  assert.equal(calls.attachmentCreates[0].typeRattachement, 'INITIAL');
  assert.equal(calls.contentCreates.length, 1);
  assert.equal(calls.contentCreates[0].origineAjout, 'QUALIFICATION');
  assert.equal(calls.provenanceCreates[0].idQualification, qualificationId);
  assert.equal(calls.provenanceCreates[0].idRattachement, attachmentId);
  assert.deepEqual(calls.events.map((event) => event.typeEvenement), [
    'DOSSIER_CREE',
    'SIGNALEMENT_RATTACHE_DOSSIER',
  ]);
});

test('refuses to create a case from a report that is not qualified', async () => {
  const { service, calls } = createHarness({ reportStatus: 'SOUMIS' });

  await assert.rejects(
    service.createFromReport(reportId, {}, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.dossierCreates.length, 0);
  assert.equal(calls.attachmentCreates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('returns an existing active case attachment instead of creating a duplicate dossier', async () => {
  const linked = { idRattachement: attachmentId, dossier: { idDossier: caseId } };
  const { service, calls } = createHarness({ linkedAttachment: linked });

  const result = await service.createFromReport(reportId, {}, authUserId);

  assert.equal(result.idDossier, caseId);
  assert.equal(calls.dossierCreates.length, 0);
  assert.equal(calls.attachmentCreates.length, 0);
});

test('rejects a report already attached to another case', async () => {
  const { service, calls } = createHarness({
    linkedAttachment: { idRattachement: attachmentId, idDossier: '99999999-9999-4999-8999-999999999999' },
  });

  await assert.rejects(
    service.attachReport(caseId, reportId, {}, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.attachmentCreates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('rejects attaching a report when a waste category already exists in the case', async () => {
  const { service, calls } = createHarness({ existingContent: [{ idTypeDechet: wasteTypeId }] });

  await assert.rejects(
    service.attachReport(caseId, reportId, {}, authUserId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.attachmentCreates.length, 0);
  assert.equal(calls.contentCreates.length, 0);
  assert.equal(calls.events.length, 0);
});

test('detaches a report by closing its attachment and provenance and retiring orphan content', async () => {
  const { service, calls } = createHarness();

  const result = await service.detachReport(
    caseId,
    reportId,
    { motif: 'Le signalement a été rattaché au mauvais dossier.' },
    authUserId,
  );

  assert.equal(result.idDossier, caseId);
  assert.equal(calls.attachmentUpdates[0].where.dateFinRattachement, null);
  assert.equal(calls.provenanceUpdates[0].where.dateFin, null);
  assert.equal(calls.contentUpdates[0].data.etatContenuDossier, 'RETIRE');
  assert.equal(calls.contentUpdates[0].data.retirePar, actorId);
  assert.equal(calls.events[0].typeEvenement, 'SIGNALEMENT_DETACHE_DOSSIER');
});

test('keeps case content active when another active provenance still exists', async () => {
  const { service, calls } = createHarness({ remainingProvenanceCount: 1 });

  await service.detachReport(
    caseId,
    reportId,
    { motif: 'Détachement administratif du signalement.' },
    authUserId,
  );

  assert.equal(calls.contentUpdates.length, 0);
  assert.equal(calls.provenanceUpdates.length, 1);
});

test('updates case priority with history and an audit event in the same transaction', async () => {
  const { service, calls } = createHarness();

  await service.updatePriority(
    caseId,
    { priorite: 'HAUTE', justification: 'Risque environnemental accru.' },
    authUserId,
  );

  assert.equal(calls.dossierUpdates[0].data.priorite, 'HAUTE');
  assert.equal(calls.priorityHistory[0].priorite, 'HAUTE');
  assert.equal(calls.priorityHistory[0].definiePar, actorId);
  assert.equal(calls.events[0].typeEvenement, 'DOSSIER_PRIORITE_MODIFIEE');
  assert.equal(calls.events[0].donneesAvant.priorite, 'NORMALE');
  assert.equal(calls.events[0].donneesApres.priorite, 'HAUTE');
});

test('does not change the priority of a closed case', async () => {
  const { service, calls } = createHarness({ caseStatus: 'CLOTURE' });

  await assert.rejects(
    service.updatePriority(
      caseId,
      { priorite: 'CRITIQUE', justification: 'Risque important et immédiat.' },
      authUserId,
    ),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.dossierUpdates?.length ?? 0, 0);
  assert.equal(calls.priorityHistory.length, 0);
});

test('updates the case location with history and an audit event', async () => {
  const { service, calls } = createHarness();

  await service.updateLocation(
    caseId,
    {
      idCommune: communeId,
      latitude: 14.7167,
      longitude: -17.4677,
      precisionLocalisation: 25,
      descriptionLocalisation: 'Derrière le marché.',
      motif: 'Correction des coordonnées sur le terrain.',
    },
    authUserId,
  );

  assert.equal(calls.dossierUpdates[0].data.idCommune, communeId);
  assert.equal(calls.locationHistory[0].modifiePar, actorId);
  assert.equal(calls.locationHistory[0].motif, 'Correction des coordonnées sur le terrain.');
  assert.equal(calls.events[0].typeEvenement, 'DOSSIER_LOCALISATION_MODIFIEE');
});

test('rejects an inactive commune before modifying the case location', async () => {
  const { service, calls } = createHarness({ communeActive: false });

  await assert.rejects(
    service.updateLocation(
      caseId,
      {
        idCommune: communeId,
        latitude: 14.7167,
        longitude: -17.4677,
        motif: 'Correction des coordonnées du dossier.',
      },
      authUserId,
    ),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(calls.dossierUpdates?.length ?? 0, 0);
  assert.equal(calls.locationHistory.length, 0);
});

test('maps serializable transaction conflicts to HTTP 409 for case writes', async () => {
  const { service } = createHarness({
    transactionError: Object.assign(new Error('serialization failure'), { code: 'P2034' }),
  });

  await assert.rejects(
    service.updatePriority(
      caseId,
      { priorite: 'HAUTE', justification: 'Risque environnemental accru.' },
      authUserId,
    ),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
});
