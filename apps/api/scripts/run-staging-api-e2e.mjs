import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../dist/database/prisma.service.js';
import { MediaPurgeService } from '../dist/infrastructure/storage/media-purge.service.js';
import { StorageMaintenanceModule } from '../dist/infrastructure/storage/storage-maintenance.module.js';

const PROJECT_REF = 'mlhbdautaxufubaybzyt';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://' + PROJECT_REF + '.supabase.co';
const API_BASE_URL = process.env.STAGING_API_BASE_URL || 'https://isieco-api-staging.onrender.com/api/v1';
const PASSWORD_SEED = process.env.STAGING_E2E_PASSWORD_SEED || '';
const PUBLIC_KEY = process.env.STAGING_SUPABASE_ANON_KEY || '';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || '';
const MEDIA_RETENTION_DAYS = Number(process.env.MEDIA_RETENTION_DAYS || '0');
const REPORT_IMAGE_FIXTURE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6ZkAAAAASUVORK5CYII=',
  'base64',
);
const RUN_ID = process.env.GITHUB_RUN_ID || ('manual-' + Date.now());
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT || '1';

const accounts = [
  { key: 'CITOYEN', email: 'e2e.citoyen@staging.isieco.test', role: 'CITOYEN' },
  { key: 'CITOYEN_SECONDARY', email: 'e2e.citoyen-secondaire@staging.isieco.test', role: 'CITOYEN' },
  { key: 'AGENT_QUALIFICATION', email: 'e2e.agent-qualification@staging.isieco.test', role: 'AGENT_QUALIFICATION' },
  { key: 'RESPONSABLE_TRAITEMENT', email: 'e2e.responsable-traitement@staging.isieco.test', role: 'RESPONSABLE_TRAITEMENT' },
  { key: 'RESPONSABLE_AFFECTATION', email: 'e2e.responsable-affectation@staging.isieco.test', role: 'RESPONSABLE_AFFECTATION' },
  { key: 'AGENT_TERRAIN', email: 'e2e.agent-terrain@staging.isieco.test', role: 'AGENT_TERRAIN' },
  { key: 'VERIFICATEUR_CLOTURE', email: 'e2e.verificateur-cloture@staging.isieco.test', role: 'VERIFICATEUR_CLOTURE' },
  { key: 'GESTIONNAIRE_REFERENTIEL', email: 'e2e.gestionnaire-referentiel@staging.isieco.test', role: 'GESTIONNAIRE_REFERENTIEL' },
  { key: 'ADMINISTRATEUR_COMPTES', email: 'e2e.administrateur-comptes@staging.isieco.test', role: 'ADMINISTRATEUR_COMPTES' },
];

const protectedReadRoutes = [
  { path: '/reports', role: 'CITOYEN' },
  { path: '/qualification/queue', role: 'AGENT_QUALIFICATION' },
  { path: '/cases/qualified-reports', role: 'RESPONSABLE_TRAITEMENT' },
  { path: '/assignments/pending-contents', role: 'RESPONSABLE_AFFECTATION' },
  { path: '/interventions/my-teams', role: 'AGENT_TERRAIN' },
  { path: '/verification/pending', role: 'VERIFICATEUR_CLOTURE' },
  { path: '/referentials/teams', role: 'GESTIONNAIRE_REFERENTIEL' },
  { path: '/accounts', role: 'ADMINISTRATEUR_COMPTES' },
];

function required(value, name) {
  if (!value) throw new Error('Missing required staging variable: ' + name);
  return value;
}

function passwordForRole(role) {
  return createHmac('sha256', PASSWORD_SEED)
    .update('isieco-staging-e2e:' + role)
    .digest('base64url') + 'A1!';
}

function validateTargets() {
  const supabaseUrl = new URL(required(SUPABASE_URL, 'SUPABASE_URL'));
  assert.equal(supabaseUrl.protocol, 'https:', 'Supabase URL must use HTTPS.');
  assert.equal(supabaseUrl.hostname, PROJECT_REF + '.supabase.co', 'Unexpected Supabase project.');

  const apiUrlValue = required(API_BASE_URL, 'STAGING_API_BASE_URL');
  const apiUrlParsed = new URL(apiUrlValue);
  assert.equal(apiUrlParsed.protocol, 'https:', 'Staging API URL must use HTTPS.');
  assert.equal(apiUrlParsed.hostname, 'isieco-api-staging.onrender.com', 'Unexpected API target.');
  assert.equal(apiUrlParsed.pathname.replace(/\/+$/u, ''), '/api/v1', 'Unexpected API prefix.');

  assert.ok(Buffer.byteLength(required(PASSWORD_SEED, 'STAGING_E2E_PASSWORD_SEED'), 'utf8') >= 32,
    'STAGING_E2E_PASSWORD_SEED must contain at least 32 bytes.');
  required(PUBLIC_KEY, 'STAGING_SUPABASE_ANON_KEY');
  const secretKey = required(SECRET_KEY, 'SUPABASE_SECRET_KEY');
  assert.equal(STORAGE_BUCKET, 'isieco-private-media', 'Unexpected private Storage bucket.');
  assert.equal(MEDIA_RETENTION_DAYS, 365, 'Staging media retention must be 365 days.');

  if (secretKey.startsWith('sb_publishable_') || secretKey.startsWith('sb_anon_')) {
    throw new Error('SUPABASE_SECRET_KEY must be a server-side Storage secret.');
  }
  if (!secretKey.startsWith('sb_secret_')) {
    const payload = secretKey.split('.')[1];
    if (!payload) throw new Error('SUPABASE_SECRET_KEY must be an sb_secret key or legacy service_role JWT.');
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (claims.role !== 'service_role') throw new Error('SUPABASE_SECRET_KEY is not a service_role key.');
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('SUPABASE_SECRET_KEY is not a valid server-side key.');
      throw error;
    }
  }

  const databaseUrl = new URL(required(process.env.DATABASE_URL, 'DATABASE_URL'));
  assert.ok(['postgres:', 'postgresql:'].includes(databaseUrl.protocol), 'DATABASE_URL must be PostgreSQL.');
  assert.ok(databaseUrl.hostname.endsWith('.pooler.supabase.com'), 'DATABASE_URL must use the staging Session Pooler.');
  assert.equal(databaseUrl.port, '5432', 'DATABASE_URL must use port 5432.');
  assert.equal(decodeURIComponent(databaseUrl.username), 'postgres.' + PROJECT_REF, 'Unexpected staging database user.');
  assert.equal(databaseUrl.pathname, '/postgres', 'DATABASE_URL must target the staging postgres database.');
  assert.ok(['require', 'verify-ca', 'verify-full'].includes(databaseUrl.searchParams.get('sslmode')), 'DATABASE_URL must require TLS.');


  if (PUBLIC_KEY.startsWith('sb_secret_')) {
    throw new Error('Use the Supabase publishable/anon key, never the secret key, for E2E sign-in.');
  }
  if (PUBLIC_KEY.split('.').length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(PUBLIC_KEY.split('.')[1], 'base64url').toString('utf8'));
      if (claims.role === 'service_role') {
        throw new Error('The staging E2E sign-in key must not be a service_role JWT.');
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('STAGING_SUPABASE_ANON_KEY is not a valid public key.');
      }
      throw error;
    }
  }
}

function apiUrl(path) {
  return API_BASE_URL.replace(/\/+$/u, '') + '/' + path.replace(/^\/+/u, '');
}

async function api(token, path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body;
  const requestHeaders = { accept: 'application/json', ...(options.headers || {}) };
  if (token) requestHeaders.authorization = 'Bearer ' + token;
  if (body !== undefined) requestHeaders['content-type'] = 'application/json';

  const response = await fetch(apiUrl(path), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const raw = await response.text();
  let parsed = null;
  if (raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = raw.slice(0, 1000); }
  }
  return { status: response.status, body: parsed };
}

async function apiMultipart(token, path, fileBytes, filename, fields = {}) {
  const form = new FormData();
  form.set('file', new Blob([fileBytes], { type: 'image/png' }), filename);
  for (const [key, value] of Object.entries(fields)) form.set(key, value);

  const headers = { accept: 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers,
    body: form,
    signal: AbortSignal.timeout(25_000),
  });
  const raw = await response.text();
  let parsed = null;
  if (raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = raw.slice(0, 1000); }
  }
  return { status: response.status, body: parsed };
}

function expectStatus(result, expected, label) {
  assert.equal(
    result.status,
    expected,
    label + ': expected HTTP ' + expected + ', got ' + result.status + '; body=' + JSON.stringify(result.body),
  );
  return result.body;
}

function expectSuccess(result, label, allowed = [200, 201]) {
  assert.ok(
    allowed.includes(result.status),
    label + ': expected HTTP ' + allowed.join(' or ') + ', got ' + result.status + '; body=' + JSON.stringify(result.body),
  );
  return result.body;
}

async function signInAccounts() {
  const supabase = createClient(SUPABASE_URL, PUBLIC_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const tokens = new Map();

  for (const account of accounts) {
    const result = await supabase.auth.signInWithPassword({
      email: account.email,
      password: passwordForRole(account.role),
    });
    if (result.error || !result.data.session || !result.data.session.access_token) {
      throw new Error('Supabase sign-in failed for role ' + account.role + ': ' +
        (result.error ? result.error.message : 'No access token returned'));
    }
    tokens.set(account.key, result.data.session.access_token);
  }
  return tokens;
}

async function verifyRoleMatrix(tokens) {
  for (const route of protectedReadRoutes) {
    const anonymous = await api(null, route.path);
    expectStatus(anonymous, 401, 'Anonymous access ' + route.path);

    const results = await Promise.all(accounts.map(async (account) => ({
      role: account.role,
      result: await api(tokens.get(account.key), route.path),
    })));

    for (const item of results) {
      const expected = item.role === route.role ? 200 : 403;
      expectStatus(item.result, expected, item.role + ' -> ' + route.path);
    }
    console.log('PASS role matrix: ' + route.path + ' allows ' + route.role + '; denies every non-authorized identity.');
  }
  console.log('PASS access-control matrix: ' + (protectedReadRoutes.length * accounts.length) +
    ' role/route checks and ' + protectedReadRoutes.length + ' anonymous checks.');
}

async function ensureTeamAndMembership(tokens, wasteTypeId, terrainProfileId) {
  const managerToken = tokens.get('GESTIONNAIRE_REFERENTIEL');
  const terrainToken = tokens.get('AGENT_TERRAIN');

  const teamList = expectSuccess(await api(managerToken, '/referentials/teams'), 'List teams');
  assert.ok(Array.isArray(teamList), 'Referentials team response must be an array.');

  let team = teamList.find((candidate) =>
    candidate.etatEquipe === 'ACTIVE' &&
    Array.isArray(candidate.competences) &&
    candidate.competences.some((skill) => skill.actif && skill.idTypeDechet === wasteTypeId),
  );

  if (!team) {
    const created = expectSuccess(await api(managerToken, '/referentials/teams', {
      method: 'POST',
      body: {
        nomEquipe: ('E2E workflow staging ' + RUN_ID + '-' + RUN_ATTEMPT).slice(0, 150),
        description: 'Équipe technique créée par le parcours E2E staging.',
        etatEquipe: 'ACTIVE',
      },
    }), 'Create E2E team');
    assert.ok(created.idEquipe, 'Created team must expose idEquipe.');
    team = { idEquipe: created.idEquipe, etatEquipe: created.etatEquipe };

    expectSuccess(await api(managerToken, '/referentials/teams/' + team.idEquipe + '/skills', {
      method: 'POST',
      body: {
        idTypeDechet: wasteTypeId,
        commentaire: 'Compétence créée par le parcours E2E staging.',
      },
    }), 'Add E2E team skill');
  }

  const currentTeams = expectSuccess(await api(terrainToken, '/interventions/my-teams'), 'List agent teams');
  assert.ok(Array.isArray(currentTeams), 'Agent teams response must be an array.');

  if (!currentTeams.some((item) => item.idEquipe === team.idEquipe)) {
    expectSuccess(await api(managerToken, '/referentials/teams/' + team.idEquipe + '/memberships', {
      method: 'POST',
      body: {
        idUtilisateur: terrainProfileId,
        dateDebut: new Date(Date.now() - 60_000).toISOString(),
        fonction: 'Agent terrain E2E',
      },
    }), 'Add E2E field agent to team');
  }

  const verifiedTeams = expectSuccess(await api(terrainToken, '/interventions/my-teams'), 'Verify agent team membership');
  assert.ok(
    verifiedTeams.some((item) => item.idEquipe === team.idEquipe),
    'The E2E field agent must be an active member of the selected team.',
  );

  const eligibleTeams = expectSuccess(
    await api(tokens.get('RESPONSABLE_AFFECTATION'), '/assignments/eligible-teams/' + wasteTypeId),
    'List eligible teams',
  );
  assert.ok(
    eligibleTeams.some((item) => item.idEquipe === team.idEquipe),
    'Selected team must be eligible for the chosen waste type.',
  );

  return team;
}

async function purgePreviousSyntheticMedia(prisma, purge) {
  const stalePhotos = await prisma.photoSignalement.findMany({
    where: {
      description: 'Preuve synthétique de test Storage staging.',
      mediaPurgeAt: null,
      signalement: {
        is: {
          description: { startsWith: 'Signalement de test E2E staging ' },
          utilisateur: { is: { email: accounts[0].email } },
        },
      },
    },
    orderBy: [{ dateAjout: 'asc' }, { idPhotoSignalement: 'asc' }],
    take: 501,
    select: { idPhotoSignalement: true },
  });

  if (stalePhotos.length === 0) return;
  assert.ok(
    stalePhotos.length <= 500,
    'More than 500 stale synthetic staging photos found; refusing broad cleanup.',
  );

  const photoIds = stalePhotos.map((photo) => photo.idPhotoSignalement);
  const expiredAt = new Date(Date.now() - 5_000);
  const addedAt = new Date(expiredAt.getTime() - (365 * 24 * 60 * 60 * 1000) - 5_000);
  const updated = await prisma.photoSignalement.updateMany({
    where: { idPhotoSignalement: { in: photoIds }, mediaPurgeAt: null },
    data: { dateAjout: addedAt, dateExpiration: expiredAt },
  });
  assert.equal(updated.count, photoIds.length, 'Every stale synthetic fixture must be expired before cleanup.');

  const result = await purge.purgeExpiredMedia(500, { reportPhotoIds: photoIds });
  assert.equal(result.scannedSignalement, photoIds.length, 'Cleanup must scan exactly the identified synthetic photos.');
  assert.equal(result.purgedSignalement, photoIds.length, 'Every stale synthetic photo must be purged.');
  assert.equal(result.failed, 0, 'Stale synthetic media cleanup must not report failures.');
  console.log('PASS cleanup: purged ' + photoIds.length + ' prior synthetic staging media fixture(s).');
}

async function verifyReportPhotoLifecycle(citizenToken, reportId, otherCitizenToken) {
  const app = await NestFactory.createApplicationContext(StorageMaintenanceModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const purge = app.get(MediaPurgeService);
  const storageAdmin = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  let photoId = null;
  let purgeVerified = false;

  try {
    await purgePreviousSyntheticMedia(prisma, purge);
    const [expiredReports, expiredInterventions] = await Promise.all([
      prisma.photoSignalement.count({
        where: { dateExpiration: { lte: new Date() }, mediaPurgeAt: null },
      }),
      prisma.photoIntervention.count({
        where: { dateExpiration: { lte: new Date() }, mediaPurgeAt: null },
      }),
    ]);
    assert.equal(
      expiredReports + expiredInterventions,
      0,
      'Refusing the synthetic purge test because unrelated expired media already exists in staging.',
    );

    const uploaded = expectSuccess(
      await apiMultipart(
        citizenToken,
        '/reports/' + reportId + '/photos',
        REPORT_IMAGE_FIXTURE,
        'isieco-staging-media-e2e.png',
        { description: 'Preuve synthétique de test Storage staging.' },
      ),
      'Upload synthetic report photo',
    );
    photoId = uploaded.idPhotoSignalement || uploaded.idPhoto;
    assert.ok(photoId, 'Uploaded photo must expose its photo identifier.');
    expectStatus(
      await api(otherCitizenToken, '/reports/' + reportId + '/photos/' + photoId + '/url'),
      404,
      'A second citizen must not obtain another citizen private photo URL',
    );

    const photo = await prisma.photoSignalement.findUnique({
      where: { idPhotoSignalement: photoId },
      select: {
        idPhotoSignalement: true,
        idSignalement: true,
        referencePhoto: true,
        dateAjout: true,
        dateExpiration: true,
        mediaPurgeAt: true,
      },
    });
    assert.ok(photo, 'Uploaded photo metadata must exist.');
    assert.equal(photo.idSignalement, reportId, 'Synthetic photo must belong to the synthetic report.');
    assert.ok(
      photo.referencePhoto.startsWith('reports/' + reportId + '/'),
      'Synthetic object must be in the exact report-scoped Storage prefix.',
    );
    const expectedRetentionMs = 365 * 24 * 60 * 60 * 1000;
    const actualRetentionMs = photo.dateExpiration.getTime() - photo.dateAjout.getTime();
    assert.ok(
      Math.abs(actualRetentionMs - expectedRetentionMs) < 10_000,
      'API must persist a 365-day media expiry from upload time.',
    );

    const anonymousStorage = createClient(SUPABASE_URL, PUBLIC_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const anonymousDownload = await anonymousStorage.storage.from(STORAGE_BUCKET).download(photo.referencePhoto);
    assert.ok(
      anonymousDownload.error,
      'Private report object must not be downloadable with the public anon key.',
    );
    expectStatus(
      await api(null, '/reports/' + reportId + '/photos/' + photoId + '/url'),
      401,
      'Anonymous API access to private photo URL',
    );

    const signed = expectSuccess(
      await api(citizenToken, '/reports/' + reportId + '/photos/' + photoId + '/url'),
      'Create private signed photo URL',
    );
    assert.equal(signed.expiresInSeconds, 60, 'Signed URLs must expire after 60 seconds.');
    assert.ok(typeof signed.signedUrl === 'string' && signed.signedUrl.startsWith('https://'));

    const signedDownload = await fetch(signed.signedUrl, { signal: AbortSignal.timeout(25_000) });
    assert.equal(signedDownload.status, 200, 'Private signed URL must allow authorized temporary download.');
    assert.deepEqual(
      Buffer.from(await signedDownload.arrayBuffer()),
      REPORT_IMAGE_FIXTURE,
      'Downloaded bytes must match the synthetic image uploaded through the API.',
    );

    const adminDownload = await storageAdmin.storage.from(STORAGE_BUCKET).download(photo.referencePhoto);
    if (adminDownload.error || !adminDownload.data) {
      throw new Error('Storage admin read could not verify the uploaded synthetic object.');
    }
    assert.deepEqual(
      Buffer.from(await adminDownload.data.arrayBuffer()),
      REPORT_IMAGE_FIXTURE,
      'Stored object bytes must match the uploaded image.',
    );

    const expiredAt = new Date(Date.now() - 5_000);
    const expiredAddedAt = new Date(expiredAt.getTime() - expectedRetentionMs - 5_000);
    await prisma.photoSignalement.update({
      where: { idPhotoSignalement: photoId },
      data: {
        dateAjout: expiredAddedAt,
        dateExpiration: expiredAt,
      },
    });

    const purgeResult = await purge.purgeExpiredMedia(1, { reportPhotoIds: [photoId] });
    assert.deepEqual(purgeResult, {
      scannedSignalement: 1,
      scannedIntervention: 0,
      purgedSignalement: 1,
      purgedIntervention: 0,
      skipped: 0,
      failed: 0,
    }, 'Scoped purge must remove only the synthetic report photo.');

    const purgedPhoto = await prisma.photoSignalement.findUnique({
      where: { idPhotoSignalement: photoId },
      select: { mediaPurgeAt: true, dateExpiration: true },
    });
    assert.ok(purgedPhoto && purgedPhoto.mediaPurgeAt, 'Purge must mark the synthetic photo metadata.');
    assert.ok(purgedPhoto.dateExpiration <= new Date(), 'Synthetic photo must remain expired after purge.');

    const storageAfterPurge = await storageAdmin.storage.from(STORAGE_BUCKET).download(photo.referencePhoto);
    assert.ok(storageAfterPurge.error, 'Purged synthetic object must no longer be downloadable from private Storage.');

    const newSignedUrl = await api(
      citizenToken,
      '/reports/' + reportId + '/photos/' + photoId + '/url',
    );
    expectStatus(newSignedUrl, 404, 'Signed URL after media purge');

    const auditEvents = await prisma.$queryRawUnsafe(
      `SELECT action_code AS "actionCode", entity_type AS "entityType", entity_id AS "entityId", metadata
       FROM audit.evenement_metier
       WHERE action_code = 'PHOTO_SIGNALEMENT_PURGEE'
         AND entity_type = 'SIGNALEMENT'
         AND entity_id = $1::uuid`,
      reportId,
    );
    assert.ok(
      auditEvents.length > 0,
      'Scoped purge must append PHOTO_SIGNALEMENT_PURGEE to the business audit ledger.',
    );
    purgeVerified = true;
    console.log(
      'PASS media lifecycle: API upload -> private 60s signed URL -> 365-day expiry -> targeted purge -> Storage deletion -> audit.',
    );
  } finally {
    if (photoId && !purgeVerified) {
      try {
        const cleanupExpiredAt = new Date(Date.now() - 5_000);
        const cleanupAddedAt = new Date(
          cleanupExpiredAt.getTime() - (365 * 24 * 60 * 60 * 1000) - 5_000,
        );
        await prisma.photoSignalement.updateMany({
          where: { idPhotoSignalement: photoId, mediaPurgeAt: null },
          data: {
            dateAjout: cleanupAddedAt,
            dateExpiration: cleanupExpiredAt,
          },
        });
        const cleanup = await purge.purgeExpiredMedia(1, { reportPhotoIds: [photoId] });
        if (cleanup.failed > 0 || cleanup.purgedSignalement > 1) {
          console.error('MEDIA_E2E_CLEANUP=INCOMPLETE');
        }
      } catch {
        console.error('MEDIA_E2E_CLEANUP=FAILED');
      }
    }
    await app.close();
  }
}

async function verifyInterventionPhotoLifecycle(fieldAgentToken, verifierToken, assignmentId, interventionId) {
  const app = await NestFactory.createApplicationContext(StorageMaintenanceModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const purge = app.get(MediaPurgeService);
  const storageAdmin = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const anonymousStorage = createClient(SUPABASE_URL, PUBLIC_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const photoUrlPath = (photoId) =>
    '/verification/assignments/' + assignmentId + '/photos/' + photoId + '/url';
  let photoId = null;
  let purgeCompleted = false;

  try {
    const uploaded = expectSuccess(
      await apiMultipart(
        fieldAgentToken,
        '/interventions/' + interventionId + '/photos',
        REPORT_IMAGE_FIXTURE,
        'isieco-staging-intervention-e2e.png',
        {
          contextePhoto: 'Après intervention',
          description: 'Preuve synthétique de test Storage intervention staging.',
        },
      ),
      'Upload synthetic intervention photo',
    );
    photoId = uploaded.idPhotoIntervention || uploaded.idPhoto;
    assert.ok(photoId, 'Uploaded intervention photo must expose its photo identifier.');

    const photo = await prisma.photoIntervention.findUnique({
      where: { idPhotoIntervention: photoId },
      select: {
        idPhotoIntervention: true,
        idIntervention: true,
        referencePhoto: true,
        dateAjout: true,
        dateExpiration: true,
        mediaPurgeAt: true,
      },
    });
    assert.ok(photo, 'Uploaded intervention photo metadata must exist.');
    assert.equal(photo.idIntervention, interventionId, 'Synthetic photo must belong to the synthetic intervention.');
    assert.ok(
      photo.referencePhoto.startsWith('interventions/' + interventionId + '/'),
      'Synthetic object must be in the exact intervention-scoped Storage prefix.',
    );
    assert.equal(photo.mediaPurgeAt, null, 'New intervention photo must not be marked as purged.');

    const expectedRetentionMs = 365 * 24 * 60 * 60 * 1000;
    const actualRetentionMs = photo.dateExpiration.getTime() - photo.dateAjout.getTime();
    assert.ok(
      Math.abs(actualRetentionMs - expectedRetentionMs) < 10_000,
      'Intervention API must persist a 365-day media expiry from upload time.',
    );

    const anonymousDownload = await anonymousStorage.storage.from(STORAGE_BUCKET).download(photo.referencePhoto);
    assert.ok(anonymousDownload.error, 'Private intervention object must not be downloadable with the public anon key.');

    const adminDownload = await storageAdmin.storage.from(STORAGE_BUCKET).download(photo.referencePhoto);
    if (adminDownload.error || !adminDownload.data) {
      throw new Error('Storage admin read could not verify the uploaded synthetic intervention object.');
    }
    assert.deepEqual(
      Buffer.from(await adminDownload.data.arrayBuffer()),
      REPORT_IMAGE_FIXTURE,
      'Stored intervention object bytes must match the uploaded image.',
    );

    const submitted = expectSuccess(
      await api(fieldAgentToken, '/interventions/' + interventionId + '/submit', {
        method: 'POST',
        body: {
          resultatIntervention: 'TERMINEE',
          compteRendu: 'La zone a été nettoyée et les déchets collectés.',
        },
      }),
      'Submit intervention report with photo evidence',
    );
    assert.equal(submitted.statutIntervention, 'SOUMISE', 'Intervention must be submitted before verification.');

    expectStatus(await api(null, photoUrlPath(photoId)), 401, 'Anonymous intervention photo URL access');
    expectStatus(
      await api(fieldAgentToken, photoUrlPath(photoId)),
      403,
      'Field agent must not access verifier-only intervention photo URL',
    );

    const signed = expectSuccess(
      await api(verifierToken, photoUrlPath(photoId)),
      'Create verifier-only private intervention photo URL',
    );
    assert.equal(signed.expiresInSeconds, 60, 'Intervention proof URLs must expire after 60 seconds.');
    assert.ok(typeof signed.signedUrl === 'string' && signed.signedUrl.startsWith('https://'));

    const signedDownload = await fetch(signed.signedUrl, { signal: AbortSignal.timeout(25_000) });
    assert.equal(signedDownload.status, 200, 'Authorized verifier signed URL must allow temporary download.');
    assert.deepEqual(
      Buffer.from(await signedDownload.arrayBuffer()),
      REPORT_IMAGE_FIXTURE,
      'Downloaded intervention proof bytes must match the synthetic image.',
    );

    const expiredAt = new Date(Date.now() - 5_000);
    const expiredAddedAt = new Date(expiredAt.getTime() - expectedRetentionMs - 5_000);
    await prisma.photoIntervention.update({
      where: { idPhotoIntervention: photoId },
      data: { dateAjout: expiredAddedAt, dateExpiration: expiredAt },
    });

    const purgeResult = await purge.purgeExpiredMedia(1, { interventionPhotoIds: [photoId] });
    assert.deepEqual(purgeResult, {
      scannedSignalement: 0,
      scannedIntervention: 1,
      purgedSignalement: 0,
      purgedIntervention: 1,
      skipped: 0,
      failed: 0,
    }, 'Scoped purge must remove only the synthetic intervention photo.');

    const purgedPhoto = await prisma.photoIntervention.findUnique({
      where: { idPhotoIntervention: photoId },
      select: { mediaPurgeAt: true, dateExpiration: true },
    });
    assert.ok(purgedPhoto && purgedPhoto.mediaPurgeAt, 'Purge must mark the synthetic intervention photo metadata.');
    assert.ok(purgedPhoto.dateExpiration <= new Date(), 'Synthetic intervention photo must remain expired after purge.');

    const storageAfterPurge = await storageAdmin.storage.from(STORAGE_BUCKET).download(photo.referencePhoto);
    assert.ok(storageAfterPurge.error, 'Purged intervention object must no longer be downloadable from private Storage.');
    expectStatus(
      await api(verifierToken, photoUrlPath(photoId)),
      404,
      'Verifier signed URL after intervention media purge',
    );
    purgeCompleted = true;

    const auditEvents = await prisma.$queryRawUnsafe(
      "SELECT action_code AS \"actionCode\", entity_type AS \"entityType\", entity_id AS \"entityId\", metadata " +
      "FROM audit.evenement_metier " +
      "WHERE action_code = 'PHOTO_INTERVENTION_PURGEE' " +
      "AND entity_type = 'INTERVENTION' " +
      'AND entity_id = $1::uuid',
      interventionId,
    );
    assert.ok(
      auditEvents.length > 0,
      'Scoped purge must append PHOTO_INTERVENTION_PURGEE to the business audit ledger.',
    );

    console.log(
      'PASS intervention media lifecycle: API upload -> private Storage -> verifier-only 60s signed URL -> 365-day expiry -> targeted purge -> Storage deletion -> audit.',
    );
    return submitted;
  } finally {
    if (photoId && !purgeCompleted) {
      try {
        const cleanupExpiredAt = new Date(Date.now() - 5_000);
        const cleanupAddedAt = new Date(
          cleanupExpiredAt.getTime() - (365 * 24 * 60 * 60 * 1000) - 5_000,
        );
        await prisma.photoIntervention.updateMany({
          where: { idPhotoIntervention: photoId, mediaPurgeAt: null },
          data: { dateAjout: cleanupAddedAt, dateExpiration: cleanupExpiredAt },
        });
        const cleanup = await purge.purgeExpiredMedia(1, { interventionPhotoIds: [photoId] });
        if (cleanup.failed > 0 || cleanup.purgedIntervention > 1) {
          console.error('INTERVENTION_MEDIA_E2E_CLEANUP=INCOMPLETE');
        }
      } catch {
        console.error('INTERVENTION_MEDIA_E2E_CLEANUP=FAILED');
      }
    }
    await app.close();
  }
}

async function runBusinessJourney(tokens) {
  const citizen = tokens.get('CITOYEN');
  const secondaryCitizen = tokens.get('CITOYEN_SECONDARY');
  const qualification = tokens.get('AGENT_QUALIFICATION');
  const treatment = tokens.get('RESPONSABLE_TRAITEMENT');
  const assignmentManager = tokens.get('RESPONSABLE_AFFECTATION');
  const fieldAgent = tokens.get('AGENT_TERRAIN');
  const verifier = tokens.get('VERIFICATEUR_CLOTURE');

  const citizenProfile = expectSuccess(await api(citizen, '/accounts/me'), 'Citizen profile');
  const fieldProfile = expectSuccess(await api(fieldAgent, '/accounts/me'), 'Field agent profile');
  assert.ok(citizenProfile.utilisateurId, 'Citizen business profile must exist.');
  assert.ok(fieldProfile.utilisateurId, 'Field agent business profile must exist.');

  const wasteTypes = expectSuccess(await api(citizen, '/reports/waste-types'), 'List citizen waste types');
  assert.ok(Array.isArray(wasteTypes) && wasteTypes.length > 0, 'At least one active waste type is required.');
  const wasteType = wasteTypes.find((item) => item.codeType === 'TEST_DECHETS_MENAGERS') || wasteTypes[0];

  const idempotencyPrefix = 'staging-e2e-' + RUN_ID + '-' + RUN_ATTEMPT + '-' + randomUUID().slice(0, 8);
  const reportRequest = {
    description: 'Signalement de test E2E staging ' + RUN_ID + '-' + RUN_ATTEMPT + '.',
    dateConstat: new Date().toISOString(),
    descriptionLocalisation: 'Zone technique de test staging, fixture non réelle.',
    contenus: [{
      idTypeDechet: wasteType.idTypeDechet,
      quantiteEstimee: 2,
      volumeEstime: 1.5,
      remarque: 'Contenu généré par le parcours E2E automatisé.',
    }],
  };

  const report = expectSuccess(await api(citizen, '/reports', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyPrefix + '-report' },
    body: reportRequest,
  }), 'Create citizen report');
  assert.ok(report.idSignalement, 'Created report must expose idSignalement.');
  assert.equal(report.statutSignalement, 'SOUMIS', 'New report must start as SOUMIS.');

  const ownReport = expectSuccess(await api(citizen, '/reports/' + report.idSignalement), 'Read own report');
  assert.equal(ownReport.statutSignalement, 'SOUMIS');
  expectStatus(
    await api(secondaryCitizen, '/reports/' + report.idSignalement),
    404,
    'A second citizen must not read another citizen report',
  );

  await verifyReportPhotoLifecycle(citizen, report.idSignalement, secondaryCitizen);

  const qualificationQueue = expectSuccess(
    await api(qualification, '/qualification/queue?page=1&pageSize=100'),
    'Qualification queue',
  );
  assert.ok(
    qualificationQueue.items && qualificationQueue.items.some((item) => item.idSignalement === report.idSignalement),
    'New citizen report must appear in qualification queue.',
  );

  expectSuccess(await api(qualification, '/qualification/' + report.idSignalement + '/accept', {
    method: 'POST',
    body: {
      contenus: [{
        idTypeDechet: wasteType.idTypeDechet,
        quantiteEstimee: 2,
        volumeEstime: 1.5,
        remarque: reportRequest.contenus[0].remarque,
      }],
    },
  }), 'Qualify report');

  const qualifiedReport = expectSuccess(
    await api(citizen, '/reports/' + report.idSignalement),
    'Verify qualified report',
  );
  assert.equal(qualifiedReport.statutSignalement, 'QUALIFIE', 'Report must transition to QUALIFIE.');

  const createdCase = expectSuccess(await api(treatment, '/cases/from-reports/' + report.idSignalement, {
    method: 'POST',
    body: {
      descriptionSynthese: 'Dossier E2E staging généré depuis ' + report.idSignalement + '.',
      priorite: 'NORMALE',
    },
  }), 'Create treatment case');
  assert.ok(createdCase.idDossier, 'Created case must expose idDossier.');
  const caseContent = createdCase.contenus && createdCase.contenus.find((item) => item.idTypeDechet === wasteType.idTypeDechet);
  assert.ok(caseContent && caseContent.idContenuDossier, 'Created case must expose the retained content id.');

  const team = await ensureTeamAndMembership(tokens, wasteType.idTypeDechet, fieldProfile.utilisateurId);

  const createdAssignment = expectSuccess(await api(assignmentManager, '/assignments', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyPrefix + '-assignment' },
    body: {
      idContenuDossier: caseContent.idContenuDossier,
      idEquipe: team.idEquipe,
      motif: 'Affectation créée pour vérifier le parcours E2E staging.',
      observation: 'Affectation de test automatisée.',
    },
  }), 'Create assignment');
  assert.ok(createdAssignment.idAffectation, 'Created assignment must expose idAffectation.');

  const acceptedAssignment = expectSuccess(await api(fieldAgent, '/assignments/' + createdAssignment.idAffectation + '/response', {
    method: 'POST',
    body: {
      decisionEquipe: 'ACCEPTEE',
      observation: 'Équipe E2E prête à intervenir.',
    },
  }), 'Accept assignment');
  assert.equal(acceptedAssignment.decisionEquipe, 'ACCEPTEE');

  const intervention = expectSuccess(await api(fieldAgent, '/interventions/assignments/' + createdAssignment.idAffectation + '/start', {
    method: 'POST',
  }), 'Start field intervention');
  assert.ok(intervention.idIntervention, 'Started intervention must expose idIntervention.');

  const submittedIntervention = await verifyInterventionPhotoLifecycle(
    fieldAgent,
    verifier,
    createdAssignment.idAffectation,
    intervention.idIntervention,
  );

  const pendingVerification = expectSuccess(
    await api(verifier, '/verification/pending?page=1&pageSize=100'),
    'Verification queue',
  );
  assert.ok(
    pendingVerification.items && pendingVerification.items.some((item) =>
      item.affectation && item.affectation.idAffectation === createdAssignment.idAffectation,
    ),
    'Submitted intervention must appear in the verification queue.',
  );

  const decision = expectSuccess(await api(verifier, '/verification/assignments/' + createdAssignment.idAffectation + '/decision', {
    method: 'POST',
    body: { resultatVerification: 'CONFORME' },
  }), 'Verify intervention as conforming');
  assert.equal(decision.verification && decision.verification.etatVerification, 'VALIDEE');
  assert.equal(decision.dossierCloture, true,
    'The one-content treatment case must be closed after conforming verification.');

  const finalCase = expectSuccess(await api(treatment, '/cases/' + createdCase.idDossier), 'Read closed case');
  assert.equal(finalCase.statutDossier, 'CLOTURE');
  assert.ok(finalCase.contenus && finalCase.contenus.some((item) =>
    item.idContenuDossier === caseContent.idContenuDossier && item.etatPriseEnCharge === 'TERMINE',
  ), 'The assigned case content must be marked TERMINE.');

  const history = expectSuccess(
    await api(treatment, '/cases/' + createdCase.idDossier + '/history'),
    'Read business case history',
  );
  assert.ok(Array.isArray(history), 'Case history must be an array.');
  const actions = new Set(history.map((event) => event.actionCode));
  assert.ok(actions.has('DOSSIER_CREE'), 'Business ledger must include DOSSIER_CREE.');
  assert.ok(actions.has('DOSSIER_CLOTURE'), 'Business ledger must include DOSSIER_CLOTURE.');

  console.log('PASS business journey: citizen report -> qualification -> case -> assignment -> field intervention -> verification -> closure.');
  console.log('E2E_FIXTURE report=' + report.idSignalement +
    ' case=' + createdCase.idDossier +
    ' assignment=' + createdAssignment.idAffectation +
    ' intervention=' + intervention.idIntervention);
}

async function main() {
  validateTargets();
  console.log('Staging target: ' + API_BASE_URL);
  console.log('Signing in the nine pre-provisioned staging E2E identities.');
  const ready = await api(null, '/health/ready');
  const readyBody = expectStatus(ready, 200, 'Staging API readiness');
  assert.equal(readyBody.status, 'ok');
  assert.equal(readyBody.checks && readyBody.checks.database, 'ok');

  const tokens = await signInAccounts();
  await verifyRoleMatrix(tokens);
  await runBusinessJourney(tokens);
  console.log('STAGING_E2E_RESULT=SUCCESS');
}

main().catch((error) => {
  console.error('STAGING_E2E_RESULT=FAILURE: ' + (error && error.stack ? error.stack : error));
  process.exitCode = 1;
});
