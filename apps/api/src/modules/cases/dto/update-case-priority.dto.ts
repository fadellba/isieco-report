import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CASE_PRIORITY_CODES } from '@isieco/shared';

export class UpdateCasePriorityDto {
  @ApiProperty({ enum: CASE_PRIORITY_CODES })
  @IsIn([...CASE_PRIORITY_CODES])
  priorite!: string;

  @ApiProperty({ minLength: 5, maxLength: 2000 })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  justification!: string;
}
