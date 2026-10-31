import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { User } from '@supabase/supabase-js';
import { CurrentAuthToken } from '../../auth/current-auth-token.decorator.js';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import type { UploadedImage } from './media.service.js';
import { MediaService } from './media.service.js';
import { UploadInterventionPhotoDto } from './dto/upload-intervention-photo.dto.js';
import { UploadReportPhotoDto } from './dto/upload-report-photo.dto.js';
import {
  InterventionPrivatePhotoListResponseDto,
  PrivatePhotoListResponseDto,
} from './dto/private-photo-response.dto.js';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const uploadInterceptor = () => FileInterceptor('file', {
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
});

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('reports/:idSignalement/photos')
  @Roles('CITOYEN')
  @UseInterceptors(uploadInterceptor())
  @ApiOperation({
    summary: 'Ajoute une photo privée à un signalement appartenant au citoyen connecté',
    description: 'JPEG, PNG ou WebP, 10 Mo maximum. Le contenu binaire est vérifié côté API. La photo reste privée et non publiée.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        description: { type: 'string', maxLength: 500 },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Métadonnées de la photo privée ajoutée.' })
  @ApiBadRequestResponse({ description: 'Fichier absent, trop petit, format non supporté ou contenu binaire invalide.' })
  @ApiPayloadTooLargeResponse({ description: 'Le fichier dépasse la limite de 10 Mo.' })
  @ApiConflictResponse({ description: 'Signalement non modifiable ou quota de photos atteint.' })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  @ApiForbiddenResponse({ description: 'Le signalement doit appartenir au citoyen connecté.' })
  addReportPhoto(
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() dto: UploadReportPhotoDto,
    @CurrentAuthUser() user: User,
    @CurrentAuthToken() accessToken: string,
  ) {
    return this.media.addReportPhoto(idSignalement, file as UploadedImage, dto.description, user.id, accessToken);
  }

  @Get('reports/:idSignalement/photos')
  @Roles('CITOYEN', 'AGENT_QUALIFICATION', 'RESPONSABLE_TRAITEMENT', 'VERIFICATEUR_CLOTURE')
  @ApiOperation({
    summary: 'Liste les photos privées et délivre des URL signées',
    description: 'Le citoyen propriétaire et les rôles métier autorisés peuvent consulter les médias. Les URL signées expirent après 120 secondes.',
  })
  @ApiParam({ name: 'idSignalement', format: 'uuid' })
  @ApiOkResponse({ type: PrivatePhotoListResponseDto })
  @ApiNotFoundResponse({ description: 'Signalement introuvable.' })
  @ApiForbiddenResponse({ description: 'Aucun droit de lecture sur ce signalement.' })
  listReportPhotos(
    @Param('idSignalement', ParseUUIDPipe) idSignalement: string,
    @CurrentAuthUser() user: User,
    @CurrentAuthToken() accessToken: string,
  ) {
    return this.media.listReportPhotos(idSignalement, user.id, accessToken);
  }

  @Post('interventions/:idIntervention/photos')
  @Roles('AGENT_TERRAIN')
  @UseInterceptors(uploadInterceptor())
  @ApiOperation({
    summary: 'Ajoute une preuve photo à une intervention en cours',
    description: 'Réservé à l’agent ayant démarré une intervention ouverte et membre actif de l’équipe. Le contexte est AVANT, PENDANT ou APRES.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'contextePhoto'],
      properties: {
        file: { type: 'string', format: 'binary' },
        contextePhoto: { type: 'string', enum: ['AVANT', 'PENDANT', 'APRES'] },
        description: { type: 'string', maxLength: 500 },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Métadonnées de la preuve privée ajoutée.' })
  @ApiBadRequestResponse({ description: 'Fichier ou contexte photo invalide.' })
  @ApiPayloadTooLargeResponse({ description: 'Le fichier dépasse la limite de 10 Mo.' })
  @ApiConflictResponse({ description: 'Intervention soumise, affectation terminée ou quota atteint.' })
  @ApiNotFoundResponse({ description: 'Intervention introuvable.' })
  @ApiForbiddenResponse({ description: 'L’agent doit être l’auteur de l’intervention et appartenir à l’équipe.' })
  addInterventionPhoto(
    @Param('idIntervention', ParseUUIDPipe) idIntervention: string,
    @UploadedFile() file: UploadedImage | undefined,
    @Body() dto: UploadInterventionPhotoDto,
    @CurrentAuthUser() user: User,
    @CurrentAuthToken() accessToken: string,
  ) {
    return this.media.addInterventionPhoto(
      idIntervention,
      file as UploadedImage,
      dto.description,
      dto.contextePhoto,
      user.id,
      accessToken,
    );
  }

  @Get('interventions/:idIntervention/photos')
  @Roles('AGENT_TERRAIN', 'VERIFICATEUR_CLOTURE')
  @ApiOperation({
    summary: 'Liste les photos privées associées à une intervention',
    description: 'Réservé à l’équipe active concernée et au vérificateur pour une intervention dont le compte rendu est soumis. URL signées de 120 secondes.',
  })
  @ApiParam({ name: 'idIntervention', format: 'uuid' })
  @ApiOkResponse({ type: InterventionPrivatePhotoListResponseDto })
  @ApiNotFoundResponse({ description: 'Intervention introuvable.' })
  @ApiForbiddenResponse({ description: 'Aucun droit de lecture sur cette intervention.' })
  listInterventionPhotos(
    @Param('idIntervention', ParseUUIDPipe) idIntervention: string,
    @CurrentAuthUser() user: User,
    @CurrentAuthToken() accessToken: string,
  ) {
    return this.media.listInterventionPhotos(idIntervention, user.id, accessToken);
  }
}
