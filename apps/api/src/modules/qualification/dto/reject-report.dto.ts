import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectReportDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif!: string;
}
