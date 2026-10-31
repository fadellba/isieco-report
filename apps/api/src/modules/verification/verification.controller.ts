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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { SignedMediaUrlResponseDto } from '../../infrastructure/storage/dto/media-response.dto.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import { DecideVerificationDto } from './dto/decide-verification.dto.js';
import {
  VerificationDecisionResultDto,
  VerificationQueueItemDto,
  VerificationQueueResponseDto,
} from './dto/verification-response.dto.js';
import { ListVerificationsQueryDto } from './dto/list-verifications-query.dto.js';
import { VerificationService } from './verification.service.js';

@ApiTags('verification')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('VERIFICATEUR_CLOTURE')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Liste les comptes rendus en attente de vérification',
    description: 'Ne retourne que la dernière intervention soumise pour une affectation active et acceptée, lorsque cette soumission n’a pas encore reçu de décision.',
  })
  @ApiOkResponse({ type: VerificationQueueResponseDto })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Rôle VERIFICATEUR_CLOTURE requis.' })
  listPending(
    @Query() query: ListVerificationsQueryDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.verification.listPending(query, user.id);
  }

  @Get('assignments/:idAffectation')
  @ApiOperation({ summary: 'Consulte le dernier compte rendu soumis pour vérification' })
  @ApiParam({ name: 'idAffectation', format: 'uuid' })
  @ApiOkResponse({ type: VerificationQueueItemDto })
  @ApiConflictResponse({ description: 'Aucun compte rendu en attente de vérification.' })
  @ApiForbiddenResponse({ description: 'Rôle VERIFICATEUR_CLOTURE requis.' })
  getPending(
    @Param('idAffectation', ParseUUIDPipe) idAffectation: string,
    @CurrentAuthUser() user: User,
  ) {
    return this.verification.getPending(idAffectation, user.id);
  }

  @Get('assignments/:idAffectation/photos/:idPhotoIntervention/url')
  @ApiOperation({
    summary: 'Obtient une URL temporaire vers une preuve photo du dernier compte rendu en attente',
    description: 'L’accès est vérifié côté API. Un agent ne peut pas consulter les preuves de sa propre intervention comme vérificateur.',
  })
  @ApiParam({ name: 'idAffectation', format: 'uuid' })
  @ApiParam({ name: 'idPhotoIntervention', format: 'uuid' })
  @ApiOkResponse({ type: SignedMediaUrlResponseDto })
  @ApiForbiddenResponse({ description: 'Auto-vérification interdite.' })
  @ApiConflictResponse({ description: 'Aucun compte rendu en attente de vérification.' })
  createPhotoUrl(
    @Param('idAffectation', ParseUUIDPipe) idAffectation: string,
    @Param('idPhotoIntervention', ParseUUIDPipe) idPhotoIntervention: string,
    @CurrentAuthUser() user: User,
  ) {
    return this.verification.createInterventionPhotoUrl(idAffectation, idPhotoIntervention, user.id);
  }

  @Post('assignments/:idAffectation/decision')
  @ApiOperation({
    summary: 'Valide la résolution ou demande une reprise',
    description: 'CONFORME clôt l’affectation et termine le contenu. Le dossier n’est clôturé que lorsque tous ses contenus actifs sont terminés. A_REPRENDRE exige un motif et autorise une nouvelle intervention.',
  })
  @ApiParam({ name: 'idAffectation', format: 'uuid' })
  @ApiOkResponse({ type: VerificationDecisionResultDto })
  @ApiBadRequestResponse({ description: 'Décision ou motif de reprise invalide.' })
  @ApiConflictResponse({ description: 'Compte rendu déjà vérifié, contenu inéligible ou résultat terrain non terminé.' })
  @ApiForbiddenResponse({ description: 'Rôle VERIFICATEUR_CLOTURE requis ; auto-vérification interdite.' })
  decide(
    @Param('idAffectation', ParseUUIDPipe) idAffectation: string,
    @Body() dto: DecideVerificationDto,
    @CurrentAuthUser() user: User,
  ) {
    return this.verification.decide(idAffectation, dto, user.id);
  }
}
