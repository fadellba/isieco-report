import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
