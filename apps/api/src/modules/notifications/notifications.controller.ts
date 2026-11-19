import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsQueryDto } from './dto/notifications-query.dto.js';
import { NotificationResponseDto } from './dto/notification-response.dto.js';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(
  'CITOYEN',
  'AGENT_QUALIFICATION',
  'RESPONSABLE_TRAITEMENT',
  'RESPONSABLE_AFFECTATION',
  'AGENT_TERRAIN',
  'VERIFICATEUR_CLOTURE',
  'GESTIONNAIRE_REFERENTIEL',
  'ADMINISTRATEUR_COMPTES',
)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Liste les notifications métier pertinentes pour le compte connecté',
    description: 'Les événements sont dérivés du journal métier privé, filtrés selon les rôles actifs, les appartenances à une équipe et la propriété des signalements/interventions. La liste couvre les 90 derniers jours, triés du plus récent au plus ancien.',
  })
  @ApiOkResponse({ type: [NotificationResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Jeton Supabase absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Un compte métier actif est requis.' })
  listMine(@Query() query: NotificationsQueryDto, @CurrentAuthUser() user: User) {
    return this.notifications.listMine(user.id, query.limit);
  }
}
