import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CASE_PRIORITY_CODES } from '@isieco/shared';

export class CreateCaseFromReportDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  descriptionSynthese?: string;

  @IsOptional()
  @IsIn(CASE_PRIORITY_CODES)
  priorite?: string;
}
