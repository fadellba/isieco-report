import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ format: 'date-time' })
  dateDebut!: Date;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateFin!: Date | null;
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
}

export class AssignmentContentDto {
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
  idDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ format: 'uuid' })
  idEquipe!: string;

  @ApiProperty({ format: 'uuid' })
  idCompetenceEquipe!: string;

  @ApiProperty({ format: 'date-time' })
  dateHeureAffectation!: Date;

  @ApiProperty({ format: 'uuid' })
  idDecideur!: string;

  @ApiProperty({ enum: ['ACTIVE', 'TERMINEE', 'ANNULEE'] })
  etatAffectation!: string;

  @ApiProperty({ type: 'string', nullable: true })
  motif!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  observation!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateFinAffectation!: Date | null;

  @ApiProperty({ enum: ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'] })
  decisionEquipe!: string;

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  reponduPar!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateReponseEquipe!: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  motifRefusEquipe!: string | null;

  @ApiProperty({ type: AssignmentTeamResponseDto })
  equipe!: AssignmentTeamResponseDto;

  @ApiProperty({ type: AssignmentCompetenceResponseDto })
  competence!: AssignmentCompetenceResponseDto;

  @ApiProperty({ type: AssignmentContentDto })
  contenuDossier!: AssignmentContentDto;
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
