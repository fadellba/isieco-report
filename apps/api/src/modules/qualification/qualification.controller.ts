import {
  Body,
  Controller,
  Get,
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
import { SignedMediaUrlResponseDto } from '../../infrastructure/storage/dto/media-response.dto.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import { AcceptReportDto } from './dto/accept-report.dto.js';
import { ListQualificationQueryDto } from './dto/list-qualification-query.dto.js';
import { QualificationQueueResponseDto } from './dto/qualification-response.dto.js';
import { RejectReportDto } from './dto/reject-report.dto.js';
import { RequestSupplementDto } from './dto/request-supplement.dto.js';
import { QualificationService } from './qualification.service.js';

@ApiTags('qualification')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('AGENT_QUALIFICATION')
@Controller('qualification')
export class QualificationController {
  constructor(private readonly qualification: QualificationService) {}

  @Get('queue')
  @ApiOperation({
    summary: 'Liste les signalements en attente de qualification',
    description: 'La file ne contient que les signalements soumis ou ayant reçu une réponse de complément.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: QualificationQueueResponseDto })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Rôle AGENT_QUALIFICATION requis.' })
  listQueue(@Query() query: ListQualificationQueryDto) {
    return this.qualification.listQueue(query);
  }

  @Get(':idSignalement/photos/:idPhotoSignalement/url')
  @ApiOperation({
    summary: 'Obtient une URL temporaire vers une photo d’un signalement en attente de qualification',
    description: 'Accès réservé au rôle AGENT_QUALIFICATION. Le lien signé expire après 60 secondes.',
  })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiParam({ name: 'idPhotoSignalement', format: 'uuid' })
  @ApiOkResponse({ type: SignedMediaUrlResponseDto })
  @ApiNotFoundResponse({ description: 'Photo absente de la file de qualification ou expirée.' })
  createPhotoUrl(
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @Param('idPhotoSignalement', ParseUUIDPipe) idPhotoSignalement: string,
  ) {
    return this.qualification.createPhotoUrl(idSignalement, idPhotoSignalement);
  }

  @Get(':idSignalement')
  @ApiOperation({ summary: 'Consulte un signalement dans la file de qualification' })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiOkResponse({ description: 'Détail du signalement, catégories déclarées et demandes de complément.' })
  @ApiNotFoundResponse({ description: 'Signalement absent de la file de qualification.' })
  getQueueItem(@Param('idSignalement', ParseUUIDPipe) idSignalement: string) {
    return this.qualification.getQueueItem(idSignalement);
  }

  @Post(':idSignalement/supplements')
  @ApiOperation({ summary: 'Demande un complément au citoyen propriétaire du signalement' })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Demande créée, signalement placé en attente de complément et événement journalisé.' })
  @ApiBadRequestResponse({ description: 'Motif de complément invalide.' })
  @ApiConflictResponse({ description: 'Signalement non décisionnable ou demande déjà ouverte.' })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  requestSupplement(
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @Body() dto: RequestSupplementDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.qualification.requestSupplement(idSignalement, dto, user.id);
  }

  @Post(':idSignalement/accept')
  @ApiOperation({
    summary: 'Accepte et qualifie un signalement',
    description: 'Crée les catégories retenues, clôt la décision et journalise la transition dans une transaction.',
  })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiOkResponse({ description: 'Signalement qualifié et catégories retenues enregistrées.' })
  @ApiBadRequestResponse({ description: 'Catégories invalides ou type de déchet inactif.' })
  @ApiConflictResponse({ description: 'Signalement non décisionnable ou demande de complément encore ouverte.' })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  acceptReport(
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @Body() dto: AcceptReportDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.qualification.acceptReport(idSignalement, dto, user.id);
  }

  @Post(':idSignalement/reject')
  @ApiOperation({ summary: 'Rejette un signalement avec un motif obligatoire' })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiOkResponse({ description: 'Signalement rejeté et événement de décision journalisé.' })
  @ApiBadRequestResponse({ description: 'Motif de rejet invalide.' })
  @ApiConflictResponse({ description: 'Signalement non décisionnable ou demande de complément encore ouverte.' })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  rejectReport(
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @Body() dto: RejectReportDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.qualification.rejectReport(idSignalement, dto, user.id);
  }
}
