import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnvironment } from './env.validation.ts';

const validEnvironment = {
  DATABASE_URL: 'postgresql://isieco:secret@localhost:5432/isieco_report?schema=public',
  DIRECT_URL: 'postgresql://isieco:secret@localhost:5432/isieco_report?schema=public',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'ci-placeholder-public-key',
  PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5173',
  NODE_ENV: 'test',
};

test('accepts a valid API environment without mutating it', () => {
  const environment = { ...validEnvironment };
  assert.deepEqual(validateEnvironment(environment), environment);
});

test('rejects missing required database and Supabase settings', () => {
  assert.throws(
    () =>
      validateEnvironment({
        SUPABASE_URL: validEnvironment.SUPABASE_URL,
        SUPABASE_ANON_KEY: validEnvironment.SUPABASE_ANON_KEY,
      }),
    /DATABASE_URL/u,
  );
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: validEnvironment.DATABASE_URL,
        SUPABASE_URL: validEnvironment.SUPABASE_URL,
      }),
    /SUPABASE_ANON_KEY/u,
  );
});

test('rejects invalid database and Supabase URL protocols', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: 'https://db.example.test',
      }),
    /DATABASE_URL/u,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...validEnvironment,
        SUPABASE_URL: 'ftp://example.supabase.co',
      }),
    /SUPABASE_URL/u,
  );
});

test('rejects an invalid direct database URL and NODE_ENV', () => {
  assert.throws(
    () => validateEnvironment({ ...validEnvironment, DIRECT_URL: 'file:./dev.db' }),
    /DIRECT_URL/u,
  );
  assert.throws(
    () => validateEnvironment({ ...validEnvironment, NODE_ENV: 'staging' }),
    /NODE_ENV/u,
  );
});

test('rejects ports outside the TCP port range', () => {
  assert.throws(
    () => validateEnvironment({ ...validEnvironment, PORT: '70000' }),
    /PORT/u,
  );
});

test('accepts comma-separated HTTP(S) origins and rejects URL paths', () => {
  assert.doesNotThrow(() =>
    validateEnvironment({
      ...validEnvironment,
      WEB_ORIGIN: 'http://localhost:5173,https://admin.example.test',
    }),
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...validEnvironment,
        WEB_ORIGIN: 'https://admin.example.test/dashboard',
      }),
    /WEB_ORIGIN/u,
  );
});

test('never includes secret values in validation errors', () => {
  const secret = 'postgresql://private-user:very-secret@db.example.test/report';
  assert.throws(
    () => validateEnvironment({ ...validEnvironment, DATABASE_URL: secret }),
    (error) => {
      assert.equal(error.message.includes(secret), false);
      assert.match(error.message, /DATABASE_URL/u);
      return true;
    },
  );
});
