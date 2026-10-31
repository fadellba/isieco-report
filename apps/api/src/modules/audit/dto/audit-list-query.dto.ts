import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AuditListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 1000000, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ format: 'date-time', description: 'Borne temporelle incluse sur dateEnregistrement.' })
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Borne temporelle incluse sur dateEnregistrement.' })
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  typeEvenement?: string;
}
