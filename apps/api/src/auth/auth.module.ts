import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { SupabaseAuthService } from './supabase-auth.service.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  providers: [SupabaseAuthService, SupabaseAuthGuard, RolesGuard],
  exports: [SupabaseAuthService, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
