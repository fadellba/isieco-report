import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CasesService } from './cases.service.js';
import { AttachReportDto } from './dto/attach-report.dto.js';
import { CaseListResponseDto, CaseResponseDto } from './dto/case-response.dto.js';
import { CreateCaseFromReportDto } from './dto/create-case-from-report.dto.js';
import { DetachReportDto } from './dto/detach-report.dto.js';
import { ListCasesQueryDto } from './dto/list-cases-query.dto.js';
import { UpdateCaseLocationDto } from './dto/update-case-location.dto.js';
import { UpdateCasePriorityDto } from './dto/update-case-priority.dto.js';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('RESPONSABLE_TRAITEMENT')
@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get('qualified-reports')
  @ApiOperation({
    summary: 'Liste les signalements qualifiés et non encore rattachés à un dossier',
    description: 'File réservée au responsable de traitement pour constituer de nouveaux dossiers.',
  })
  @ApiOkResponse({ description: 'Signalements qualifiés disponibles, avec les catégories retenues et le propriétaire.' })
  @ApiForbiddenResponse({ description: 'Rôle RESPONSABLE_TRAITEMENT requis.' })
  listQualifiedReports(@Query() query: ListCasesQueryDto) {
    return this.cases.listQualifiedUnassignedReports(query);
  }

  @Get()
  @ApiOperation({ summary: 'Liste les dossiers de traitement' })
  @ApiOkResponse({ type: CaseListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Rôle RESPONSABLE_TRAITEMENT requis.' })
  list(@Query() query: ListCasesQueryDto) {
    return this.cases.listCases(query);
  }

  @Get(':idDossier/history')
  @ApiOperation({ summary: 'Consulte l’historique métier d’un dossier' })
  @ApiParam({ name: 'idDossier', format: 'uuid' })
  @ApiOkResponse({ description: 'Événements métier du dossier, du plus récent au plus ancien.' })
  @ApiNotFoundResponse({ description: 'Dossier introuvable.' })
  getHistory(@Param('idDossier', ParseUUIDPipe) idDossier: string) {
    return this.cases.getCaseHistory(idDossier);
  }

  @Get(':idDossier')
  @ApiOperation({ summary: 'Consulte un dossier, ses contenus et ses rattachements' })
  @ApiParam({ name: 'idDossier', format: 'uuid' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Dossier introuvable.' })
  get(@Param('idDossier', ParseUUIDPipe) idDossier: string) {
    return this.cases.getCase(idDossier);
  }

  @Post('from-reports/:idSignalement')
  @ApiOperation({
    summary: 'Crée un dossier à partir d’un signalement qualifié',
    description: 'Crée le dossier, le rattachement initial, les contenus et leurs provenances dans une transaction sérialisable.',
  })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiCreatedResponse({ type: CaseResponseDto })
  @ApiBadRequestResponse({ description: 'Résumé ou priorité invalide.' })
  @ApiConflictResponse({ description: 'Signalement non qualifié, catégorie inactive ou conflit de rattachement.' })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  createFromReport(
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @Body() dto: CreateCaseFromReportDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.cases.createFromReport(idSignalement, dto, user.id);
  }

  @Patch(':idDossier/priority')
  @ApiOperation({ summary: 'Modifie la priorité avec justification et historisation' })
  @ApiParam({ name: 'idDossier', format: 'uuid' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiBadRequestResponse({ description: 'Priorité ou justification invalide.' })
  @ApiConflictResponse({ description: 'Dossier clôturé ou modification concurrente.' })
  @ApiNotFoundResponse({ description: 'Dossier introuvable.' })
  updatePriority(
    @Param('idDossier', ParseUUIDPipe) idDossier: string,
    @Body() dto: UpdateCasePriorityDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.cases.updatePriority(idDossier, dto, user.id);
  }

  @Patch(':idDossier/location')
  @ApiOperation({ summary: 'Modifie la localisation avec justification et historisation' })
  @ApiParam({ name: 'idDossier', format: 'uuid' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiBadRequestResponse({ description: 'Coordonnées ou commune invalides.' })
  @ApiConflictResponse({ description: 'Dossier clôturé ou modification concurrente.' })
  @ApiNotFoundResponse({ description: 'Dossier introuvable.' })
  updateLocation(
    @Param('idDossier', ParseUUIDPipe) idDossier: string,
    @Body() dto: UpdateCaseLocationDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.cases.updateLocation(idDossier, dto, user.id);
  }

  @Post(':idDossier/reports/:idSignalement/attach')
  @ApiOperation({ summary: 'Rattache un signalement qualifié à un dossier existant' })
  @ApiParam({ name: 'idDossier', format: 'uuid' })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiCreatedResponse({ type: CaseResponseDto })
  @ApiBadRequestResponse({ description: 'Motif de rattachement invalide.' })
  @ApiConflictResponse({ description: 'Signalement déjà rattaché, dossier clôturé ou catégorie redondante.' })
  @ApiNotFoundResponse({ description: 'Dossier ou signalement introuvable.' })
  attachReport(
    @Param('idDossier', ParseUUIDPipe) idDossier: string,
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @Body() dto: AttachReportDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.cases.attachReport(idDossier, idSignalement, dto, user.id);
  }

  @Post(':idDossier/reports/:idSignalement/detach')
  @ApiOperation({ summary: 'Détache un signalement et ferme ses provenances actives' })
  @ApiParam({ name: 'idDossier', format: 'uuid' })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiBadRequestResponse({ description: 'Motif de détachement invalide.' })
  @ApiConflictResponse({ description: 'Dossier clôturé ou rattachement modifié simultanément.' })
  @ApiNotFoundResponse({ description: 'Dossier ou rattachement actif introuvable.' })
  detachReport(
    @Param('idDossier', ParseUUIDPipe) idDossier: string,
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @Body() dto: DetachReportDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.cases.detachReport(idDossier, idSignalement, dto, user.id);
  }
}
