import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ASSIGNMENT_STATUS_CODES, ASSIGNMENT_TEAM_DECISION_CODES } from '@isieco/shared';

export class ListAssignmentsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  idDossier?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  idEquipe?: string;

  @ApiPropertyOptional({ enum: ASSIGNMENT_STATUS_CODES })
  @IsOptional()
  @IsIn([...ASSIGNMENT_STATUS_CODES])
  etatAffectation?: string;

  @ApiPropertyOptional({ enum: ASSIGNMENT_TEAM_DECISION_CODES })
  @IsOptional()
  @IsIn([...ASSIGNMENT_TEAM_DECISION_CODES])
  decisionEquipe?: string;
}
