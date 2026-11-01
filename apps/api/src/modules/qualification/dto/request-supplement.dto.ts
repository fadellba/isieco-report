import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestSupplementDto {
  @ApiProperty({
    minLength: 5,
    maxLength: 2000,
    example: 'Merci de préciser la localisation exacte du dépôt.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif!: string;
}
