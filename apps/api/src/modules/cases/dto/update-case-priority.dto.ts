import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CASE_PRIORITY_CODES } from '@isieco/shared';

export class UpdateCasePriorityDto {
  @ApiProperty({ enum: CASE_PRIORITY_CODES })
  @IsIn([...CASE_PRIORITY_CODES])
  priorite!: string;
}
