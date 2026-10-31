import { ApiProperty } from '@nestjs/swagger';

export class QualificationQueueItemDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ enum: ['SOUMIS', 'EN_ATTENTE_COMPLEMENT', 'COMPLEMENT_REPONDU', 'QUALIFIE', 'REJETE'] })
  statutSignalement!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  dateSoumission!: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'uuid' })
  idUtilisateur!: string;

  @ApiProperty({ type: 'string', nullable: true })
  nomCitoyen!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  prenomCitoyen!: string | null;

  @ApiProperty({ isArray: true, type: 'object' })
  contenus!: Array<Record<string, unknown>>;
}

export class QualificationQueueResponseDto {
  @ApiProperty({ type: [QualificationQueueItemDto] })
  items!: QualificationQueueItemDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}
