import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import { InterventionResponseDto } from './dto/intervention-response.dto.js';
import { SubmitInterventionDto } from './dto/submit-intervention.dto.js';
import { InterventionsService } from './interventions.service.js';

@ApiTags('interventions')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('AGENT_TERRAIN')
@Controller('interventions')
export class InterventionsController {
  constructor(private readonly interventions: InterventionsService) {}

  @Get('team/:idEquipe')
  @ApiOperation({ summary: 'Consulte les interventions des affectations actives de son équipe' })
  @ApiParam({ name: 'idEquipe', format: 'uuid' })
  @ApiOkResponse({ type: [InterventionResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Une appartenance active à l’équipe est requise.' })
  @ApiNotFoundResponse({ description: 'Équipe introuvable.' })
  listTeam(
    @Param('idEquipe', ParseUUIDPipe) idEquipe: string,
    @CurrentAuthUser() user: User,
  ) {
    return this.interventions.listTeamInterventions(idEquipe, user.id);
  }

  @Post('assignments/:idAffectation/start')
  @ApiOperation({
    summary: 'Démarre une intervention sur une affectation acceptée',
    description: 'L’agent doit appartenir à l’équipe affectée. Une nouvelle intervention n’est autorisée qu’après une décision de reprise du vérificateur.',
  })
  @ApiParam({ name: 'idAffectation', format: 'uuid' })
  @ApiCreatedResponse({ type: InterventionResponseDto })
  @ApiConflictResponse({ description: 'Affectation non acceptée, contenu inactif, intervention déjà ouverte ou reprise non autorisée.' })
  @ApiNotFoundResponse({ description: 'Affectation introuvable.' })
  @ApiForbiddenResponse({ description: 'Rôle AGENT_TERRAIN et appartenance active à l’équipe requis.' })
  start(
    @Param('idAffectation', ParseUUIDPipe) idAffectation: string,
    @CurrentAuthUser() user: User,
  ) {
    return this.interventions.startIntervention(idAffectation, user.id);
  }

  @Post(':idIntervention/submit')
  @ApiOperation({
    summary: 'Soumet le compte rendu et le résultat d’une intervention',
    description: 'Un résultat partiel ou impossible exige un motif d’exception. Seul l’agent qui a démarré l’intervention peut soumettre son compte rendu.',
  })
  @ApiParam({ name: 'idIntervention', format: 'uuid' })
  @ApiOkResponse({ type: InterventionResponseDto })
  @ApiBadRequestResponse({ description: 'Compte rendu ou motif d’exception invalide.' })
  @ApiConflictResponse({ description: 'Intervention ou affectation non ouverte.' })
  @ApiNotFoundResponse({ description: 'Intervention introuvable.' })
  @ApiForbiddenResponse({ description: 'Rôle AGENT_TERRAIN, auteur initial et appartenance active à l’équipe requis.' })
  submit(
    @Param('idIntervention', ParseUUIDPipe) idIntervention: string,
    @Body() dto: SubmitInterventionDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.interventions.submitIntervention(idIntervention, dto, user.id);
  }
}
