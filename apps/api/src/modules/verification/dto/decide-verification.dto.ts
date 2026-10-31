import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { VERIFICATION_RESULT_CODES } from '@isieco/shared';

export class DecideVerificationDto {
  @ApiProperty({ enum: VERIFICATION_RESULT_CODES })
  @IsIn([...VERIFICATION_RESULT_CODES])
  resultatVerification!: string;

  @ApiPropertyOptional({
    minLength: 5,
    maxLength: 2000,
    description: 'Obligatoire lorsque la décision est A_REPRENDRE.',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  motif?: string;

  @ApiPropertyOptional({
    maxLength: 1000,
    description: 'Référence de preuve ou pièce justificative déjà stockée. Ne pas transmettre un fichier brut ici.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  referencePreuve?: string;
}
