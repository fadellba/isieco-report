import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTeamDelegationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idUtilisateurDelegue!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateDebutAppartenance!: string;

  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  typeDecision!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateDebut!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motif?: string;
}

export class EndTeamDelegationDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateFin!: string;
}
