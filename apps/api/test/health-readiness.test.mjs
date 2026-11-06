import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../dist/health/health.controller.js';

test('health readiness succeeds when the database answers', async () => {
  const controller = new HealthController({ $queryRawUnsafe: async () => [{ '?column?': 1 }] });
  const result = await controller.readiness();
  assert.equal(result.status, 'ok');
  assert.equal(result.checks.database, 'ok');
});

test('health readiness returns 503 when the database is unavailable', async () => {
  const controller = new HealthController({ $queryRawUnsafe: async () => { throw new Error('connection refused'); } });
  await assert.rejects(
    controller.readiness(),
    (error) => error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});
