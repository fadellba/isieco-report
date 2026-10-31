import { Type } from 'class-transformer';
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
  @IsUUID()
  idTypeDechet!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  quantiteEstimee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  uniteQuantite?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999.999)
  quantiteEstimeeLegacy?: number;

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

export class AcceptReportDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique((item: QualifiedWasteContentDto) => item.idTypeDechet)
  @ValidateNested({ each: true })
  @Type(() => QualifiedWasteContentDto)
  contenus!: QualifiedWasteContentDto[];
}
