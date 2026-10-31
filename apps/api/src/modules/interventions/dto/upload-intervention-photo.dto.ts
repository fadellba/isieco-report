import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UploadInterventionPhotoDto {
  @ApiProperty({ minLength: 3, maxLength: 100, example: 'Après intervention' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  contextePhoto!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
