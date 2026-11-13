import { Controller, Get, Header, Query, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import type { User } from '@supabase/supabase-js';
import { CommandCenterQueryDto } from './dto/command-center-query.dto.js';
import { CommandCenterOverviewResponseDto } from './dto/command-center-response.dto.js';
import { CommandCenterEventsService } from './command-center-events.service.js';
import { CommandCenterService } from './command-center.service.js';

@ApiTags('command-center')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(
  'AGENT_QUALIFICATION',
  'RESPONSABLE_TRAITEMENT',
  'RESPONSABLE_AFFECTATION',
  'VERIFICATEUR_CLOTURE',
  'GESTIONNAIRE_REFERENTIEL',
  'ADMINISTRATEUR_COMPTES',
)
@Controller('command-center')
export class CommandCenterController {
  constructor(
    private readonly commandCenter: CommandCenterService,
    private readonly commandCenterEvents: CommandCenterEventsService,
  ) {}

  @Sse('events')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({
    summary: 'Diffuse les invalidations de la carte du centre de commandement',
    description: 'Flux Server-Sent Events réservé aux comptes back-office actifs. Les messages ne contiennent aucune donnée métier : ils signalent uniquement qu’une nouvelle lecture de l’API est nécessaire. La connexion est renouvelée toutes les 60 secondes pour réévaluer l’authentification et les habilitations.',
  })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ description: 'Flux SSE command_center_changed et heartbeats.' })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Un rôle back-office autorisé est requis.' })
  streamEvents(): Observable<MessageEvent> {
    return this.commandCenterEvents.stream();
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Fournit les indicateurs opérationnels et les entités géolocalisées',
    description: 'Réservé aux comptes back-office actifs. Les marqueurs sont issus des dossiers ouverts et des signalements non rattachés disposant de coordonnées. Les données personnelles et les identifiants des agents ne sont pas exposés.',
  })
  @ApiOkResponse({ type: CommandCenterOverviewResponseDto })
  @ApiBadRequestResponse({ description: 'Les bornes du viewport doivent être fournies ensemble et respecter les plages latitude/longitude ; le curseur doit être un jeton cartographique valide.' })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Un rôle back-office autorisé est requis.' })
  getOverview(
    @Query() query: CommandCenterQueryDto,
    @CurrentAuthUser() _user: User,
  ) {
    return this.commandCenter.getOverview(query);
  }
}
