import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTeamSkillDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idTypeDechet!: string;

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
}
