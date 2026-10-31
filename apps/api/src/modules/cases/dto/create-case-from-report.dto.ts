import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CASE_PRIORITY_CODES } from '@isieco/shared';

export class CreateCaseFromReportDto {
  @ApiPropertyOptional({ minLength: 10, maxLength: 5000, description: 'Résumé métier du dossier.' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  descriptionSynthese?: string;

  @ApiPropertyOptional({ enum: CASE_PRIORITY_CODES, default: 'NORMALE' })
  @IsOptional()
  @IsIn([...CASE_PRIORITY_CODES])
  priorite?: string;
}
