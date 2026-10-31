import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ASSIGNMENT_TEAM_DECISION_CODES } from '@isieco/shared';

export class RespondAssignmentDto {
  @ApiProperty({ enum: ASSIGNMENT_TEAM_DECISION_CODES.filter((code) => code !== 'EN_ATTENTE') })
  @IsIn(['ACCEPTEE', 'REFUSEE'])
  decisionEquipe!: 'ACCEPTEE' | 'REFUSEE';

  @ApiPropertyOptional({ minLength: 5, maxLength: 2000, description: 'Obligatoire en cas de refus.' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motifRefusEquipe?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string;
}
