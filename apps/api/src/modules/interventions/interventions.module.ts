import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { InterventionsController } from './interventions.controller.js';
import { InterventionsService } from './interventions.service.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [InterventionsController],
  providers: [InterventionsService],
  exports: [InterventionsService],
})
export class InterventionsModule {}
