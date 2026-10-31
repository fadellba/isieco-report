import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AttachReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motif?: string;
}
