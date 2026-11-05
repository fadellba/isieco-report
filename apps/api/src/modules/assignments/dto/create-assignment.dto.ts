import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid', description: 'Contenu du dossier à affecter.' })
  @IsUUID()
  idContenuDossier!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idEquipe!: string;

  @ApiPropertyOptional({ minLength: 5, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string;
}
