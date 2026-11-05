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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentAuthUser } from '../../auth/current-auth-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { CreateWasteTypeDto } from './dto/create-waste-type.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { UpdateWasteTypeDto } from './dto/update-waste-type.dto.js';
import { CreateTeamMembershipDto, EndTeamMembershipDto } from './dto/team-membership.dto.js';
import { CreateTeamSkillDto, EndTeamSkillDto } from './dto/team-skill.dto.js';
import { ReferentialsService } from './referentials.service.js';

@ApiTags('referentials')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('GESTIONNAIRE_REFERENTIEL')
@Controller('referentials')
export class ReferentialsController {
  constructor(private readonly referentials: ReferentialsService) {}

  @Get('waste-types')
  @ApiOperation({ summary: 'Liste les types de déchets' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse()
  listWasteTypes(@Query('includeInactive') includeInactive?: string) {
    return this.referentials.listWasteTypes(includeInactive === 'true');
  }

  @Post('waste-types')
  @ApiOperation({ summary: 'Crée un type de déchet' })
  @ApiCreatedResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  createWasteType(@Body() dto: CreateWasteTypeDto, @CurrentAuthUser() user: User) {
    return this.referentials.createWasteType(dto, user.id);
  }

  @Patch('waste-types/:id')
  @ApiOperation({ summary: 'Modifie le libellé, la description ou l’état actif d’un type de déchet' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  updateWasteType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWasteTypeDto, @CurrentAuthUser() user: User) {
    return this.referentials.updateWasteType(id, dto, user.id);
  }

  @Get('teams')
  @ApiOperation({ summary: 'Liste les équipes, leurs membres et leurs compétences actives' })
  @ApiOkResponse()
  listTeams() {
    return this.referentials.listTeams();
  }

  @Post('teams')
  @ApiOperation({ summary: 'Crée une équipe' })
  @ApiCreatedResponse()
  createTeam(@Body() dto: CreateTeamDto, @CurrentAuthUser() user: User) {
    return this.referentials.createTeam(dto, user.id);
  }

  @Patch('teams/:teamId')
  @ApiOperation({ summary: 'Modifie le nom, la description ou l’état d’une équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  updateTeam(@Param('teamId', ParseUUIDPipe) teamId: string, @Body() dto: UpdateTeamDto, @CurrentAuthUser() user: User) {
    return this.referentials.updateTeam(teamId, dto, user.id);
  }

  @Post('teams/:teamId/memberships')
  @ApiOperation({ summary: 'Ajoute un membre à une équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiCreatedResponse()
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  addMembership(@Param('teamId', ParseUUIDPipe) teamId: string, @Body() dto: CreateTeamMembershipDto, @CurrentAuthUser() user: User) {
    return this.referentials.addMembership(teamId, dto, user.id);
  }

  @Post('teams/:teamId/memberships/close')
  @ApiOperation({ summary: 'Termine une appartenance à une équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  endMembership(@Param('teamId', ParseUUIDPipe) teamId: string, @Body() dto: EndTeamMembershipDto, @CurrentAuthUser() user: User) {
    return this.referentials.endMembership(teamId, dto, user.id);
  }

  @Post('teams/:teamId/skills')
  @ApiOperation({ summary: 'Ajoute une compétence à une équipe pour un type de déchet' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiCreatedResponse()
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  addSkill(@Param('teamId', ParseUUIDPipe) teamId: string, @Body() dto: CreateTeamSkillDto, @CurrentAuthUser() user: User) {
    return this.referentials.addSkill(teamId, dto, user.id);
  }

  @Post('teams/:teamId/skills/close')
  @ApiOperation({ summary: 'Désactive une compétence d’équipe' })
  @ApiParam({ name: 'teamId', format: 'uuid' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  endSkill(@Param('teamId', ParseUUIDPipe) teamId: string, @Body() dto: EndTeamSkillDto, @CurrentAuthUser() user: User) {
    return this.referentials.endSkill(teamId, dto, user.id);
  }
}
