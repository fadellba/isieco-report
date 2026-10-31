import { ApiProperty } from '@nestjs/swagger';

export class SupplementAnswerDto {
  @ApiProperty({ format: 'uuid' })
  idReponse!: string;

  @ApiProperty({ format: 'date-time' })
  dateReponse!: Date;

  @ApiProperty({ minLength: 10, maxLength: 4000 })
  contenu!: string;
}

export class ReportSupplementDto {
  @ApiProperty({ format: 'uuid' })
  idDemande!: string;

  @ApiProperty({ format: 'date-time' })
  dateDemande!: Date;

  @ApiProperty({ minLength: 5, maxLength: 2000 })
  motif!: string;

  @ApiProperty({ enum: ['OUVERTE', 'REPONDUE', 'CLOTUREE'] })
  etatDemande!: string;

  @ApiProperty({ type: SupplementAnswerDto, nullable: true })
  reponse!: SupplementAnswerDto | null;
}

export class ReportSupplementListResponseDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ type: [ReportSupplementDto] })
  demandes!: ReportSupplementDto[];
}
