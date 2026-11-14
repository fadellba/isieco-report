import { SetMetadata } from '@nestjs/common';

export const API_RATE_LIMIT_KEY = 'api_rate_limit';

export interface ApiRateLimitOptions {
  limit: number;
  windowMs: number;
}

export const ApiRateLimit = (options: ApiRateLimitOptions) =>
  SetMetadata(API_RATE_LIMIT_KEY, options);
