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
  idTypeDechet!: string;

  @ApiProperty({ enum: ['ACTIF', 'RETIRE'] })
  etatContenuDossier!: string;

  @ApiProperty({ enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINE'] })
  etatPriseEnCharge!: string;

  @ApiProperty({ type: CaseWasteTypeResponseDto })
  typeDechet!: CaseWasteTypeResponseDto;
}

export class CaseAttachmentReportDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  dateSoumission!: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty()
  statutSignalement!: string;
}

export class CaseAttachmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  idRattachement!: string;

  @ApiProperty({ format: 'uuid' })
  idDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ format: 'date-time' })
  dateDebutRattachement!: Date;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateFinRattachement!: Date | null;

  @ApiProperty()
  typeRattachement!: string;

  @ApiProperty({ type: 'string', nullable: true })
  motif!: string | null;

  @ApiProperty({ type: CaseAttachmentReportDto })
  signalement!: CaseAttachmentReportDto;
}

export class CasePriorityHistoryResponseDto {
  @ApiProperty()
  priorite!: string;

  @ApiProperty({ format: 'uuid' })
  definiePar!: string;

  @ApiProperty({ format: 'date-time' })
  dateDefinition!: Date;

  @ApiProperty()
  justification!: string;
}

export class CaseLocationHistoryResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  idCommune!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  latitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  longitude!: string | null;

  @ApiProperty({ format: 'date-time' })
  dateModification!: Date;

  @ApiProperty({ type: 'string', nullable: true })
  motif!: string | null;
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

  @ApiProperty({ format: 'date-time', nullable: true })
  dateQualification!: Date | null;

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  idCommune!: string | null;

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

  @ApiProperty({ type: [CaseAttachmentResponseDto] })
  rattachements!: CaseAttachmentResponseDto[];

  @ApiProperty({ type: [CasePriorityHistoryResponseDto] })
  historiquesPriorite!: CasePriorityHistoryResponseDto[];

  @ApiProperty({ type: [CaseLocationHistoryResponseDto] })
  historiquesLocalisation!: CaseLocationHistoryResponseDto[];
}

export class CaseListContentResponseDto {
  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ enum: ['ACTIF', 'RETIRE'] })
  etatContenuDossier!: string;

  @ApiProperty({ enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINE'] })
  etatPriseEnCharge!: string;

  @ApiProperty({ type: CaseWasteTypeResponseDto })
  typeDechet!: CaseWasteTypeResponseDto;
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

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  idCommune!: string | null;

  @ApiProperty({ type: [CaseListContentResponseDto] })
  contenus!: CaseListContentResponseDto[];

  @ApiProperty({ minimum: 0 })
  nombreRattachements!: number;
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
