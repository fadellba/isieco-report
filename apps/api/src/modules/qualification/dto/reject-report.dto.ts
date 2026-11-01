import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectReportDto {
  @ApiProperty({
    minLength: 5,
    maxLength: 2000,
    example: 'Signalement hors périmètre de traitement.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif!: string;
}
