import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CaseReportLinkDto {
  @ApiProperty({
    minLength: 5,
    maxLength: 500,
    description: 'Justification métier obligatoire du rattachement ou du détachement.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motif!: string;
}
