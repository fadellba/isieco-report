import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'mlhbdautaxufubaybzyt';
const SUPABASE_URL = 'https://' + PROJECT_REF + '.supabase.co';
const SEED_MARKER = 'isieco-staging-e2e-v1';
const PAGE_SIZE = 1000;

const accounts = [
  // Noms d'utilisateurs réalistes
  { email: 'admin.global@isieco.sn', role: 'SUPERADMIN', slug: 'superadmin' },
  { email: 'fatou.diallo@gmail.com', role: 'CITOYEN', slug: 'citoyen' },
  { email: 'moussa.ba@outlook.com', role: 'CITOYEN', slug: 'citoyen-secondaire', passwordKey: 'CITOYEN_SECONDARY' },
  { email: 'mariama.sow@isieco.sn', role: 'AGENT_QUALIFICATION', slug: 'agent-qualification' },
  { email: 'amadou.fall@isieco.sn', role: 'RESPONSABLE_TRAITEMENT', slug: 'responsable-traitement' },
  { email: 'awa.ndiaye@isieco.sn', role: 'RESPONSABLE_AFFECTATION', slug: 'responsable-affectation' },
  { email: 'cheikh.diop@isieco.sn', role: 'AGENT_TERRAIN', slug: 'agent-terrain' },
  { email: 'oumy.traore@isieco.sn', role: 'VERIFICATEUR_CLOTURE', slug: 'verificateur-cloture' },
  { email: 'ibrahima.kane@isieco.sn', role: 'GESTIONNAIRE_REFERENTIEL', slug: 'gestionnaire-referentiel' },
  { email: 'aminata.gueye@isieco.sn', role: 'ADMINISTRATEUR_COMPTES', slug: 'administrateur-comptes' },
  // Compatibilité avec les identifiants techniques e2e antérieurs si encore présents
  { email: 'e2e.superadmin@staging.isieco.test', role: 'SUPERADMIN', slug: 'superadmin-legacy', optional: true },
  { email: 'e2e.citoyen@staging.isieco.test', role: 'CITOYEN', slug: 'citoyen-legacy', optional: true },
  { email: 'e2e.citoyen-secondaire@staging.isieco.test', role: 'CITOYEN', slug: 'citoyen-secondaire-legacy', passwordKey: 'CITOYEN_SECONDARY', optional: true },
  { email: 'e2e.agent-qualification@staging.isieco.test', role: 'AGENT_QUALIFICATION', slug: 'agent-qualification-legacy', optional: true },
  { email: 'e2e.responsable-traitement@staging.isieco.test', role: 'RESPONSABLE_TRAITEMENT', slug: 'responsable-traitement-legacy', optional: true },
  { email: 'e2e.responsable-affectation@staging.isieco.test', role: 'RESPONSABLE_AFFECTATION', slug: 'responsable-affectation-legacy', optional: true },
  { email: 'e2e.agent-terrain@staging.isieco.test', role: 'AGENT_TERRAIN', slug: 'agent-terrain-legacy', optional: true },
  { email: 'e2e.verificateur-cloture@staging.isieco.test', role: 'VERIFICATEUR_CLOTURE', slug: 'verificateur-cloture-legacy', optional: true },
  { email: 'e2e.gestionnaire-referentiel@staging.isieco.test', role: 'GESTIONNAIRE_REFERENTIEL', slug: 'gestionnaire-referentiel-legacy', optional: true },
  { email: 'e2e.administrateur-comptes@staging.isieco.test', role: 'ADMINISTRATEUR_COMPTES', slug: 'administrateur-comptes-legacy', optional: true },
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

  const commonPassword = process.env.STAGING_COMMON_PASSWORD?.trim() || null;
  const passwordSeed = process.env.STAGING_E2E_PASSWORD_SEED?.trim() || null;

  if (commonPassword) {
    assert.ok(
      commonPassword.length >= 8,
      'STAGING_COMMON_PASSWORD must contain at least 8 characters.',
    );
  } else {
    assert.ok(
      passwordSeed && Buffer.byteLength(passwordSeed, 'utf8') >= 32,
      'STAGING_E2E_PASSWORD_SEED must contain at least 32 bytes when STAGING_COMMON_PASSWORD is not set.',
    );
  }
  return { secretKey, publicKey, passwordSeed, commonPassword };
}

function accountKey(account) {
  return account.passwordKey ?? account.role;
}

function passwordForAccount(account, seed, commonPassword) {
  if (commonPassword) return commonPassword;
  return createHmac('sha256', seed)
    .update('isieco-staging-e2e:' + accountKey(account))
    .digest('base64url') + 'A1!';
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
  const { secretKey, publicKey, passwordSeed, commonPassword } = validateTargets();

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
  const targets = accounts.flatMap((account) => {
    const user = byEmail.get(account.email);
    if (!user) {
      if (account.optional || account.role === 'SUPERADMIN') {
        return [];
      }
      throw new Error('Missing expected staging account: ' + account.email);
    }
    if (user.app_metadata?.isieco_seed !== SEED_MARKER) {
      throw new Error('Refusing to modify an account without the E2E ownership marker: ' + account.email);
    }
    return [{ ...account, userId: user.id }];
  });

  for (const account of targets) {
    const { data, error } = await admin.auth.admin.updateUserById(account.userId, {
      password: passwordForAccount(account, passwordSeed, commonPassword),
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
      password: passwordForAccount(account, passwordSeed, commonPassword),
    });
    if (error || !data.session) {
      throw new Error(
        'Login verification failed for ' + account.email + ': ' + (error?.message || 'No session returned'),
      );
    }
    await verifier.auth.signOut({ scope: 'local' });
  }

  console.log(`PASS: all ${targets.length} staging E2E accounts were updated and login was verified.`);
  for (const account of targets) {
    console.log(account.role + ': ' + account.email);
  }
  if (commonPassword) {
    console.log('Applied uniform password from STAGING_COMMON_PASSWORD across all targets.');
  } else {
    console.log('Derived passwords were not printed.');
  }
}

main().catch((error) => {
  console.error('STAGING_E2E_PASSWORD_RESET=FAILURE: ' + (error?.stack || error));
  process.exitCode = 1;
});
