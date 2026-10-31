import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { QualificationController } from './qualification.controller.js';
import { QualificationService } from './qualification.service.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [QualificationController],
  providers: [QualificationService],
  exports: [QualificationService],
})
export class QualificationModule {}
