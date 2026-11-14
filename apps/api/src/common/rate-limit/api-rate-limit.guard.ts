import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { User } from '@supabase/supabase-js';
import { API_RATE_LIMIT_KEY, type ApiRateLimitOptions } from './rate-limit.decorator.js';

type AuthenticatedRateLimitRequest = Request & { authUser?: User };

type RateLimitBucket = {
  timestamps: number[];
  lastSeen: number;
};

const MAX_BUCKETS = 20_000;
const STALE_BUCKET_MS = 2 * 60 * 1000;

/**
 * Per-process sliding-window limiter for sensitive API routes.
 * Use a shared store or edge/WAF limiter before running multiple API instances.
 */
@Injectable()
export class ApiRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<ApiRateLimitOptions>(API_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRateLimitRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const identity = request.authUser?.id ?? request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const route = request.route?.path
      ? `${request.baseUrl}${request.route.path}`
      : request.path;
    const key = `${identity}:${request.method}:${route}`;
    const now = Date.now();
    const activeWindowStart = now - options.windowMs;
    const bucket = this.buckets.get(key) ?? { timestamps: [], lastSeen: now };
    bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > activeWindowStart);
    bucket.lastSeen = now;

    if (bucket.timestamps.length >= options.limit) {
      const oldestTimestamp = bucket.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestTimestamp + options.windowMs - now) / 1000),
      );
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Trop de requêtes. Réessayez après le délai indiqué.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
    this.pruneStaleBuckets(now);

    response.setHeader('RateLimit-Limit', String(options.limit));
    response.setHeader('RateLimit-Remaining', String(Math.max(0, options.limit - bucket.timestamps.length)));
    return true;
  }

  private pruneStaleBuckets(now: number): void {
    if (this.buckets.size <= MAX_BUCKETS) return;

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastSeen > STALE_BUCKET_MS) this.buckets.delete(key);
    }

    if (this.buckets.size <= MAX_BUCKETS) return;
    const oldestFirst = [...this.buckets.entries()].sort((left, right) => left[1].lastSeen - right[1].lastSeen);
    for (const [key] of oldestFirst.slice(0, this.buckets.size - MAX_BUCKETS)) {
      this.buckets.delete(key);
    }
  }
}
