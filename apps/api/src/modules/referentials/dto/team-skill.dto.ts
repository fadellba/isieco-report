import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTeamSkillDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idTypeDechet!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateDebut!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentaire?: string;
}

export class EndTeamSkillDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idCompetenceEquipe!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateFin!: string;
}
