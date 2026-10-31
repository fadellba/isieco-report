import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CASE_PRIORITY_CODES } from '@isieco/shared';

export class UpdateCasePriorityDto {
  @IsIn([...CASE_PRIORITY_CODES])
  priorite!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  justification!: string;
}
