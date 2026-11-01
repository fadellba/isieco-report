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
  @ApiProperty({ format: 'uuid', description: 'Identifiant du type de déchet retenu.' })
  @IsUUID()
  idTypeDechet!: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 999999999.999,
    description: 'Quantité estimée.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  quantiteEstimee?: number;

  @ApiPropertyOptional({ maxLength: 40, description: 'Unité de la quantité estimée.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  uniteQuantite?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 999999999.999,
    description: 'Quantité estimée au format historique.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  quantiteEstimeeLegacy?: number;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 999999999.999,
    description: 'Volume estimé.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  volumeEstime?: number;

  @ApiPropertyOptional({ maxLength: 1000, description: 'Remarque sur la qualification.' })
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
    description: 'Catégories de déchets retenues pour le signalement.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique((item: QualifiedWasteContentDto) => item.idTypeDechet)
  @ValidateNested({ each: true })
  @Type(() => QualifiedWasteContentDto)
  contenus!: QualifiedWasteContentDto[];
}
