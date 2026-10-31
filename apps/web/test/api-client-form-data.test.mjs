import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient } from '@isieco/api-client';

test('sends FormData without forcing a JSON Content-Type and preserves bearer auth', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init };
    return new Response(JSON.stringify({ idPhoto: 'photo-1' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const client = createApiClient({
      baseUrl: 'https://api.example.test/api/v1/',
      getAccessToken: async () => 'test-access-token',
    });
    const body = new FormData();
    body.append('file', new Blob(['image-bytes'], { type: 'image/jpeg' }), 'proof.jpg');
    body.append('contextePhoto', 'Après intervention');

    const result = await client.request('/interventions/123/photos', {
      method: 'POST',
      body,
    });

    assert.deepEqual(result, { idPhoto: 'photo-1' });
    assert.equal(captured.input, 'https://api.example.test/api/v1/interventions/123/photos');
    assert.equal(new Headers(captured.init.headers).get('Content-Type'), null);
    assert.equal(new Headers(captured.init.headers).get('Authorization'), 'Bearer test-access-token');
    assert.equal(captured.init.body, body);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
