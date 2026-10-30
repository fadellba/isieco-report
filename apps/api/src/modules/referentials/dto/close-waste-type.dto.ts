import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class CloseWasteTypeDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateFinValidite!: string;
}
