import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { CommandCenterController } from './command-center.controller.js';
import { Client } from 'pg';
import {
  COMMAND_CENTER_PG_CLIENT_FACTORY,
  CommandCenterEventsService,
  type CommandCenterListenerClientConfig,
} from './command-center-events.service.js';
import { CommandCenterService } from './command-center.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CommandCenterController],
  providers: [
    CommandCenterService,
    CommandCenterEventsService,
    {
      provide: COMMAND_CENTER_PG_CLIENT_FACTORY,
      useValue: (config: CommandCenterListenerClientConfig) => new Client(config),
    },
  ],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
