import assert from 'node:assert/strict';
import 'reflect-metadata';
import test from 'node:test';
import { Reflector } from '@nestjs/core';
import { ApiRateLimitGuard } from '../dist/common/rate-limit/api-rate-limit.guard.js';
import { API_RATE_LIMIT_KEY } from '../dist/common/rate-limit/rate-limit.decorator.js';

function createContext({ userId, limit = 2, routePath = '/reports' }) {
  const handler = () => undefined;
  const controller = class ReportsController {};
  Reflect.defineMetadata(API_RATE_LIMIT_KEY, { limit, windowMs: 60_000 }, handler);

  const headers = {};
  const request = {
    authUser: { id: userId },
    method: 'POST',
    baseUrl: '/api/v1',
    path: '/api/v1/reports',
    route: { path: routePath },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  };
  const response = { setHeader: (name, value) => { headers[name] = value; } };
  return {
    headers,
    context: {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    },
  };
}

test('limits requests by authenticated user and route and returns HTTP 429 with Retry-After', () => {
  const guard = new ApiRateLimitGuard(new Reflector());
  const { context, headers } = createContext({ userId: 'citizen-1', limit: 2 });

  assert.equal(guard.canActivate(context), true);
  assert.equal(guard.canActivate(context), true);
  assert.equal(headers['RateLimit-Remaining'], '0');
  assert.throws(
    () => guard.canActivate(context),
    (error) => error?.getStatus?.() === 429 && Number(headers['Retry-After']) >= 1,
  );
});

test('keeps rate-limit buckets isolated by user and route', () => {
  const guard = new ApiRateLimitGuard(new Reflector());
  const first = createContext({ userId: 'citizen-1', limit: 1 });
  const otherUser = createContext({ userId: 'citizen-2', limit: 1 });
  const otherRoute = createContext({ userId: 'citizen-1', limit: 1, routePath: '/reports/:id/photos' });

  assert.equal(guard.canActivate(first.context), true);
  assert.equal(guard.canActivate(otherUser.context), true);
  assert.equal(guard.canActivate(otherRoute.context), true);
  assert.throws(() => guard.canActivate(first.context), (error) => error?.getStatus?.() === 429);
});
