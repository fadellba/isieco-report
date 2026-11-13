import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { CommandCenterController } from './command-center.controller.js';
import { CommandCenterService } from './command-center.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
