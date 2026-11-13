import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { firstValueFrom, filter, take } from 'rxjs';
import { CommandCenterEventsService } from '../dist/modules/command-center/command-center-events.service.js';

test('forwards only minimal command-center invalidations from PostgreSQL notifications', async () => {
  const previousDirectUrl = process.env.DIRECT_URL;
  const previousOpenApiFlag = process.env.OPENAPI_GENERATION;
  process.env.DIRECT_URL = 'postgresql://listener:listener-password@localhost:5432/isieco_test';
  delete process.env.OPENAPI_GENERATION;

  class FakePgClient extends EventEmitter {
    queries = [];
    async connect() {}
    async query(query) { this.queries.push(query); }
    async end() {}
  }

  const client = new FakePgClient();
  let suppliedConfig;
  const service = new CommandCenterEventsService((config) => {
    suppliedConfig = config;
    return client;
  });

  try {
    await service.onModuleInit();
    assert.equal(suppliedConfig.connectionString, process.env.DIRECT_URL);
    assert.equal(client.queries.includes('LISTEN command_center_changed'), true);

    const eventPromise = firstValueFrom(
      service.stream().pipe(
        filter((event) => event.type === 'command_center_changed'),
        take(1),
      ),
    );
    client.emit('notification', { channel: 'another_channel', payload: '999' });
    client.emit('notification', { channel: 'command_center_changed', payload: '42' });

    const event = await eventPromise;
    assert.deepEqual(event.data, { sequence: '42' });
  } finally {
    await service.onModuleDestroy();
    if (previousDirectUrl === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = previousDirectUrl;
    if (previousOpenApiFlag === undefined) delete process.env.OPENAPI_GENERATION;
    else process.env.OPENAPI_GENERATION = previousOpenApiFlag;
  }
});
