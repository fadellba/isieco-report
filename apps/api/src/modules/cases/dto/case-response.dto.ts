import { ApiProperty } from '@nestjs/swagger';

export class CaseWasteTypeResponseDto {
  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty()
  codeType!: string;

  @ApiProperty()
  libelle!: string;
}

export class CaseContentResponseDto {
  @ApiProperty({ format: 'uuid' })
  idContenuDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ type: 'string', nullable: true })
  quantiteEstimee!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  volumeEstime!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  remarque!: string | null;

  @ApiProperty({ enum: ['ACTIF', 'RETIRE'] })
  etatContenuDossier!: string;

  @ApiProperty({ enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINE'] })
  etatPriseEnCharge!: string;

  @ApiProperty({ type: CaseWasteTypeResponseDto })
  typeDechet!: CaseWasteTypeResponseDto;
}

export class CaseSignalementResponseDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  dateSoumission!: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty()
  statutSignalement!: string;
}

export class CaseResponseDto {
  @ApiProperty({ format: 'uuid' })
  idDossier!: string;

  @ApiProperty()
  referenceDossier!: string;

  @ApiProperty()
  descriptionSynthese!: string;

  @ApiProperty({ format: 'date-time' })
  dateCreationDossier!: Date;

  @ApiProperty({ enum: ['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE'] })
  statutDossier!: string;

  @ApiProperty({ enum: ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'] })
  priorite!: string;

  @ApiProperty({ type: 'string', nullable: true })
  latitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  longitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  precisionLocalisation!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  descriptionLocalisation!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateCloture!: Date | null;

  @ApiProperty({ format: 'uuid' })
  creePar!: string;

  @ApiProperty({ type: [CaseContentResponseDto] })
  contenus!: CaseContentResponseDto[];

  @ApiProperty({ type: [CaseSignalementResponseDto] })
  signalements!: CaseSignalementResponseDto[];
}

export class CaseListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  idDossier!: string;

  @ApiProperty()
  referenceDossier!: string;

  @ApiProperty()
  descriptionSynthese!: string;

  @ApiProperty({ format: 'date-time' })
  dateCreationDossier!: Date;

  @ApiProperty({ enum: ['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE'] })
  statutDossier!: string;

  @ApiProperty({ enum: ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'] })
  priorite!: string;

  @ApiProperty({ type: [CaseContentResponseDto] })
  contenus!: CaseContentResponseDto[];

  @ApiProperty({ minimum: 0 })
  nombreSignalements!: number;
}

export class CaseListResponseDto {
  @ApiProperty({ type: [CaseListItemResponseDto] })
  items!: CaseListItemResponseDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}
