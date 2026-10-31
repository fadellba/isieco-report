import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
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
import { AssignmentsService } from './assignments.service.js';
import { AssignmentListResponseDto, AssignmentResponseDto, EligibleTeamResponseDto, PendingAssignmentContentListResponseDto } from './dto/assignment-response.dto.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { ListAssignmentsQueryDto } from './dto/list-assignments-query.dto.js';
import { ReassignAssignmentDto } from './dto/reassign-assignment.dto.js';
import { RespondAssignmentDto } from './dto/respond-assignment.dto.js';

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get('pending-contents')
  @Roles('RESPONSABLE_AFFECTATION')
  @ApiOperation({ summary: 'Liste les contenus disponibles pour une nouvelle affectation' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: PendingAssignmentContentListResponseDto })
  @ApiForbiddenResponse({ description: 'Rôle RESPONSABLE_AFFECTATION requis.' })
  listPendingContents(@Query() query: ListAssignmentsQueryDto) {
    return this.assignments.listPendingContents(query);
  }

  @Get('eligible-teams/:idTypeDechet')
  @Roles('RESPONSABLE_AFFECTATION')
  @ApiOperation({ summary: 'Liste les équipes actives compétentes et disponibles pour un type de déchet' })
  @ApiParam({ name: 'idTypeDechet', format: 'uuid' })
  @ApiOkResponse({ type: [EligibleTeamResponseDto] })
  @ApiForbiddenResponse({ description: 'Rôle RESPONSABLE_AFFECTATION requis.' })
  listEligibleTeams(@Param('idTypeDechet', ParseUUIDPipe) idTypeDechet: string) {
    return this.assignments.listEligibleTeams(idTypeDechet);
  }

  @Get()
  @Roles('RESPONSABLE_AFFECTATION')
  @ApiOperation({ summary: 'Liste les affectations et leur état opérationnel' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: AssignmentListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Rôle RESPONSABLE_AFFECTATION requis.' })
  list(@Query() query: ListAssignmentsQueryDto) {
    return this.assignments.listAssignments(query);
  }

  @Get('team/:idEquipe')
  @Roles('AGENT_TERRAIN')
  @ApiOperation({ summary: 'Consulte les affectations actives de sa propre équipe' })
  @ApiParam({ name: 'idEquipe', format: 'uuid' })
  @ApiOkResponse({ type: [AssignmentResponseDto] })
  @ApiForbiddenResponse({ description: 'Rôle AGENT_TERRAIN et appartenance active à cette équipe requis.' })
  @ApiNotFoundResponse({ description: 'Équipe introuvable.' })
  listTeam(
    @Param('idEquipe', ParseUUIDPipe) idEquipe: string,
    @CurrentAuthUser() user: User,
  ) {
    return this.assignments.listTeamAssignments(idEquipe, user.id);
  }

  @Post()
  @Roles('RESPONSABLE_AFFECTATION')
  @ApiOperation({
    summary: 'Affecte un contenu de dossier à une équipe compétente',
    description: 'Contrôle l’état du dossier et du contenu, l’état actif de l’équipe, la compétence valide et la disponibilité courante. Une clé Idempotency-Key est obligatoire.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Clé stable de 8 à 128 caractères pour rejouer sans doublon.' })
  @ApiCreatedResponse({ type: AssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Données invalides ou clé idempotente manquante.' })
  @ApiConflictResponse({ description: 'Équipe non éligible, compétence absente, indisponibilité ou affectation déjà active.' })
  @ApiNotFoundResponse({ description: 'Contenu, dossier ou équipe introuvable.' })
  @ApiForbiddenResponse({ description: 'Rôle RESPONSABLE_AFFECTATION requis.' })
  create(
    @Body() dto: CreateAssignmentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentAuthUser() user: User,
  ) {
    return this.assignments.createAssignment(dto, user.id, idempotencyKey);
  }

  @Post(':idAffectation/response')
  @Roles('AGENT_TERRAIN')
  @ApiOperation({
    summary: 'Accepte ou refuse une affectation au nom de son équipe',
    description: 'Seul un membre actif de l’équipe affectée peut répondre. Un refus doit être motivé et clôture l’affectation afin de permettre une réaffectation.',
  })
  @ApiParam({ name: 'idAffectation', format: 'uuid' })
  @ApiOkResponse({ type: AssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Décision ou motif de refus invalide.' })
  @ApiConflictResponse({ description: 'Affectation déjà répondue ou contenu plus éligible.' })
  @ApiNotFoundResponse({ description: 'Affectation introuvable.' })
  @ApiForbiddenResponse({ description: 'Rôle AGENT_TERRAIN et appartenance active à l’équipe requis.' })
  respond(
    @Param('idAffectation', ParseUUIDPipe) idAffectation: string,
    @Body() dto: RespondAssignmentDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.assignments.respondToAssignment(idAffectation, dto, user.id);
  }

  @Post(':idAffectation/reassign')
  @Roles('RESPONSABLE_AFFECTATION')
  @ApiOperation({
    summary: 'Réaffecte un contenu à une autre équipe',
    description: 'Autorise la réaffectation d’une affectation refusée ou encore en attente. Une affectation déjà prise en charge ou ayant une intervention est protégée.',
  })
  @ApiParam({ name: 'idAffectation', format: 'uuid' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Clé stable de 8 à 128 caractères pour rejouer sans doublon.' })
  @ApiCreatedResponse({ type: AssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Motif ou équipe cible invalide.' })
  @ApiConflictResponse({ description: 'Dossier/content fermé, intervention existante ou affectation non réaffectable.' })
  @ApiNotFoundResponse({ description: 'Affectation ou équipe introuvable.' })
  reassign(
    @Param('idAffectation', ParseUUIDPipe) idAffectation: string,
    @Body() dto: ReassignAssignmentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentAuthUser() user: User,
  ) {
    return this.assignments.reassign(idAffectation, dto, user.id, idempotencyKey);
  }
}
