import { ApiProperty } from '@nestjs/swagger';

export class InterventionAssignmentContentDto {
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

export class InterventionAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  idAffectation!: string;

  @ApiProperty({ format: 'uuid' })
  idEquipe!: string;

  @ApiProperty({ enum: ['ACTIVE', 'TERMINEE', 'ANNULEE'] })
  etatAffectation!: string;

  @ApiProperty({ enum: ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'] })
  decisionEquipe!: string;

  @ApiProperty({ type: InterventionAssignmentContentDto })
  contenuDossier!: InterventionAssignmentContentDto;

  @ApiProperty({
    type: 'object',
    nullable: true,
    properties: {
      dateVerification: { type: 'string', format: 'date-time' },
      etatVerification: { type: 'string', enum: ['VALIDEE', 'REPRISE'] },
    },
  })
  derniereVerification!: { dateVerification: Date; etatVerification: string } | null;
}

export class InterventionResponseDto {
  @ApiProperty({ format: 'uuid' })
  idIntervention!: string;

  @ApiProperty({ format: 'uuid' })
  idAffectation!: string;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateHeureDebut!: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateHeureFin!: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateSoumissionCompteRendu!: Date | null;

  @ApiProperty({ enum: ['EN_COURS', 'SOUMISE'] })
  statutIntervention!: string;

  @ApiProperty({ type: 'string', nullable: true, enum: ['TERMINEE', 'PARTIELLE', 'IMPOSSIBLE'] })
  resultatIntervention!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  compteRendu!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  motifException!: string | null;

  @ApiProperty({ format: 'uuid' })
  renseignePar!: string;

  @ApiProperty({ type: InterventionAssignmentDto })
  affectation!: InterventionAssignmentDto;
}


export class AgentTeamResponseDto {
  @ApiProperty({ format: 'uuid' })
  idEquipe!: string;

  @ApiProperty()
  nomEquipe!: string;

  @ApiProperty({ example: 'ACTIVE' })
  etatEquipe!: string;

  @ApiProperty({ format: 'date-time' })
  dateDebut!: Date;

  @ApiProperty()
  fonction!: string;
}
