import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QualifiedWasteContentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idTypeDechet!: string;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 999999999.999 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  quantiteEstimee?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 999999999.999 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  volumeEstime?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarque?: string;
}

export class AcceptReportDto {
  @ApiProperty({
    type: () => [QualifiedWasteContentDto],
    minItems: 1,
    maxItems: 20,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique((item: QualifiedWasteContentDto) => item.idTypeDechet)
  @ValidateNested({ each: true })
  @Type(() => QualifiedWasteContentDto)
  contenus!: QualifiedWasteContentDto[];
}
