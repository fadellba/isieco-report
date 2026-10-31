import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException } from '@nestjs/common';
import { ReferentialsService } from '../dist/modules/referentials/referentials.service.js';

const actorAuthId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const teamId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const wasteTypeId = '55555555-5555-4555-8555-555555555555';

function createHarness(options = {}) {
  const calls = { events: [], writes: [], history: [], transactions: [] };
  const actor = { idUtilisateur: actorId, etatCompte: 'ACTIF' };
  const team = options.team ?? { idEquipe: teamId, nomEquipe: 'Équipe test', etatEquipe: 'ACTIVE' };
  const user = options.user ?? { idUtilisateur: userId, etatCompte: 'ACTIF' };
  const wasteType = options.wasteType ?? {
    idTypeDechet: wasteTypeId,
    codeType: 'PLASTIQUE',
    dateDebutValidite: new Date('2026-01-01T00:00:00.000Z'),
    dateFinValidite: null,
  };
  const tx = {
    typeDechet: {
      create: async ({ data }) => {
        calls.writes.push({ table: 'typeDechet', data });
        return { idTypeDechet: wasteTypeId, ...data };
      },
      update: async ({ data }) => ({ idTypeDechet: wasteTypeId, ...wasteType, ...data }),
      updateMany: async ({ data }) => {
        calls.writes.push({ table: 'typeDechet.updateMany', data });
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ ...wasteType, dateFinValidite: new Date('2026-12-31T00:00:00.000Z') }),
    },
    equipe: {
      create: async ({ data }) => {
        calls.writes.push({ table: 'equipe', data });
        return { idEquipe: teamId, ...data };
      },
      update: async ({ data }) => ({ ...team, ...data }),
    },
    appartenanceEquipe: {
      create: async ({ data }) => {
        calls.writes.push({ table: 'appartenanceEquipe', data });
        if (options.membershipCreateError) throw options.membershipCreateError;
        return { ...data };
      },
      updateMany: async ({ data }) => {
        calls.writes.push({ table: 'appartenanceEquipe.updateMany', data });
        return { count: 1 };
      },
      findUnique: async () => options.membership ?? null,
    },
    competenceEquipe: {
      create: async ({ data }) => {
        calls.writes.push({ table: 'competenceEquipe', data });
        if (options.skillCreateError) throw options.skillCreateError;
        return { idCompetenceEquipe: '66666666-6666-4666-8666-666666666666', ...data };
      },
      findFirst: async () => options.skill ?? null,
      updateMany: async ({ data }) => {
        calls.writes.push({ table: 'competenceEquipe.updateMany', data });
        return { count: 1 };
      },
    },
    disponibiliteEquipe: {
      findUnique: async () => options.availability ?? null,
      upsert: async ({ create, update }) => {
        calls.writes.push({ table: 'disponibiliteEquipe', create, update });
        return { idEquipe: teamId, ...create, ...update };
      },
    },
    historiqueDisponibiliteEquipe: {
      create: async ({ data }) => {
        calls.history.push(data);
        return data;
      },
    },
    delegationDecisionEquipe: {
      create: async ({ data }) => {
        calls.writes.push({ table: 'delegationDecisionEquipe', data });
        return { idDelegation: '77777777-7777-4777-8777-777777777777', ...data };
      },
      findFirst: async () => options.delegation ?? null,
      updateMany: async ({ data }) => {
        calls.writes.push({ table: 'delegationDecisionEquipe.updateMany', data });
        return { count: 1 };
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
      findUnique: async ({ where }) => {
        if (where.authUserId === actorAuthId) return actor;
        if (where.idUtilisateur === userId) return user;
        return null;
      },
    },
    equipe: {
      findUnique: async () => team,
    },
    typeDechet: {
      findUnique: async () => wasteType,
    },
    appartenanceEquipe: {
      findUnique: async () => options.membership ?? null,
    },
    $transaction: async (callback) => {
      calls.transactions.push(true);
      return callback(tx);
    },
  };

  return { service: new ReferentialsService(prisma), calls, tx };
}

test('createWasteType creates a stable reference and its audit event atomically', async () => {
  const { service, calls } = createHarness();
  const result = await service.createWasteType({
    codeType: ' PLASTIQUE ',
    libelle: ' Plastique ',
    orientationSpecialisee: true,
    dateDebutValidite: '2026-01-01T00:00:00.000Z',
  }, actorAuthId);

  assert.equal(result.codeType, 'PLASTIQUE');
  assert.equal(result.libelle, 'Plastique');
  assert.equal(calls.transactions.length, 1);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].typeEvenement, 'REFERENTIEL_TYPE_DECHET_CREE');
  assert.equal(calls.events[0].idActeur, actorId);
  assert.equal(calls.events[0].idTypeDechetCible, wasteTypeId);
  assert.equal(calls.events[0].idEquipeCible, undefined);
});

test('createWasteType converts duplicate reference codes into HTTP 409 without an audit event', async () => {
  const calls = { transactions: 0, events: [] };
  const serviceWithConflict = new ReferentialsService({
    utilisateur: { findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }) },
    $transaction: async (callback) => {
      calls.transactions += 1;
      return callback({
        typeDechet: {
          create: async () => { throw Object.assign(new Error('duplicate'), { code: 'P2002' }); },
        },
        evenementMetier: {
          create: async ({ data }) => {
            calls.events.push(data);
            return data;
          },
        },
      });
    },
  });

  await assert.rejects(
    serviceWithConflict.createWasteType({
      codeType: 'PLASTIQUE',
      libelle: 'Plastique',
      orientationSpecialisee: false,
      dateDebutValidite: '2026-01-01T00:00:00.000Z',
    }, actorAuthId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.transactions, 1);
  assert.equal(calls.events.length, 0);
});

test('addMembership checks that the member is active and writes a team audit event', async () => {
  const { service, calls } = createHarness();
  const start = new Date(Date.now() + 60_000).toISOString();
  const result = await service.addMembership(teamId, {
    idUtilisateur: userId,
    dateDebut: start,
    fonction: 'Agent terrain',
  }, actorAuthId);

  assert.equal(result.idEquipe, teamId);
  assert.equal(result.idUtilisateur, userId);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].typeEvenement, 'EQUIPE_MEMBRE_AJOUTE');
  assert.equal(calls.events[0].idEquipeCible, teamId);
  assert.equal(calls.events[0].donneesApres.utilisateurId, userId);
});

test('addMembership reports concurrent active membership as HTTP 409', async () => {
  const service = new ReferentialsService({
    utilisateur: {
      findUnique: async ({ where }) => where.authUserId
        ? { idUtilisateur: actorId, etatCompte: 'ACTIF' }
        : { idUtilisateur: userId, etatCompte: 'ACTIF' },
    },
    equipe: { findUnique: async () => ({ idEquipe: teamId }) },
    $transaction: async (callback) => callback({
      appartenanceEquipe: {
        create: async () => { throw Object.assign(new Error('duplicate'), { code: 'P2002' }); },
      },
    }),
  });

  await assert.rejects(
    service.addMembership(teamId, {
      idUtilisateur: userId,
      dateDebut: '2026-11-01T00:00:00.000Z',
      fonction: 'Agent terrain',
    }, actorAuthId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
});

test('addSkill rejects a start outside the waste type validity period', async () => {
  const { service, calls } = createHarness({
    wasteType: {
      idTypeDechet: wasteTypeId,
      codeType: 'PLASTIQUE',
      dateDebutValidite: new Date('2026-01-01T00:00:00.000Z'),
      dateFinValidite: new Date('2026-09-30T00:00:00.000Z'),
    },
  });

  await assert.rejects(
    service.addSkill(teamId, {
      idTypeDechet: wasteTypeId,
      dateDebut: '2026-10-01T00:00:00.000Z',
    }, actorAuthId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(calls.writes.length, 0);
  assert.equal(calls.events.length, 0);
});

test('setAvailability updates current state, history and audit in one transaction', async () => {
  const previous = {
    etatDisponibilite: 'DISPONIBLE',
    dateMiseAJour: new Date('2026-10-01T00:00:00.000Z'),
    valideJusqua: new Date('2026-10-31T00:00:00.000Z'),
  };
  const { service, calls } = createHarness({ availability: previous });
  const validity = new Date(Date.now() + 86_400_000).toISOString();
  const result = await service.setAvailability(teamId, {
    etatDisponibilite: 'INDISPONIBLE',
    valideJusqua: validity,
    commentaire: 'Maintenance programmée',
  }, actorAuthId);

  assert.equal(result.etatDisponibilite, 'INDISPONIBLE');
  assert.equal(calls.transactions.length, 1);
  assert.equal(calls.history.length, 1);
  assert.equal(calls.history[0].miseAJourPar, actorId);
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].typeEvenement, 'DISPONIBILITE_EQUIPE_MODIFIEE');
  assert.equal(calls.events[0].donneesAvant.etatDisponibilite, 'DISPONIBLE');
  assert.equal(calls.events[0].donneesApres.etatDisponibilite, 'INDISPONIBLE');
});

test('createDelegation refuses to extend beyond the delegate membership period', async () => {
  const member = {
    idUtilisateur: userId,
    idEquipe: teamId,
    dateDebut: new Date('2026-01-01T00:00:00.000Z'),
    dateFin: new Date('2026-11-05T00:00:00.000Z'),
    fonction: 'Agent terrain',
  };
  let delegationCreates = 0;
  const service = new ReferentialsService({
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }),
    },
    equipe: { findUnique: async () => ({ idEquipe: teamId }) },
    appartenanceEquipe: { findUnique: async () => member },
    $transaction: async (callback) => callback({
      delegationDecisionEquipe: {
        create: async () => { delegationCreates += 1; },
      },
      evenementMetier: { create: async () => ({}) },
    }),
  });

  await assert.rejects(
    service.createDelegation(teamId, {
      idUtilisateurDelegue: userId,
      dateDebutAppartenance: member.dateDebut.toISOString(),
      typeDecision: 'AFFECTATION',
      dateDebut: '2026-11-01T00:00:00.000Z',
      dateFin: '2026-11-10T00:00:00.000Z',
    }, actorAuthId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(delegationCreates, 0);
});


test('createRegion writes an audit event with the region foreign-key target', async () => {
  const regionId = '88888888-8888-4888-8888-888888888888';
  const calls = { events: [], writes: [] };
  const service = new ReferentialsService({
    utilisateur: {
      findUnique: async () => ({ idUtilisateur: actorId, etatCompte: 'ACTIF' }),
    },
    $transaction: async (callback) => callback({
      region: {
        create: async ({ data }) => {
          calls.writes.push(data);
          return { idRegion: regionId, ...data };
        },
      },
      evenementMetier: {
        create: async ({ data }) => {
          calls.events.push(data);
          return data;
        },
      },
    }),
  });

  const region = await service.createRegion({
    codeRegion: 'DK',
    nomRegion: 'Dakar',
    actif: true,
  }, actorAuthId);

  assert.equal(region.idRegion, regionId);
  assert.equal(calls.writes[0].codeRegion, 'DK');
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].typeEvenement, 'REFERENTIEL_REGION_CREE');
  assert.equal(calls.events[0].idRegionCible, regionId);
  assert.equal(calls.events[0].idEquipeCible, undefined);
});

test('createDelegation refuses a beneficiary whose account is inactive', async () => {
  const membership = {
    idUtilisateur: userId,
    idEquipe: teamId,
    dateDebut: new Date('2026-01-01T00:00:00.000Z'),
    dateFin: null,
    fonction: 'Agent terrain',
  };
  let creates = 0;
  const service = new ReferentialsService({
    utilisateur: {
      findUnique: async ({ where }) => {
        if (where.authUserId) return { idUtilisateur: actorId, etatCompte: 'ACTIF' };
        return { idUtilisateur: userId, etatCompte: 'SUSPENDU' };
      },
    },
    equipe: { findUnique: async () => ({ idEquipe: teamId }) },
    appartenanceEquipe: { findUnique: async () => membership },
    $transaction: async (callback) => callback({
      delegationDecisionEquipe: {
        create: async () => { creates += 1; },
      },
      evenementMetier: { create: async () => ({}) },
    }),
  });

  await assert.rejects(
    service.createDelegation(teamId, {
      idUtilisateurDelegue: userId,
      dateDebutAppartenance: membership.dateDebut.toISOString(),
      typeDecision: 'AFFECTATION',
      dateDebut: '2026-11-01T00:00:00.000Z',
    }, actorAuthId),
    (error) => error instanceof ConflictException && error.getStatus() === 409,
  );
  assert.equal(creates, 0);
});

test('listTeams returns current delegations with the delegated member identity', async () => {
  let query;
  const service = new ReferentialsService({
    equipe: {
      findMany: async (args) => {
        query = args;
        return [{
          idEquipe: teamId,
          nomEquipe: 'Équipe test',
          delegations: [{
            idDelegation: '77777777-7777-4777-8777-777777777777',
            idUtilisateurDelegue: userId,
            delegue: { idUtilisateur: userId, nom: 'Ba', prenom: 'Awa', email: 'awa@example.test' },
          }],
        }];
      },
    },
  });

  const result = await service.listTeams();
  assert.equal(result[0].delegations[0].idUtilisateurDelegue, userId);
  assert.equal(result[0].delegations[0].delegue.prenom, 'Awa');
  assert.ok(query.include.delegations.where.dateDebut.lte instanceof Date);
  assert.deepEqual(query.include.delegations.where.OR[0], { dateFin: null });
  assert.ok(query.include.delegations.include.delegue.select.email);
});
