import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateCaseLocationDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Null retire le rattachement à une commune.' })
  @IsOptional()
  @IsUUID()
  idCommune?: string | null;

  @ApiPropertyOptional({ minimum: -90, maximum: 90, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  precisionLocalisation?: number | null;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descriptionLocalisation?: string | null;

  @ApiProperty({ minLength: 5, maxLength: 2000 })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif!: string;
}
