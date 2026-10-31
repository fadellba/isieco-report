import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupplementResponseDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  contenu!: string;
}
