import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AuditListQueryDto } from './dto/audit-list-query.dto.js';
import { AuditEventListResponseDto } from './dto/audit-response.dto.js';
import { AuditService } from './audit.service.js';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Consulte l’historique des événements dont le compte connecté est acteur ou cible',
    description: 'Les snapshots JSON internes, motifs et secrets ne sont pas exposés.',
  })
  @ApiOkResponse({ type: AuditEventListResponseDto })
  @ApiBadRequestResponse({ description: 'Filtres temporels invalides.' })
  @ApiUnauthorizedResponse({ description: 'Jeton absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Un compte métier actif est requis.' })
  listMine(@CurrentAuthUser() user: User, @Query() query: AuditListQueryDto) {
    return this.audit.listMyEvents(user.id, query);
  }

  @Get('accounts/:idUtilisateur/roles')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATEUR_COMPTES')
  @ApiOperation({
    summary: 'Consulte les attributions et révocations de rôles d’un compte',
    description: 'Accès réservé à ADMINISTRATEUR_COMPTES. Seuls les événements ROLE_ATTRIBUE et ROLE_REVOQUE sont retournés.',
  })
  @ApiParam({ name: 'idUtilisateur', format: 'uuid' })
  @ApiOkResponse({ type: AuditEventListResponseDto })
  @ApiBadRequestResponse({ description: 'Filtres temporels invalides.' })
  @ApiNotFoundResponse({ description: 'Compte cible introuvable.' })
  @ApiUnauthorizedResponse({ description: 'Jeton absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Habilitation administrateur des comptes requise.' })
  listAccountRoleEvents(
    @Param('idUtilisateur', ParseUUIDPipe) idUtilisateur: string,
    @CurrentAuthUser() user: User,
    @Query() query: AuditListQueryDto,
  ) {
    return this.audit.listAccountRoleEvents(idUtilisateur, user.id, query);
  }
}
