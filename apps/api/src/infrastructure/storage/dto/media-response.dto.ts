import { ApiProperty } from '@nestjs/swagger';

export class PhotoUploadResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Identifiant de la photo, sans référence de stockage.' })
  idPhoto!: string;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'date-time' })
  dateAjout!: Date;

  @ApiProperty({ example: 'EN_ATTENTE' })
  etatPublication!: string;
}

export class SignedMediaUrlResponseDto {
  @ApiProperty({ format: 'uri', description: 'URL temporaire vers un objet du bucket privé.' })
  signedUrl!: string;

  @ApiProperty({ example: 60, description: 'Durée de validité en secondes.' })
  expiresInSeconds!: number;
}
