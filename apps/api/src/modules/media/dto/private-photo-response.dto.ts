import { ApiProperty } from '@nestjs/swagger';

export class PrivatePhotoResponseDto {
  @ApiProperty({ format: 'uuid' })
  idPhoto!: string;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'date-time' })
  dateAjout!: Date;

  @ApiProperty({ format: 'date-time' })
  dateExpiration!: Date;

  @ApiProperty({ enum: ['NON_PUBLIEE'] })
  etatPublication!: string;

  @ApiProperty({ format: 'uri', description: 'URL signée de courte durée, valable 120 secondes.' })
  signedUrl!: string;

  @ApiProperty({ example: 120 })
  signedUrlExpiresInSeconds!: number;
}

export class InterventionPrivatePhotoResponseDto extends PrivatePhotoResponseDto {
  @ApiProperty({ enum: ['AVANT', 'PENDANT', 'APRES'] })
  contextePhoto!: string;
}

export class PrivatePhotoListResponseDto {
  @ApiProperty({ format: 'uuid' })
  resourceId!: string;

  @ApiProperty({ type: [PrivatePhotoResponseDto] })
  items!: PrivatePhotoResponseDto[];
}

export class InterventionPrivatePhotoListResponseDto {
  @ApiProperty({ format: 'uuid' })
  idIntervention!: string;

  @ApiProperty({ type: [InterventionPrivatePhotoResponseDto] })
  items!: InterventionPrivatePhotoResponseDto[];
}
