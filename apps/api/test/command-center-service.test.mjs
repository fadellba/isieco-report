import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CommandCenterQueryDto } from '../dist/modules/command-center/dto/command-center-query.dto.js';
import { CommandCenterService } from '../dist/modules/command-center/command-center.service.js';

test('returns operational counts and only real, geolocated active entities', async () => {
  const dossier = {
    idDossier: '11111111-1111-4111-8111-111111111111',
    referenceDossier: 'DOS-20261113-ABCD1234',
    descriptionSynthese: 'Dépôt de déchets',
    dateCreationDossier: new Date('2026-11-13T08:00:00Z'),
    statutDossier: 'EN_COURS',
    priorite: 'HAUTE',
    latitude: { toString: () => '14.716700' },
    longitude: { toString: () => '-17.467700' },
    descriptionLocalisation: 'Près du marché',
    contenus: [{
      typeDechet: { libelle: 'Plastique' },
      affectations: [{
        equipe: { nomEquipe: 'Équipe Nord' },
        interventions: [{ idIntervention: '22222222-2222-4222-8222-222222222222' }],
      }],
    }],
  };
  const report = {
    idSignalement: '33333333-3333-4333-8333-333333333333',
    dateSoumission: new Date('2026-11-12T10:00:00Z'),
    description: null,
    localisation: 'Rue du marché',
    latitude: { toString: () => '14.700000' },
    longitude: { toString: () => '-17.450000' },
    statutSignalement: 'SOUMIS',
  };
  const count = (model) => async () => ({
    signalement: 2,
    dossierTraitement: 3,
    affectation: 4,
    intervention: 5,
  }[model]);
  const prisma = {
    signalement: {
      count: count('signalement'),
      findMany: async ({ where, take }) => {
        assert.equal(where.idDossier, null);
        assert.equal(take, 101);
        return [report];
      },
    },
    dossierTraitement: {
      count: count('dossierTraitement'),
      findMany: async ({ where, take }) => {
        assert.equal(where.latitude.not, null);
        assert.equal(take, 101);
        return [dossier];
      },
    },
    affectation: { count: count('affectation') },
    intervention: { count: count('intervention') },
  };

  const service = new CommandCenterService(prisma);
  const result = await service.getOverview({ limit: 100 });

  assert.equal(result.summary.reportsAwaitingQualification, 2);
  assert.equal(result.summary.reportsAwaitingCitizen, 2);
  assert.equal(result.summary.openCases, 3);
  assert.equal(result.summary.urgentCases, 3);
  assert.equal(result.summary.activeAssignments, 4);
  assert.equal(result.summary.activeInterventions, 5);
  assert.equal(result.summary.pendingVerifications, 5);
  assert.equal(result.summary.locatedItems, 5);
  assert.equal(result.map.items.length, 2);
  assert.equal(result.map.items[0].kind, 'DOSSIER');
  assert.deepEqual(result.map.items[0].teamNames, ['Équipe Nord']);
  assert.equal(result.map.items[0].activeInterventions, 1);
  assert.equal(result.map.items[1].title, 'Signalement non qualifié');
  assert.equal(result.map.truncated, false);
});

test('caps map retrieval and keeps the response within the requested item limit', async () => {
  const prisma = {
    signalement: { count: async () => 0, findMany: async () => [] },
    dossierTraitement: { count: async () => 0, findMany: async () => [] },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };
  const result = await new CommandCenterService(prisma).getOverview({ limit: 999 });
  assert.equal(result.map.limit, 250);
  assert.equal(result.map.items.length, 0);
  assert.equal(result.map.truncated, false);
});


test('filters map counts and features by a validated geographic viewport', async () => {
  const assertViewport = (where) => {
    const filters = where.AND ?? [where];
    const viewport = filters.find((filter) => filter.latitude?.gte !== undefined);
    assert.ok(viewport, 'viewport filter must be part of the database predicate');
    assert.equal(viewport.latitude.gte, 14.6);
    assert.equal(viewport.latitude.lte, 14.8);
    assert.equal(viewport.longitude.gte, -17.6);
    assert.equal(viewport.longitude.lte, -17.4);
  };
  const hasViewport = (where) =>
    (where.AND ?? [where]).some((filter) => filter.latitude?.gte !== undefined);
  const dossier = {
    idDossier: '11111111-1111-4111-8111-111111111111',
    referenceDossier: 'DOS-VIEWPORT-1',
    descriptionSynthese: null,
    dateCreationDossier: new Date('2026-11-13T12:00:00.000Z'),
    statutDossier: 'OUVERT',
    priorite: 'NORMALE',
    latitude: { toString: () => '14.7' },
    longitude: { toString: () => '-17.4' },
    descriptionLocalisation: null,
    contenus: [],
  };
  const report = {
    idSignalement: '22222222-2222-4222-8222-222222222222',
    dateSoumission: new Date('2026-11-13T11:00:00.000Z'),
    description: 'Signalement viewport',
    localisation: null,
    latitude: { toString: () => '14.7' },
    longitude: { toString: () => '-17.4' },
    statutSignalement: 'SOUMIS',
  };
  const prisma = {
    signalement: {
      count: async ({ where }) => {
        if (hasViewport(where)) {
          assertViewport(where);
          return 3;
        }
        return 5;
      },
      findMany: async ({ where, take }) => {
        assertViewport(where);
        assert.equal(take, 2);
        return [report];
      },
    },
    dossierTraitement: {
      count: async ({ where }) => {
        if (hasViewport(where)) {
          assertViewport(where);
          return 2;
        }
        return 5;
      },
      findMany: async ({ where, take }) => {
        assertViewport(where);
        assert.equal(take, 2);
        return [dossier];
      },
    },
    affectation: { count: async () => 1 },
    intervention: { count: async () => 1 },
  };

  const result = await new CommandCenterService(prisma).getOverview({
    limit: 1,
    minLat: 14.6,
    maxLat: 14.8,
    minLon: -17.6,
    maxLon: -17.4,
  });

  assert.equal(result.map.totalLocated, 5);
  assert.equal(result.summary.locatedItems, 10);
  assert.equal(result.map.items.length, 1);
  assert.equal(result.map.hasMore, true);
  assert.equal(result.map.truncated, true);
});

test('rejects partial or inverted geographic viewports', async () => {
  const prisma = {
    signalement: { count: async () => 0, findMany: async () => [] },
    dossierTraitement: { count: async () => 0, findMany: async () => [] },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };
  const service = new CommandCenterService(prisma);

  await assert.rejects(
    service.getOverview({ minLat: 14 }),
    /quatre bornes du viewport/,
  );
  await assert.rejects(
    service.getOverview({ minLat: 15, maxLat: 14, minLon: -18, maxLon: -17 }),
    /latitude minimale/,
  );
});


test('rejects blank viewport coordinates instead of coercing them to zero', async () => {
  const query = plainToInstance(CommandCenterQueryDto, {
    minLat: '',
    maxLat: '',
    minLon: '',
    maxLon: '',
  });
  const errors = await validate(query);
  assert.ok(errors.some((error) => ['minLat', 'maxLat', 'minLon', 'maxLon'].includes(error.property)));
  assert.ok(Number.isNaN(query.minLat));
  assert.ok(Number.isNaN(query.maxLat));
  assert.ok(Number.isNaN(query.minLon));
  assert.ok(Number.isNaN(query.maxLon));
});

test('parses valid viewport coordinates without accepting empty strings', async () => {
  const query = plainToInstance(CommandCenterQueryDto, {
    minLat: '14.6',
    maxLat: '14.8',
    minLon: '-17.6',
    maxLon: '-17.4',
  });
  const errors = await validate(query);
  assert.equal(errors.length, 0);
  assert.equal(query.minLat, 14.6);
  assert.equal(query.maxLat, 14.8);
  assert.equal(query.minLon, -17.6);
  assert.equal(query.maxLon, -17.4);
});


test('paginates the combined dossier and report stream with a stable keyset cursor', async () => {
  const dossierId = '11111111-1111-4111-8111-111111111111';
  const reportId = '22222222-2222-4222-8222-222222222222';
  const dossier = {
    idDossier: dossierId,
    referenceDossier: 'DOS-CURSOR-1',
    descriptionSynthese: null,
    dateCreationDossier: new Date('2026-11-13T12:00:00.000Z'),
    statutDossier: 'OUVERT',
    priorite: 'NORMALE',
    latitude: { toString: () => '14.7' },
    longitude: { toString: () => '-17.4' },
    descriptionLocalisation: null,
    contenus: [],
  };
  const report = {
    idSignalement: reportId,
    dateSoumission: new Date('2026-11-13T12:00:00.000Z'),
    description: 'Signalement',
    localisation: null,
    latitude: { toString: () => '14.7' },
    longitude: { toString: () => '-17.4' },
    statutSignalement: 'SOUMIS',
  };
  const caseFindQueries = [];
  const reportFindQueries = [];
  const caseCountQueries = [];
  const reportCountQueries = [];
  const prisma = {
    signalement: {
      count: async ({ where }) => {
        reportCountQueries.push(where);
        return 1;
      },
      findMany: async (query) => {
        reportFindQueries.push(query);
        return [report];
      },
    },
    dossierTraitement: {
      count: async ({ where }) => {
        caseCountQueries.push(where);
        return 1;
      },
      findMany: async (query) => {
        caseFindQueries.push(query);
        const cursorFilter = query.where.AND?.find((filter) =>
          filter.OR?.some((part) => part.dateCreationDossier?.lt),
        );
        return cursorFilter ? [] : [dossier];
      },
    },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };

  const firstPage = await new CommandCenterService(prisma).getOverview({ limit: 1 });
  assert.equal(firstPage.map.items.length, 1);
  assert.equal(firstPage.map.items[0].kind, 'DOSSIER');
  assert.equal(firstPage.map.hasMore, true);
  assert.equal(firstPage.map.truncated, true);
  assert.ok(firstPage.map.nextCursor);
  assert.equal(caseFindQueries[0].take, 2);
  assert.equal(reportFindQueries[0].take, 2);

  const secondPage = await new CommandCenterService(prisma).getOverview({
    limit: 1,
    cursor: firstPage.map.nextCursor,
  });
  assert.equal(secondPage.map.totalLocated, 2);
  assert.equal(secondPage.map.items.length, 1);
  assert.equal(secondPage.map.items[0].kind, 'SIGNALEMENT');
  assert.equal(secondPage.map.hasMore, false);
  assert.equal(secondPage.map.nextCursor, null);
  assert.ok(caseFindQueries[1].where.AND.some((filter) => filter.OR?.some((part) => part.dateCreationDossier?.lt)));
  assert.ok(reportFindQueries[1].where.AND.some((filter) => filter.OR?.some((part) => part.dateSoumission?.lte)));
  const mapCaseCounts = caseCountQueries.filter((where) => where.latitude?.not === null);
  const mapReportCounts = reportCountQueries.filter((where) => where.latitude?.not === null);
  assert.equal(mapCaseCounts.length, 4);
  assert.equal(mapReportCounts.length, 4);
  assert.ok(mapCaseCounts.every((where) => !where.AND?.some((filter) => filter.OR?.some((part) => part.dateCreationDossier?.lt))));
  assert.ok(mapReportCounts.every((where) => !where.AND?.some((filter) => filter.OR?.some((part) => part.dateSoumission?.lte))));
});

test('rejects malformed or non-canonical map cursors', async () => {
  const prisma = {
    signalement: { count: async () => 0, findMany: async () => [] },
    dossierTraitement: { count: async () => 0, findMany: async () => [] },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };
  const service = new CommandCenterService(prisma);
  await assert.rejects(service.getOverview({ cursor: 'not-a-valid-cursor' }), /curseur cartographique est invalide/);
});


test('rejects a pagination cursor reused with a different viewport', async () => {
  const report = (id, time) => ({
    idSignalement: id,
    dateSoumission: new Date(time),
    description: 'Signalement',
    localisation: null,
    latitude: { toString: () => '14.7' },
    longitude: { toString: () => '-17.4' },
    statutSignalement: 'SOUMIS',
  });
  const prisma = {
    signalement: {
      count: async () => 2,
      findMany: async () => [
        report('33333333-3333-4333-8333-333333333333', '2026-11-13T10:00:00.000Z'),
        report('44444444-4444-4444-8444-444444444444', '2026-11-13T09:00:00.000Z'),
      ],
    },
    dossierTraitement: { count: async () => 0, findMany: async () => [] },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };

  const service = new CommandCenterService(prisma);
  const firstPage = await service.getOverview({
    limit: 1,
    minLat: 14.6,
    maxLat: 14.8,
    minLon: -17.6,
    maxLon: -17.4,
  });

  assert.equal(firstPage.map.items.length, 1);
  assert.equal(firstPage.map.hasMore, true);
  assert.ok(firstPage.map.nextCursor);
  await assert.rejects(
    service.getOverview({
      limit: 1,
      cursor: firstPage.map.nextCursor,
      minLat: 14.5,
      maxLat: 14.8,
      minLon: -17.6,
      maxLon: -17.4,
    }),
    /ne correspond pas au viewport courant/,
  );
});


test('paginates null-dated reports after dated dossiers without losing the rows', async () => {
  const dossier = {
    idDossier: '33333333-3333-4333-8333-333333333333',
    referenceDossier: 'DOS-NULL-DATE',
    descriptionSynthese: null,
    dateCreationDossier: new Date('2026-11-13T12:00:00.000Z'),
    statutDossier: 'OUVERT',
    priorite: 'NORMALE',
    latitude: { toString: () => '14.7' },
    longitude: { toString: () => '-17.4' },
    descriptionLocalisation: null,
    contenus: [],
  };
  const report = {
    idSignalement: '44444444-4444-4444-8444-444444444444',
    dateSoumission: null,
    description: 'Sans date renseignée',
    localisation: null,
    latitude: { toString: () => '14.7' },
    longitude: { toString: () => '-17.4' },
    statutSignalement: 'SOUMIS',
  };
  let reportPageQuery;
  const prisma = {
    signalement: {
      count: async () => 1,
      findMany: async (query) => {
        reportPageQuery = query;
        return [report];
      },
    },
    dossierTraitement: {
      count: async () => 1,
      findMany: async ({ where }) =>
        where.AND?.some((filter) => filter.OR?.some((part) => part.dateCreationDossier?.lt))
          ? []
          : [dossier],
    },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };

  const firstPage = await new CommandCenterService(prisma).getOverview({ limit: 1 });
  assert.equal(firstPage.map.items[0].kind, 'DOSSIER');
  assert.equal(firstPage.map.hasMore, true);
  const secondPage = await new CommandCenterService(prisma).getOverview({
    limit: 1,
    cursor: firstPage.map.nextCursor,
  });
  assert.equal(secondPage.map.totalLocated, 2);
  assert.equal(secondPage.map.items.length, 1);
  assert.equal(secondPage.map.items[0].kind, 'SIGNALEMENT');
  assert.equal(secondPage.map.items[0].occurredAt, null);
  assert.ok(reportPageQuery.where.AND.some((filter) => filter.OR?.some((part) => part.dateSoumission === null)));
  assert.equal(reportPageQuery.orderBy[0].dateSoumission.nulls, 'last');
});
