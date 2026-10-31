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
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports-query.dto.js';
import { ReportsService } from './reports.service.js';
import { ReportListResponseDto, ReportResponseDto } from './dto/report-response.dto.js';
import { CreateSupplementResponseDto } from './dto/create-supplement-response.dto.js';
import { ReportSupplementListResponseDto, SupplementAnswerDto } from './dto/report-supplement-response.dto.js';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('CITOYEN')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Dépose un signalement citoyen',
    description:
      'La soumission est idempotente. Une même clé et un même corps retournent le signalement initial ; réutiliser la clé avec un corps différent renvoie 409.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Clé opaque de 8 à 128 caractères générée par le client et conservée en cas de retry.',
  })
  @ApiCreatedResponse({ type: ReportResponseDto, description: 'Signalement créé, contenus liés et événement métier journalisé.' })
  @ApiBadRequestResponse({ description: 'Données invalides, localisation incohérente ou référentiel inactif.' })
  @ApiConflictResponse({ description: 'Clé idempotente réutilisée avec un autre contenu ou conflit concurrent.' })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Un compte citoyen actif est requis.' })
  create(
    @Body() dto: CreateReportDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentAuthUser() user: User,
  ) {
    return this.reports.createReport(dto, user.id, idempotencyKey ?? '');
  }

  @Get()
  @ApiOperation({ summary: 'Liste les signalements du citoyen connecté' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: ReportListResponseDto, description: 'Page de signalements appartenant exclusivement au compte connecté.' })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  listMine(@Query() query: ListReportsQueryDto, @CurrentAuthUser() user: User) {
    return this.reports.listMine(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulte un signalement appartenant au citoyen connecté' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ReportResponseDto, description: 'Détail du signalement et contenus communicables à son auteur.' })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  getMine(@Param('id', ParseUUIDPipe) id: string, @CurrentAuthUser() user: User) {
    return this.reports.getMine(id, user.id);
  }
  @Get(':id/supplements')
  @ApiOperation({ summary: 'Liste les demandes de complément liées à un signalement du citoyen connecté' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ReportSupplementListResponseDto })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  listMySupplements(@Param('id', ParseUUIDPipe) id: string, @CurrentAuthUser() user: User) {
    return this.reports.listMySupplements(id, user.id);
  }

  @Post(':id/supplements/:demandeId/responses')
  @ApiOperation({
    summary: 'Répond à une demande de complément ouverte',
    description: 'La réponse est limitée au propriétaire du signalement et ne peut être enregistrée qu’une fois.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'demandeId', format: 'uuid' })
  @ApiCreatedResponse({ type: SupplementAnswerDto })
  @ApiBadRequestResponse({ description: 'Réponse invalide.' })
  @ApiConflictResponse({ description: 'Demande déjà traitée ou modifiée simultanément.' })
  @ApiNotFoundResponse({ description: 'Demande de complément introuvable.' })
  answerSupplement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('demandeId', ParseUUIDPipe) demandeId: string,
    @Body() dto: CreateSupplementResponseDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.reports.answerSupplement(id, demandeId, dto.contenu, user.id);
  }

}
