import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';
import { SupabaseAuthService } from './supabase-auth.service.js';

export type AuthenticatedRequest = Request & { authUser: User; authToken: string };

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseAuth: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) throw new UnauthorizedException('Un jeton Bearer est requis.');
    request.authToken = match[1];
    request.authUser = await this.supabaseAuth.validateAccessToken(match[1]);
    return true;
  }
}
