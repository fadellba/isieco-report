import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Vérifie que le processus API répond' })
  @ApiOkResponse({ description: 'Le processus API répond et retourne son état courant.' })
  check() {
    return { status: 'ok', service: 'isieco-api', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Vérifie que l’API peut traiter des requêtes' })
  @ApiOkResponse({ description: 'La base de données est joignable.' })
  @ApiServiceUnavailableResponse({ description: 'La base de données est indisponible.' })
  async readiness() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ok', service: 'isieco-api', checks: { database: 'ok' }, timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'isieco-api',
        checks: { database: 'unavailable' },
      });
    }
  }
}
