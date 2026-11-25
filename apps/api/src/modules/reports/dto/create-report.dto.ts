import { ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateReportContentDto {
  @IsUUID()
  idTypeDechet!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  quantiteEstimee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  volumeEstime?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarque?: string;
}

export class CreateReportDto {
  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dateConstat?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  precisionLocalisation?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descriptionLocalisation?: string;

  @ApiPropertyOptional({ type: () => [CreateReportContentDto], minItems: 0, maxItems: 20 })
  @IsOptional()
  @Transform(({ value }) => {
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    }

    // Multipart fields arrive as JSON strings. Convert each nested object into
    // its DTO instance before class-validator applies strict whitelist checks.
    return Array.isArray(parsed)
      ? plainToInstance(CreateReportContentDto, parsed)
      : parsed;
  }, { toClassOnly: true })
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique((content: CreateReportContentDto) => content.idTypeDechet)
  @ValidateNested({ each: true })
  contenus?: CreateReportContentDto[];
}

/** Multipart metadata DTO for a citizen report; a first photo is mandatory at the controller/service boundary. */
export class CreateReportWithPhotoDto extends CreateReportDto {}
