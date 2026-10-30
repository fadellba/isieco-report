import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { ReferentialsController } from './referentials.controller.js';
import { ReferentialsService } from './referentials.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReferentialsController],
  providers: [ReferentialsService],
  exports: [ReferentialsService],
})
export class ReferentialsModule {}
