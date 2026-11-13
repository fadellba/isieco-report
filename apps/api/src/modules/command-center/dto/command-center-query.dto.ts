import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CommandCenterQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 250, default: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit = 150;
  @ApiPropertyOptional({ type: Number, minimum: -90, maximum: 90, description: 'Borne du viewport. Si une borne est fournie, les quatre bornes (minLat, maxLat, minLon, maxLon) doivent être renseignées.' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    const normalized = value.trim();
    return normalized.length === 0 ? Number.NaN : Number(normalized);
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat?: number;

  @ApiPropertyOptional({ type: Number, minimum: -90, maximum: 90 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    const normalized = value.trim();
    return normalized.length === 0 ? Number.NaN : Number(normalized);
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat?: number;

  @ApiPropertyOptional({ type: Number, minimum: -180, maximum: 180, description: 'Borne du viewport. Si une borne est fournie, les quatre bornes (minLat, maxLat, minLon, maxLon) doivent être renseignées.' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    const normalized = value.trim();
    return normalized.length === 0 ? Number.NaN : Number(normalized);
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLon?: number;

  @ApiPropertyOptional({ type: Number, minimum: -180, maximum: 180 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') return value;
    const normalized = value.trim();
    return normalized.length === 0 ? Number.NaN : Number(normalized);
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLon?: number;
}
