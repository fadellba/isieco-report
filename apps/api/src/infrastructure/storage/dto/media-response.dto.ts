import { ApiProperty } from '@nestjs/swagger';

export class ReportPhotoUploadResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identifiant de la photo de signalement, sans référence de stockage.',
  })
  idPhotoSignalement!: string;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'date-time' })
  dateAjout!: Date;

  @ApiProperty({
    enum: ['PRIVEE'],
    example: 'PRIVEE',
    description: 'La photo reste privée et n’est pas publiée.',
  })
  etatPublication!: 'PRIVEE';
}

export class InterventionPhotoUploadResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identifiant de la preuve photo d’intervention, sans référence de stockage.',
  })
  idPhotoIntervention!: string;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'date-time' })
  dateAjout!: Date;

  @ApiProperty({
    enum: ['PRIVEE'],
    example: 'PRIVEE',
    description: 'La preuve reste privée et n’est pas publiée.',
  })
  etatPublication!: 'PRIVEE';
}

export class SignedMediaUrlResponseDto {
  @ApiProperty({ format: 'uri', description: 'URL temporaire vers un objet du bucket privé.' })
  signedUrl!: string;

  @ApiProperty({ example: 60, description: 'Durée de validité en secondes.' })
  expiresInSeconds!: number;
}
