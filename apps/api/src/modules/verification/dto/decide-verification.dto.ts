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
}
