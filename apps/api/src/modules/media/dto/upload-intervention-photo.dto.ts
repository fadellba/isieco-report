import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadInterventionPhotoDto {
  @ApiProperty({ enum: ['AVANT', 'PENDANT', 'APRES'] })
  @IsIn(['AVANT', 'PENDANT', 'APRES'])
  contextePhoto!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
