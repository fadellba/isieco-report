import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { FUNCTIONAL_ROLE_CODES, type FunctionalRole } from '@isieco/shared';
import type { User } from '@supabase/supabase-js';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { FunctionalRolePipe } from '../../common/pipes/functional-role.pipe.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto.js';
import { AccountListResponseDto, AccountProfileResponseDto } from './dto/account-profile-response.dto.js';
import { AccountsService } from './accounts.service.js';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Récupère ou initialise le profil métier du compte connecté' })
  @ApiOkResponse({ type: AccountProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Jeton absent, invalide ou adresse e-mail non confirmée.' })
  @ApiForbiddenResponse({ description: 'Compte désactivé.' })
  getMe(@CurrentAuthUser() user: User) {
    return this.accounts.getOrCreateMyProfile(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Met à jour les informations personnelles du compte connecté' })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiOkResponse({ type: AccountProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Les données fournies ne respectent pas les contraintes.' })
  @ApiUnauthorizedResponse({ description: 'Jeton absent, invalide ou adresse e-mail non confirmée.' })
  updateMe(@CurrentAuthUser() user: User, @Body() dto: UpdateMyProfileDto) {
    return this.accounts.updateMyProfile(user, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATEUR_COMPTES')
  @ApiOperation({ summary: 'Liste les comptes (administrateur des comptes uniquement)' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, minimum: 1, maximum: 100, example: 20 })
  @ApiOkResponse({ type: AccountListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Jeton absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Habilitation administrateur des comptes requise.' })
  list(@Query('page', new ParseIntPipe({ optional: true })) page = 1, @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20) {
    return this.accounts.listAccounts(Math.max(1, page), Math.min(100, Math.max(1, pageSize)));
  }

  @Post(':utilisateurId/roles')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATEUR_COMPTES')
  @ApiOperation({ summary: 'Attribue un rôle à un compte (administrateur des comptes uniquement)' })
  @ApiParam({ name: 'utilisateurId', description: 'Identifiant UUID du compte cible.' })
  @ApiBody({ type: AssignRoleDto })
  @ApiCreatedResponse({ type: AccountProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Identifiant ou données invalides.' })
  @ApiConflictResponse({ description: 'Le rôle est déjà actif pour ce compte.' })
  @ApiNotFoundResponse({ description: 'Compte cible ou rôle introuvable.' })
  @ApiUnauthorizedResponse({ description: 'Jeton absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Habilitation administrateur des comptes requise.' })
  assignRole(@Param('utilisateurId', ParseUUIDPipe) utilisateurId: string, @CurrentAuthUser() actor: User, @Body() dto: AssignRoleDto) {
    return this.accounts.assignRole(utilisateurId, actor.id, dto);
  }

  @Delete(':utilisateurId/roles/:codeRole')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATEUR_COMPTES')
  @ApiOperation({ summary: 'Révoque un rôle (administrateur des comptes uniquement)' })
  @ApiParam({ name: 'utilisateurId', description: 'Identifiant UUID du compte cible.' })
  @ApiParam({ name: 'codeRole', description: 'Code du rôle à révoquer.', enum: [...FUNCTIONAL_ROLE_CODES] })
  @ApiOkResponse({ type: AccountProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Identifiant invalide.' })
  @ApiConflictResponse({ description: 'Conflit de modification ou dernier administrateur actif.' })
  @ApiNotFoundResponse({ description: 'Compte cible ou attribution active introuvable.' })
  @ApiUnauthorizedResponse({ description: 'Jeton absent ou invalide.' })
  @ApiForbiddenResponse({ description: 'Habilitation administrateur des comptes requise.' })
  revokeRole(@Param('utilisateurId', ParseUUIDPipe) utilisateurId: string, @Param('codeRole', FunctionalRolePipe) codeRole: FunctionalRole, @CurrentAuthUser() actor: User) {
    return this.accounts.revokeRole(utilisateurId, actor.id, codeRole);
  }
}
