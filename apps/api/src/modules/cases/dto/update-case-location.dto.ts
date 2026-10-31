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
  @IsOptional()
  @IsUUID()
  idCommune?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  precisionLocalisation?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descriptionLocalisation?: string | null;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif!: string;
}
