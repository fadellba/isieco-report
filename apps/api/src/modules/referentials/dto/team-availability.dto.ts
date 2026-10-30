import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetTeamAvailabilityDto {
  @ApiProperty({ maxLength: 50, description: 'Code d’état métier conservé comme chaîne selon le dictionnaire de référence.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  etatDisponibilite!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  valideJusqua!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentaire?: string;
}
