import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadReportPhotoDto {
  @ApiPropertyOptional({ maxLength: 500, description: 'Description facultative de la photo.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
