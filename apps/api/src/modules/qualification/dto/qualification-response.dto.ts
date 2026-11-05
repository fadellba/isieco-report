import { ApiProperty } from '@nestjs/swagger';

export class QualificationQueueContentDto {
  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ type: 'string', nullable: true })
  quantiteEstimee!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  volumeEstime!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  remarque!: string | null;

  @ApiProperty({ enum: ['EN_ATTENTE', 'RETENU', 'RETIRE'] })
  etatQualification!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  typeDechet!: { codeType: string; libelle: string };
}

export class QualificationQueueItemDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ enum: ['SOUMIS', 'EN_ATTENTE_COMPLEMENT', 'COMPLEMENT_REPONDU', 'QUALIFIE', 'REJETE'] })
  statutSignalement!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  dateSoumission!: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ type: 'object' })
  utilisateur!: { nom: string; prenom: string | null };

  @ApiProperty({ type: [QualificationQueueContentDto] })
  contenus!: QualificationQueueContentDto[];

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  demandesComplement!: Array<Record<string, unknown>>;
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
