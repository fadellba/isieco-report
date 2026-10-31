import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { INTERVENTION_RESULT_CODES } from '@isieco/shared';

export class SubmitInterventionDto {
  @ApiProperty({ enum: INTERVENTION_RESULT_CODES })
  @IsIn([...INTERVENTION_RESULT_CODES])
  resultatIntervention!: string;

  @ApiProperty({ minLength: 20, maxLength: 10000 })
  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  compteRendu!: string;

  @ApiPropertyOptional({ minLength: 5, maxLength: 2000, description: 'Obligatoire pour un résultat PARTIELLE ou IMPOSSIBLE.' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motifException?: string;
}
