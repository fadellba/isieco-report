import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ReassignAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idEquipe!: string;

  @ApiProperty({ minLength: 5, maxLength: 2000 })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string;
}
