import { IsString, MaxLength, MinLength } from 'class-validator';

export class DetachReportDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif!: string;
}
