import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'mlhbdautaxufubaybzyt';
const SUPABASE_URL = 'https://' + PROJECT_REF + '.supabase.co';
const SEED_MARKER = 'isieco-staging-e2e-v1';
const PAGE_SIZE = 1000;

const accounts = [
  { email: 'e2e.citoyen@staging.isieco.test', role: 'CITOYEN' },
  { email: 'e2e.agent-qualification@staging.isieco.test', role: 'AGENT_QUALIFICATION' },
  { email: 'e2e.responsable-traitement@staging.isieco.test', role: 'RESPONSABLE_TRAITEMENT' },
  { email: 'e2e.responsable-affectation@staging.isieco.test', role: 'RESPONSABLE_AFFECTATION' },
  { email: 'e2e.agent-terrain@staging.isieco.test', role: 'AGENT_TERRAIN' },
  { email: 'e2e.verificateur-cloture@staging.isieco.test', role: 'VERIFICATEUR_CLOTURE' },
  { email: 'e2e.gestionnaire-referentiel@staging.isieco.test', role: 'GESTIONNAIRE_REFERENTIEL' },
  { email: 'e2e.administrateur-comptes@staging.isieco.test', role: 'ADMINISTRATEUR_COMPTES' },
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error('Missing required staging environment secret: ' + name);
  return value;
}

function validateTargets() {
  const url = new URL(SUPABASE_URL);
  assert.equal(url.protocol, 'https:', 'Supabase Auth must use HTTPS.');
  assert.equal(url.hostname, PROJECT_REF + '.supabase.co', 'Unexpected Supabase project.');
  assert.equal(url.pathname, '/', 'Unexpected Supabase URL path.');

  const secretKey = requiredEnv('SUPABASE_SECRET_KEY');
  assert.ok(
    secretKey.startsWith('sb_secret_') || secretKey.split('.').length === 3,
    'STAGING_SUPABASE_SECRET_KEY must be an sb_secret key or a legacy service_role JWT.',
  );
  if (!secretKey.startsWith('sb_secret_')) {
    const payload = secretKey.split('.')[1];
    let claims;
    try {
      claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new Error('STAGING_SUPABASE_SECRET_KEY is not a valid server-side key.');
    }
    assert.equal(claims.role, 'service_role', 'STAGING_SUPABASE_SECRET_KEY must have service_role.');
  }

  const publicKey = requiredEnv('STAGING_SUPABASE_ANON_KEY');
  assert.ok(
    !publicKey.startsWith('sb_secret_'),
    'STAGING_SUPABASE_ANON_KEY must be a public publishable/anon key.',
  );
  if (publicKey.split('.').length === 3) {
    let claims;
    try {
      claims = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString('utf8'));
    } catch {
      throw new Error('STAGING_SUPABASE_ANON_KEY is not a valid public key.');
    }
    assert.notEqual(claims.role, 'service_role', 'The verification key must not be service_role.');
  }

  const password = requiredEnv('STAGING_E2E_SHARED_PASSWORD');
  assert.ok(
    Buffer.byteLength(password, 'utf8') >= 16,
    'STAGING_E2E_SHARED_PASSWORD must contain at least 16 bytes.',
  );
  return { secretKey, publicKey, password };
}

async function listAllUsers(admin) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw new Error('Supabase Auth listUsers failed: ' + error.message);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
  throw new Error('Supabase Auth listing exceeded 100 pages; refusing an incomplete account scan.');
}

async function main() {
  const { secretKey, publicKey, password } = validateTargets();

  const admin = createClient(SUPABASE_URL, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const users = await listAllUsers(admin);
  const byEmail = new Map(
    users
      .filter((user) => typeof user.email === 'string')
      .map((user) => [user.email.toLowerCase(), user]),
  );

  // Validate the full allow-list before changing any password.
  const targets = accounts.map((account) => {
    const user = byEmail.get(account.email);
    if (!user) throw new Error('Missing expected staging E2E account: ' + account.email);
    if (user.app_metadata?.isieco_seed !== SEED_MARKER) {
      throw new Error('Refusing to modify an account without the E2E ownership marker: ' + account.email);
    }
    return { ...account, userId: user.id };
  });

  for (const account of targets) {
    const { data, error } = await admin.auth.admin.updateUserById(account.userId, {
      password,
    });
    if (error || !data.user) {
      throw new Error(
        'Password update failed for ' + account.email + ': ' + (error?.message || 'No user returned'),
      );
    }
    if (
      data.user.email?.toLowerCase() !== account.email ||
      data.user.app_metadata?.isieco_seed !== SEED_MARKER
    ) {
      throw new Error('Updated user identity did not match the allow-list for ' + account.email);
    }
  }

  // Verify each credential through the public Auth key, without printing the password.
  for (const account of targets) {
    const verifier = createClient(SUPABASE_URL, publicKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await verifier.auth.signInWithPassword({
      email: account.email,
      password,
    });
    if (error || !data.session) {
      throw new Error(
        'Login verification failed for ' + account.email + ': ' + (error?.message || 'No session returned'),
      );
    }
    await verifier.auth.signOut({ scope: 'local' });
  }

  console.log('PASS: all 8 isolated staging E2E accounts have the temporary password and login was verified.');
  for (const account of targets) {
    console.log(account.role + ': ' + account.email);
  }
  console.log('The shared password was not printed.');
}

main().catch((error) => {
  console.error('STAGING_E2E_PASSWORD_RESET=FAILURE: ' + (error?.stack || error));
  process.exitCode = 1;
});
