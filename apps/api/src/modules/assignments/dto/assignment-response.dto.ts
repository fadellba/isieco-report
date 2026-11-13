import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignmentTeamResponseDto {
  @ApiProperty({ format: 'uuid' })
  idEquipe!: string;

  @ApiProperty()
  nomEquipe!: string;

  @ApiProperty()
  etatEquipe!: string;
}

export class AssignmentCompetenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  idCompetenceEquipe!: string;

  @ApiProperty()
  actif!: boolean;

  @ApiProperty({ format: 'date-time' })
  dateAttribution!: Date;
}

export class AssignmentContentTypeDto {
  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty()
  codeType!: string;

  @ApiProperty()
  libelle!: string;
}

export class AssignmentCaseDto {
  @ApiProperty()
  referenceDossier!: string;

  @ApiProperty()
  statutDossier!: string;

  @ApiProperty()
  priorite!: string;

  @ApiProperty({ type: 'string', nullable: true })
  latitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  longitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  precisionLocalisation!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  descriptionLocalisation!: string | null;
}

export class AssignmentContentDto {
  @ApiProperty({ format: 'uuid' })
  idContenuDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ enum: ['ACTIF', 'RETIRE'] })
  etatContenuDossier!: string;

  @ApiProperty({ enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINE'] })
  etatPriseEnCharge!: string;

  @ApiProperty({ type: AssignmentContentTypeDto })
  typeDechet!: AssignmentContentTypeDto;

  @ApiProperty({ type: AssignmentCaseDto })
  dossier!: AssignmentCaseDto;
}

export class AssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  idAffectation!: string;

  @ApiProperty({ format: 'uuid' })
  idContenuDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ format: 'uuid' })
  idEquipe!: string;

  @ApiProperty({ format: 'uuid' })
  idCompetenceEquipe!: string;

  @ApiProperty({ type: AssignmentTeamResponseDto })
  equipe!: AssignmentTeamResponseDto;

  @ApiProperty({ type: AssignmentCompetenceResponseDto })
  competence!: AssignmentCompetenceResponseDto;

  @ApiProperty({ type: AssignmentContentDto })
  contenuDossier!: AssignmentContentDto;

  @ApiProperty({ format: 'date-time' })
  dateHeureAffectation!: Date;

  @ApiProperty({ format: 'uuid' })
  idDecideur!: string;

  @ApiProperty()
  etatAffectation!: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  motif!: string | null;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  observation!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateFinAffectation!: Date | null;

  @ApiProperty()
  decisionEquipe!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  reponduPar!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateReponseEquipe!: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  motifRefusEquipe!: string | null;
}

export class EligibleTeamResponseDto {
  @ApiProperty({ format: 'uuid' })
  idEquipe!: string;

  @ApiProperty()
  nomEquipe!: string;

  @ApiProperty()
  etatEquipe!: string;
}

export class AssignmentListResponseDto {
  @ApiProperty({ type: [AssignmentResponseDto] })
  items!: AssignmentResponseDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}

export class PendingAssignmentContentDto {
  @ApiProperty({ format: 'uuid' })
  idContenuDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ enum: ['ACTIF', 'RETIRE'] })
  etatContenuDossier!: string;

  @ApiProperty({ enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINE'] })
  etatPriseEnCharge!: string;

  @ApiProperty({
    type: 'object',
    properties: {
      idDossier: { type: 'string', format: 'uuid' },
      referenceDossier: { type: 'string' },
      statutDossier: { type: 'string' },
      priorite: { type: 'string' },
    },
  })
  dossier!: {
    idDossier: string;
    referenceDossier: string;
    statutDossier: string;
    priorite: string;
  };

  @ApiProperty({
    type: 'object',
    properties: {
      idTypeDechet: { type: 'string', format: 'uuid' },
      codeType: { type: 'string' },
      libelle: { type: 'string' },
    },
  })
  typeDechet!: { idTypeDechet: string; codeType: string; libelle: string };
}

export class PendingAssignmentContentListResponseDto {
  @ApiProperty({ type: [PendingAssignmentContentDto] })
  items!: PendingAssignmentContentDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}
