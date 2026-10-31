import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditTargetDto {
  @ApiProperty({
    enum: [
      'SIGNALEMENT',
      'DOSSIER',
      'RATTACHEMENT',
      'AFFECTATION',
      'INTERVENTION',
      'VERIFICATION',
      'UTILISATEUR',
      'EQUIPE',
      'REGION',
      'DEPARTEMENT',
      'COMMUNE',
      'TYPE_DECHET',
      'COMPETENCE_EQUIPE',
      'CONTENU_DOSSIER',
    ],
  })
  type!: string;

  @ApiProperty({ format: 'uuid' })
  id!: string;
}

export class AuditEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  idEvenement!: string;

  @ApiProperty()
  typeEvenement!: string;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateEvenement!: Date | null;

  @ApiProperty({ format: 'date-time' })
  dateEnregistrement!: Date;

  @ApiProperty()
  origine!: string;

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  idActeur!: string | null;

  @ApiPropertyOptional({ type: AuditTargetDto, nullable: true })
  cible!: AuditTargetDto | null;
}

export class AuditEventListResponseDto {
  @ApiProperty({ type: [AuditEventResponseDto] })
  items!: AuditEventResponseDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}
