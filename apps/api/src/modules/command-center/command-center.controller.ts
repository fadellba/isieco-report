import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
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
  constructor(private readonly commandCenter: CommandCenterService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Fournit les indicateurs opérationnels et les entités géolocalisées',
    description: 'Réservé aux comptes back-office actifs. Les marqueurs sont issus des dossiers ouverts et des signalements non rattachés disposant de coordonnées. Les données personnelles et les identifiants des agents ne sont pas exposés.',
  })
  @ApiOkResponse({ type: CommandCenterOverviewResponseDto })
  @ApiBadRequestResponse({ description: 'Le viewport est invalide : les quatre bornes minLat, maxLat, minLon et maxLon doivent être fournies ensemble ; minLat doit être inférieur ou égal à maxLat.' })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Un rôle back-office autorisé est requis.' })
  getOverview(
    @Query() query: CommandCenterQueryDto,
    @CurrentAuthUser() _user: User,
  ) {
    return this.commandCenter.getOverview(query);
  }
}
