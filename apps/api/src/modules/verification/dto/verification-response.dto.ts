import { ApiProperty } from '@nestjs/swagger';

export class VerificationInterventionDto {
  @ApiProperty({ format: 'uuid' })
  idIntervention!: string;

  @ApiProperty({ format: 'date-time' })
  dateHeureDebut!: Date;

  @ApiProperty({ format: 'date-time' })
  dateSoumissionCompteRendu!: Date;

  @ApiProperty({ enum: ['SOUMISE'] })
  statutIntervention!: string;

  @ApiProperty({ enum: ['TERMINEE', 'PARTIELLE', 'IMPOSSIBLE'] })
  resultatIntervention!: string;

  @ApiProperty()
  compteRendu!: string;

  @ApiProperty({ type: 'string', nullable: true })
  motifException!: string | null;

  @ApiProperty({ format: 'uuid' })
  renseignePar!: string;
}

export class VerificationContentDto {
  @ApiProperty({ format: 'uuid' })
  idDossier!: string;

  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ enum: ['ACTIF', 'RETIRE'] })
  etatContenuDossier!: string;

  @ApiProperty({ enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINE'] })
  etatPriseEnCharge!: string;

  @ApiProperty()
  referenceDossier!: string;

  @ApiProperty()
  statutDossier!: string;
}

export class VerificationAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  idAffectation!: string;

  @ApiProperty({ format: 'uuid' })
  idEquipe!: string;

  @ApiProperty()
  etatAffectation!: string;

  @ApiProperty()
  decisionEquipe!: string;

  @ApiProperty({ type: VerificationContentDto })
  contenuDossier!: VerificationContentDto;
}

export class VerificationQueueItemDto {
  @ApiProperty({ type: VerificationAssignmentDto })
  affectation!: VerificationAssignmentDto;

  @ApiProperty({ type: VerificationInterventionDto })
  intervention!: VerificationInterventionDto;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  derniereVerification!: Date | null;
}

export class VerificationQueueResponseDto {
  @ApiProperty({ type: [VerificationQueueItemDto] })
  items!: VerificationQueueItemDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}

export class VerificationDecisionResponseDto {
  @ApiProperty({ format: 'uuid' })
  idVerification!: string;

  @ApiProperty({ format: 'uuid' })
  idAffectation!: string;

  @ApiProperty({ format: 'uuid' })
  idVerificateur!: string;

  @ApiProperty({ format: 'date-time' })
  dateVerification!: Date;

  @ApiProperty({ enum: ['CONFORME', 'A_REPRENDRE'] })
  resultatVerification!: string;

  @ApiProperty({ enum: ['VALIDEE', 'REPRISE'] })
  etatVerification!: string;

  @ApiProperty({ type: 'string', nullable: true })
  motif!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  referencePreuve!: string | null;
}

export class VerificationDecisionResultDto {
  @ApiProperty({ type: VerificationDecisionResponseDto })
  verification!: VerificationDecisionResponseDto;

  @ApiProperty({ description: 'Vrai lorsque tous les contenus actifs du dossier sont terminés et que le dossier a été clôturé.' })
  dossierCloture!: boolean;
}
