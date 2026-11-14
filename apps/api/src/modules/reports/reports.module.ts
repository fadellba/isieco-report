import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { ApiRateLimitGuard } from '../../common/rate-limit/api-rate-limit.guard.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ReportsController],
  providers: [ReportsService, ApiRateLimitGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
