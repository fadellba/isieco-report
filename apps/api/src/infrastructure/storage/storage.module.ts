import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseStorageService } from './supabase-storage.service.js';
import { MediaPurgeService } from './media-purge.service.js';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseStorageService, MediaPurgeService],
  exports: [SupabaseStorageService, MediaPurgeService],
})
export class StorageModule {}
