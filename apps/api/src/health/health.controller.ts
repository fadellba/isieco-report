import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Vérifie que le processus API répond' })
  @ApiOkResponse({ description: 'Le processus API répond et retourne son état courant.' })
  check() {
    return { status: 'ok', service: 'isieco-api', timestamp: new Date().toISOString() };
  }
}
