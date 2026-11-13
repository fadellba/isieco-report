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
  assert.equal(result.map.truncated, true);
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
    assert.equal(where.latitude.gte, 14.6);
    assert.equal(where.latitude.lte, 14.8);
    assert.equal(where.longitude.gte, -17.6);
    assert.equal(where.longitude.lte, -17.4);
  };
  const prisma = {
    signalement: {
      count: async ({ where }) => {
        if (where.latitude?.gte !== undefined) {
          assertViewport(where);
          return 3;
        }
        return 5;
      },
      findMany: async ({ where }) => {
        assertViewport(where);
        return [];
      },
    },
    dossierTraitement: {
      count: async ({ where }) => {
        if (where.latitude?.gte !== undefined) {
          assertViewport(where);
          return 2;
        }
        return 5;
      },
      findMany: async ({ where }) => {
        assertViewport(where);
        return [];
      },
    },
    affectation: { count: async () => 1 },
    intervention: { count: async () => 1 },
  };

  const result = await new CommandCenterService(prisma).getOverview({
    limit: 100,
    minLat: 14.6,
    maxLat: 14.8,
    minLon: -17.6,
    maxLon: -17.4,
  });

  assert.equal(result.map.totalLocated, 5);
  assert.equal(result.summary.locatedItems, 10);
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


test('paginates map features with a stable cursor across dossiers and reports', async () => {
  const caseA = {
    idDossier: '11111111-1111-4111-8111-111111111111',
    referenceDossier: 'DOS-A',
    dateCreationDossier: new Date('2026-11-13T13:00:00.000Z'),
    statutDossier: 'EN_COURS',
    priorite: 'NORMALE',
    latitude: 14.7,
    longitude: -17.4,
    descriptionLocalisation: 'Point A',
    contenus: [],
  };
  const caseB = {
    ...caseA,
    idDossier: '22222222-2222-4222-8222-222222222222',
    referenceDossier: 'DOS-B',
    dateCreationDossier: new Date('2026-11-13T11:00:00.000Z'),
  };
  const report = {
    idSignalement: '33333333-3333-4333-8333-333333333333',
    dateSoumission: new Date('2026-11-13T12:00:00.000Z'),
    description: 'Signalement C',
    localisation: 'Point C',
    latitude: 14.71,
    longitude: -17.41,
    statutSignalement: 'SOUMIS',
  };
  const prisma = {
    dossierTraitement: {
      count: async ({ where }) => {
        if (where.AND) return 1;
        if (where.latitude?.not === null) return 2;
        return 2;
      },
      findMany: async ({ where, take }) => {
        assert.equal(take, 3);
        return where.AND ? [caseB] : [caseA, caseB];
      },
    },
    signalement: {
      count: async ({ where }) => {
        if (where.AND) return 0;
        if (where.latitude?.not === null) return 1;
        return 1;
      },
      findMany: async ({ where, take }) => {
        assert.equal(take, 3);
        return where.AND ? [] : [report];
      },
    },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };

  const service = new CommandCenterService(prisma);
  const firstPage = await service.getOverview({ limit: 2 });

  assert.deepEqual(firstPage.map.items.map((item) => item.title), ['DOS-A', 'Signalement C']);
  assert.equal(firstPage.map.totalLocated, 3);
  assert.equal(firstPage.map.hasMore, true);
  assert.ok(firstPage.map.nextCursor);

  const secondPage = await service.getOverview({
    limit: 2,
    cursor: firstPage.map.nextCursor,
  });

  assert.deepEqual(secondPage.map.items.map((item) => item.title), ['DOS-B']);
  assert.equal(secondPage.map.totalLocated, 3);
  assert.equal(secondPage.map.hasMore, false);
  assert.equal(secondPage.map.nextCursor, null);
});

test('rejects a cursor reused with a different viewport', async () => {
  const prisma = {
    signalement: { count: async () => 0, findMany: async () => [] },
    dossierTraitement: { count: async () => 0, findMany: async () => [] },
    affectation: { count: async () => 0 },
    intervention: { count: async () => 0 },
  };
  const service = new CommandCenterService(prisma);
  const firstPage = await service.getOverview({ limit: 1 });
  const fakeCursor = Buffer.from(JSON.stringify({
    version: 1,
    occurredAt: '2026-11-13T12:00:00.000Z',
    kind: 'DOSSIER',
    id: '11111111-1111-4111-8111-111111111111',
    viewport: null,
  })).toString('base64url');

  await assert.rejects(
    service.getOverview({
      minLat: 14,
      maxLat: 15,
      minLon: -18,
      maxLon: -17,
      cursor: fakeCursor,
    }),
    /ne correspond pas au viewport courant/,
  );
  assert.equal(firstPage.map.hasMore, false);
});
