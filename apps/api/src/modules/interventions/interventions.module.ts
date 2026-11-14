import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { ApiRateLimitGuard } from '../../common/rate-limit/api-rate-limit.guard.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { InterventionsController } from './interventions.controller.js';
import { InterventionsService } from './interventions.service.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [InterventionsController],
  providers: [InterventionsService, ApiRateLimitGuard],
  exports: [InterventionsService],
})
export class InterventionsModule {}
