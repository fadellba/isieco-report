import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

const STAGING_PROJECT_REF = 'mlhbdautaxufubaybzyt';
const STAGING_SUPABASE_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const SEED_MARKER = 'isieco-staging-e2e-v1';
const PAGE_SIZE = 1000;

const accounts = [
  { slug: 'citoyen', email: 'e2e.citoyen@staging.isieco.test', label: 'Citoyen', role: 'CITOYEN' },
  { slug: 'citoyen-secondaire', email: 'e2e.citoyen-secondaire@staging.isieco.test', label: 'Citoyen secondaire', role: 'CITOYEN', passwordKey: 'CITOYEN_SECONDARY' },
  { slug: 'agent-qualification', email: 'e2e.agent-qualification@staging.isieco.test', label: 'Agent qualification', role: 'AGENT_QUALIFICATION' },
  { slug: 'responsable-traitement', email: 'e2e.responsable-traitement@staging.isieco.test', label: 'Responsable traitement', role: 'RESPONSABLE_TRAITEMENT' },
  { slug: 'responsable-affectation', email: 'e2e.responsable-affectation@staging.isieco.test', label: 'Responsable affectation', role: 'RESPONSABLE_AFFECTATION' },
  { slug: 'agent-terrain', email: 'e2e.agent-terrain@staging.isieco.test', label: 'Agent terrain', role: 'AGENT_TERRAIN' },
  { slug: 'verificateur-cloture', email: 'e2e.verificateur-cloture@staging.isieco.test', label: 'Vérificateur clôture', role: 'VERIFICATEUR_CLOTURE' },
  { slug: 'gestionnaire-referentiel', email: 'e2e.gestionnaire-referentiel@staging.isieco.test', label: 'Gestionnaire référentiel', role: 'GESTIONNAIRE_REFERENTIEL' },
  { slug: 'administrateur-comptes', email: 'e2e.administrateur-comptes@staging.isieco.test', label: 'Administrateur comptes', role: 'ADMINISTRATEUR_COMPTES' },
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertStagingTargets() {
  const supabaseUrl = new URL(requiredEnv('SUPABASE_URL'));
  if (
    supabaseUrl.protocol !== 'https:' ||
    supabaseUrl.hostname !== `${STAGING_PROJECT_REF}.supabase.co` ||
    supabaseUrl.pathname !== '/'
  ) {
    throw new Error('SUPABASE_URL does not target the approved staging Supabase project.');
  }

  const databaseUrl = new URL(requiredEnv('DIRECT_URL'));
  const expectedUsername = `postgres.${STAGING_PROJECT_REF}`;
  const sslMode = databaseUrl.searchParams.get('sslmode');

  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DIRECT_URL must be a PostgreSQL connection string.');
  }
  if (!databaseUrl.hostname.endsWith('.pooler.supabase.com')) {
    throw new Error('DIRECT_URL must use the Supabase Session Pooler.');
  }
  if (databaseUrl.port !== '5432') {
    throw new Error('DIRECT_URL must use Session Pooler port 5432.');
  }
  if (decodeURIComponent(databaseUrl.username) !== expectedUsername) {
    throw new Error('DIRECT_URL does not target the approved staging project.');
  }
  if (databaseUrl.pathname !== '/postgres') {
    throw new Error('DIRECT_URL must target the postgres database.');
  }
  if (!['require', 'verify-ca', 'verify-full'].includes(sslMode)) {
    throw new Error('DIRECT_URL must require TLS using sslmode=require, verify-ca, or verify-full.');
  }
  if (!databaseUrl.password) {
    throw new Error('DIRECT_URL is missing its password.');
  }

  const secretKey = requiredEnv('SUPABASE_SECRET_KEY');
  if (secretKey.startsWith('sb_publishable_') || secretKey.startsWith('sb_anon_')) {
    throw new Error('SUPABASE_SECRET_KEY must be a server-side secret key, not a publishable key.');
  }
  if (secretKey.startsWith('sb_secret_')) return;

  const jwtPayload = secretKey.split('.')[1];
  if (!jwtPayload) {
    throw new Error('SUPABASE_SECRET_KEY must be an sb_secret key or a legacy service_role JWT.');
  }
  try {
    const claims = JSON.parse(Buffer.from(jwtPayload, 'base64url').toString('utf8'));
    if (claims.role !== 'service_role') {
      throw new Error('Legacy Supabase key is not a service_role key.');
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('SUPABASE_SECRET_KEY is not a valid secret key.');
    }
    throw error;
  }
}

function passwordForAccount(account, seed) {
  return createHmac('sha256', seed)
    .update(`isieco-staging-e2e:${account.passwordKey ?? account.role}`)
    .digest('base64url') + 'A1!';
}

async function listAuthUsers(admin) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw new Error(`Supabase Auth listUsers failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
  throw new Error('Supabase Auth user listing exceeded 100 pages; refusing an incomplete seed.');
}

async function ensureAuthUser(admin, account, password, usersByEmail) {
  const existing = usersByEmail.get(account.email.toLowerCase());

  if (existing && existing.app_metadata?.isieco_seed !== SEED_MARKER) {
    throw new Error(
      `Refusing to modify ${account.email}: it exists but is not marked as an ISI-Eco staging E2E account.`,
    );
  }

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { ...existing.app_metadata, isieco_seed: SEED_MARKER },
    });
    if (error || !data.user) {
      throw new Error(`Supabase Auth updateUserById failed for ${account.email}: ${error?.message ?? 'No user returned'}`);
    }
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    app_metadata: { isieco_seed: SEED_MARKER },
  });
  if (error || !data.user) {
    throw new Error(`Supabase Auth createUser failed for ${account.email}: ${error?.message ?? 'No user returned'}`);
  }
  usersByEmail.set(account.email.toLowerCase(), data.user);
  return data.user;
}

async function main() {
  assertStagingTargets();

  const passwordSeed = requiredEnv('STAGING_E2E_PASSWORD_SEED');
  if (Buffer.byteLength(passwordSeed, 'utf8') < 32) {
    throw new Error('STAGING_E2E_PASSWORD_SEED must contain at least 32 bytes.');
  }

  const caCertificate = requiredEnv('STAGING_SUPABASE_CA_CERT').trim();
  if (
    !caCertificate.includes('-----BEGIN CERTIFICATE-----') ||
    !caCertificate.includes('-----END CERTIFICATE-----')
  ) {
    throw new Error('STAGING_SUPABASE_CA_CERT must contain the Supabase staging CA certificate in PEM format.');
  }

  const databaseUrl = new URL(requiredEnv('DIRECT_URL'));
  for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'ssl']) {
    databaseUrl.searchParams.delete(parameter);
  }

  const admin = createClient(STAGING_SUPABASE_URL, requiredEnv('SUPABASE_SECRET_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const pool = new Pool({
    connectionString: databaseUrl.toString(),
    ssl: {
      ca: caCertificate,
      rejectUnauthorized: true,
    },
    max: 2,
    connectionTimeoutMillis: 10000,
    application_name: 'isieco-staging-e2e-user-seed',
  });

  try {
    const db = await pool.connect();
    try {
      const roleCodes = accounts.map((account) => account.role);
      const roleResult = await db.query(
        'SELECT id_role, code_role FROM public.role WHERE code_role = ANY($1::text[])',
        [roleCodes],
      );
      const roleIds = new Map(roleResult.rows.map((row) => [row.code_role, row.id_role]));
      const missingRoles = roleCodes.filter((code) => !roleIds.has(code));
      if (missingRoles.length > 0) {
        throw new Error(`Missing role catalog entries: ${missingRoles.join(', ')}`);
      }
    } finally {
      db.release();
    }

    const authUsers = await listAuthUsers(admin);
    const usersByEmail = new Map(
      authUsers
        .filter((user) => typeof user.email === 'string')
        .map((user) => [user.email.toLowerCase(), user]),
    );

    const provisioned = [];
    for (const account of accounts) {
      const user = await ensureAuthUser(
        admin,
        account,
        passwordForAccount(account, passwordSeed),
        usersByEmail,
      );
      provisioned.push({ account, authUserId: user.id });
    }

    const profileDb = await pool.connect();
    try {
      await profileDb.query('BEGIN');

      for (const { account, authUserId } of provisioned) {
        const conflictingProfile = await profileDb.query(
          `SELECT auth_user_id
             FROM public.utilisateur
            WHERE lower(email) = lower($1)
              AND auth_user_id <> $2::uuid
            LIMIT 1
            FOR UPDATE`,
          [account.email, authUserId],
        );
        if (conflictingProfile.rowCount > 0) {
          throw new Error(`Profile email collision detected for ${account.email}; no profile data was changed.`);
        }

        const profileResult = await profileDb.query(
          `INSERT INTO public.utilisateur (id_utilisateur, auth_user_id, nom, prenom, email, etat_compte)
           VALUES ($1::uuid, $2::uuid, $3, 'Staging', $4, 'ACTIF')
           ON CONFLICT (auth_user_id)
           DO UPDATE SET
             nom = EXCLUDED.nom,
             prenom = EXCLUDED.prenom,
             email = EXCLUDED.email,
             etat_compte = 'ACTIF'
           RETURNING id_utilisateur`,
          [randomUUID(), authUserId, `Compte E2E - ${account.label}`, account.email],
        );
        const userProfileId = profileResult.rows[0]?.id_utilisateur;
        if (!userProfileId) {
          throw new Error(`Could not create or resolve the business profile for ${account.email}.`);
        }

        const roleIdResult = await profileDb.query(
          'SELECT id_role FROM public.role WHERE code_role = $1',
          [account.role],
        );
        const roleId = roleIdResult.rows[0]?.id_role;
        if (!roleId) throw new Error(`Role disappeared during seed: ${account.role}`);

        await profileDb.query(
          `UPDATE public.utilisateur_role
              SET date_fin = CURRENT_TIMESTAMP
            WHERE id_utilisateur = $1::uuid
              AND date_fin IS NULL
              AND id_role <> $2::uuid`,
          [userProfileId, roleId],
        );

        await profileDb.query(
          `INSERT INTO public.utilisateur_role (id_utilisateur, id_role, motif)
           SELECT $1::uuid, $2::uuid, 'Compte E2E staging provisionné par CI'
           WHERE NOT EXISTS (
             SELECT 1
               FROM public.utilisateur_role
              WHERE id_utilisateur = $1::uuid
                AND id_role = $2::uuid
                AND date_fin IS NULL
           )`,
          [userProfileId, roleId],
        );
      }

      const verification = await profileDb.query(
        `SELECT u.email, r.code_role, COUNT(*) OVER (PARTITION BY u.id_utilisateur) AS active_role_count
           FROM public.utilisateur u
           JOIN public.utilisateur_role ur
             ON ur.id_utilisateur = u.id_utilisateur
            AND ur.date_fin IS NULL
           JOIN public.role r ON r.id_role = ur.id_role
          WHERE u.auth_user_id = ANY($1::uuid[])
          ORDER BY u.email`,
        [provisioned.map((entry) => entry.authUserId)],
      );

      if (verification.rowCount !== accounts.length) {
        throw new Error(`Expected ${accounts.length} active role assignments, got ${verification.rowCount ?? 0}.`);
      }

      const verifiedByEmail = new Map(verification.rows.map((row) => [row.email, row]));
      for (const account of accounts) {
        const row = verifiedByEmail.get(account.email);
        if (!row || row.code_role !== account.role || Number(row.active_role_count) !== 1) {
          throw new Error(`Role verification failed for ${account.email}; expected exactly one active role: ${account.role}.`);
        }
      }

      await profileDb.query('COMMIT');
      console.log(`Provisioned and verified ${accounts.length} isolated staging E2E Auth users and profiles.`);
      for (const account of accounts) {
        console.log(`- ${account.role}: ${account.email}`);
      }
      console.log('Passwords were not printed. They are derived per account key from STAGING_E2E_PASSWORD_SEED.');
    } catch (error) {
      await profileDb.query('ROLLBACK');
      throw error;
    } finally {
      profileDb.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
