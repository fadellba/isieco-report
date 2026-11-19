import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

function parseQueryNumber({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length === 0 ? Number.NaN : Number(normalized);
}

export class NearbyReportsQueryDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @Transform(parseQueryNumber)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
  @Transform(parseQueryNumber)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ minimum: 250, maximum: 5000, default: 3000 })
  @IsOptional()
  @Transform(parseQueryNumber)
  @Type(() => Number)
  @IsNumber()
  @Min(250)
  @Max(5000)
  radiusMeters = 3000;
}
