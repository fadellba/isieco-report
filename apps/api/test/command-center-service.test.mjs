import assert from 'node:assert/strict';
import test from 'node:test';
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
        assert.equal(take, 100);
        return [report];
      },
    },
    dossierTraitement: {
      count: count('dossierTraitement'),
      findMany: async ({ where, take }) => {
        assert.equal(where.latitude.not, null);
        assert.equal(take, 100);
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
