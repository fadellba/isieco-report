import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import { CloseWasteTypeDto } from './dto/close-waste-type.dto.js';
import { CreateCommuneDto } from './dto/create-commune.dto.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { CreateRegionDto } from './dto/create-region.dto.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { CreateWasteTypeDto } from './dto/create-waste-type.dto.js';
import { UpdateCommuneDto, UpdateDepartmentDto } from './dto/update-geography.dto.js';
import { UpdateRegionDto } from './dto/update-region.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { UpdateWasteTypeDto } from './dto/update-waste-type.dto.js';
import { CreateTeamMembershipDto, EndTeamMembershipDto } from './dto/team-membership.dto.js';
import { CreateTeamSkillDto, EndTeamSkillDto } from './dto/team-skill.dto.js';
import { SetTeamAvailabilityDto } from './dto/team-availability.dto.js';
import { CreateTeamDelegationDto, EndTeamDelegationDto } from './dto/team-delegation.dto.js';
import { ReferentialsService } from './referentials.service.js';

@ApiTags('referentials')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('GESTIONNAIRE_REFERENTIEL')
@Controller('referentials')
export class ReferentialsController {
  constructor(private readonly referentials: ReferentialsService) {}

  @Get('waste-types')
  @ApiOperation({ summary: 'Liste les types de déchets de référence' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Liste des types de déchets et leurs périodes de validité.' })
  @ApiUnauthorizedResponse({ description: 'Jeton absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Rôle GESTIONNAIRE_REFERENTIEL requis.' })
  listWasteTypes(@Query('includeInactive') includeInactive?: string) {
    return this.referentials.listWasteTypes(includeInactive === 'true');
  }

  @Post('waste-types')
  @ApiOperation({ summary: 'Crée un type de déchet' })
  @ApiCreatedResponse({ description: 'Type de déchet créé et journalisé.' })
  @ApiBadRequestResponse({ description: 'Données ou date de validité invalides.' })
  @ApiConflictResponse({ description: 'Code de type déjà utilisé.' })
  createWasteType(@Body() dto: CreateWasteTypeDto, @CurrentAuthUser() user: User) {
    return this.referentials.createWasteType(dto, user.id);
  }

  @Patch('waste-types/:id')
  @ApiOperation({ summary: 'Modifie les libellés et attributs d’un type de déchet sans changer son identifiant' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Type de déchet modifié et journalisé.' })
  @ApiNotFoundResponse({ description: 'Type de déchet introuvable.' })
  updateWasteType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWasteTypeDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.updateWasteType(id, dto, user.id);
  }

  @Post('waste-types/:id/close')
  @ApiOperation({ summary: 'Clôture la période de validité d’un type de déchet' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Période de validité clôturée et événement d’audit écrit.' })
  @ApiBadRequestResponse({ description: 'La date de fin précède la date de début.' })
  @ApiConflictResponse({ description: 'Le type de déchet est déjà clôturé ou a été modifié simultanément.' })
  closeWasteType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseWasteTypeDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.closeWasteType(id, dto.dateFinValidite, user.id);
  }

  @Get('regions')
  @ApiOperation({ summary: 'Liste les régions, départements et communes' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Arborescence géographique disponible.' })
  listRegions(@Query('includeInactive') includeInactive?: string) {
    return this.referentials.listRegions(includeInactive === 'true');
  }

  @Post('regions')
  @ApiOperation({ summary: 'Crée une région' })
  @ApiCreatedResponse({ description: 'Région créée.' })
  @ApiConflictResponse({ description: 'Code ou nom de région déjà utilisé.' })
  createRegion(@Body() dto: CreateRegionDto) {
    return this.referentials.createRegion(dto);
  }

  @Patch('regions/:id')
  @ApiOperation({ summary: 'Renomme ou désactive une région sans la supprimer' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Région mise à jour.' })
  @ApiNotFoundResponse({ description: 'Région introuvable.' })
  updateRegion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRegionDto) {
    return this.referentials.updateRegion(id, dto);
  }

  @Post('regions/:regionId/departments')
  @ApiOperation({ summary: 'Ajoute un département à une région active' })
  @ApiParam({ name: 'regionId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Département créé.' })
  @ApiConflictResponse({ description: 'Région inactive ou code/nom déjà utilisé.' })
  @ApiNotFoundResponse({ description: 'Région introuvable.' })
  createDepartment(
    @Param('regionId', ParseUUIDPipe) regionId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.referentials.createDepartment(regionId, dto);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Renomme ou désactive un département sans le supprimer' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Département mis à jour.' })
  @ApiNotFoundResponse({ description: 'Département introuvable.' })
  updateDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.referentials.updateDepartment(id, dto);
  }

  @Post('departments/:departmentId/communes')
  @ApiOperation({ summary: 'Ajoute une commune à un département actif' })
  @ApiParam({ name: 'departmentId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Commune créée.' })
  @ApiConflictResponse({ description: 'Département ou région inactive, ou code/nom déjà utilisé.' })
  @ApiNotFoundResponse({ description: 'Département introuvable.' })
  createCommune(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: CreateCommuneDto,
  ) {
    return this.referentials.createCommune(departmentId, dto);
  }

  @Patch('communes/:id')
  @ApiOperation({ summary: 'Renomme ou désactive une commune sans la supprimer' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Commune mise à jour.' })
  @ApiNotFoundResponse({ description: 'Commune introuvable.' })
  updateCommune(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCommuneDto) {
    return this.referentials.updateCommune(id, dto);
  }

  @Get('teams')
  @ApiOperation({ summary: 'Liste les équipes, appartenances actives, compétences et disponibilité courante' })
  @ApiOkResponse({ description: 'Équipes et données opérationnelles associées.' })
  listTeams() {
    return this.referentials.listTeams();
  }

  @Post('teams')
  @ApiOperation({ summary: 'Crée une équipe' })
  @ApiCreatedResponse({ description: 'Équipe créée et journalisée.' })
  createTeam(@Body() dto: CreateTeamDto, @CurrentAuthUser() user: User) {
    return this.referentials.createTeam(dto, user.id);
  }

  @Patch('teams/:teamId')
  @ApiOperation({ summary: 'Met à jour une équipe sans supprimer son historique' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse({ description: 'Équipe mise à jour et journalisée.' })
  @ApiNotFoundResponse({ description: 'Équipe introuvable.' })
  updateTeam(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: UpdateTeamDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.updateTeam(teamId, dto, user.id);
  }

  @Post('teams/:teamId/memberships')
  @ApiOperation({ summary: 'Ajoute un membre à une équipe pour une période donnée' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Appartenance créée et événement d’audit écrit.' })
  @ApiConflictResponse({ description: 'Compte inactif, appartenance active existante ou conflit concurrent.' })
  @ApiNotFoundResponse({ description: 'Équipe ou utilisateur introuvable.' })
  addMembership(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateTeamMembershipDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.addMembership(teamId, dto, user.id);
  }

  @Post('teams/:teamId/memberships/close')
  @ApiOperation({ summary: 'Clôture une appartenance précise à une équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse({ description: 'Appartenance clôturée et journalisée.' })
  @ApiConflictResponse({ description: 'Appartenance déjà clôturée ou modifiée simultanément.' })
  @ApiNotFoundResponse({ description: 'Appartenance introuvable.' })
  endMembership(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: EndTeamMembershipDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.endMembership(teamId, dto, user.id);
  }

  @Post('teams/:teamId/skills')
  @ApiOperation({ summary: 'Déclare une compétence d’équipe pour un type de déchet' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Compétence créée, validée et journalisée.' })
  @ApiConflictResponse({ description: 'Compétence déjà active ou période incompatible avec le type de déchet.' })
  @ApiNotFoundResponse({ description: 'Équipe ou type de déchet introuvable.' })
  addSkill(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateTeamSkillDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.addSkill(teamId, dto, user.id);
  }

  @Post('teams/:teamId/skills/close')
  @ApiOperation({ summary: 'Clôture une compétence d’équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse({ description: 'Compétence clôturée et journalisée.' })
  @ApiConflictResponse({ description: 'Compétence déjà clôturée ou conflit concurrent.' })
  @ApiNotFoundResponse({ description: 'Compétence introuvable.' })
  endSkill(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: EndTeamSkillDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.endSkill(teamId, dto, user.id);
  }

  @Put('teams/:teamId/availability')
  @ApiOperation({ summary: 'Met à jour la disponibilité courante et ajoute une ligne d’historique' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse({ description: 'Disponibilité courante et historique mis à jour de façon atomique.' })
  @ApiBadRequestResponse({ description: 'Date de validité invalide.' })
  @ApiNotFoundResponse({ description: 'Équipe introuvable.' })
  setAvailability(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: SetTeamAvailabilityDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.setAvailability(teamId, dto, user.id);
  }

  @Get('teams/:teamId/availability/history')
  @ApiOperation({ summary: 'Consulte l’historique des disponibilités d’une équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse({ description: 'Historique ordonné du plus récent au plus ancien.' })
  @ApiNotFoundResponse({ description: 'Équipe introuvable.' })
  availabilityHistory(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.referentials.availabilityHistory(teamId);
  }

  @Post('teams/:teamId/delegations')
  @ApiOperation({ summary: 'Délègue une décision à un membre de l’équipe pour une période donnée' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Délégation créée et journalisée.' })
  @ApiBadRequestResponse({ description: 'Période de délégation invalide.' })
  @ApiConflictResponse({ description: 'La période de délégation dépasse l’appartenance ou une délégation identique existe.' })
  @ApiNotFoundResponse({ description: 'Équipe ou appartenance introuvable.' })
  createDelegation(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreateTeamDelegationDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.createDelegation(teamId, dto, user.id);
  }

  @Post('teams/:teamId/delegations/:delegationId/close')
  @ApiOperation({ summary: 'Clôture une délégation d’équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiParam({ name: 'delegationId', format: 'uuid' })
  @ApiOkResponse({ description: 'Délégation clôturée et journalisée.' })
  @ApiNotFoundResponse({ description: 'Délégation introuvable.' })
  @ApiConflictResponse({ description: 'Délégation déjà clôturée.' })
  endDelegation(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('delegationId', ParseUUIDPipe) delegationId: string,
    @Body() dto: EndTeamDelegationDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.referentials.endDelegation(teamId, delegationId, dto, user.id);
  }
}
