import { ApiProperty } from '@nestjs/swagger';

export class ReportContentTypeDto {
  @ApiProperty({ example: 'ORGANIQUE' })
  codeType!: string;

  @ApiProperty({ example: 'Déchets organiques' })
  libelle!: string;
}

export class ReportContentDto {
  @ApiProperty({ format: 'uuid' })
  idTypeDechet!: string;

  @ApiProperty({ type: 'string', nullable: true, example: '2.000' })
  quantiteEstimee!: string | null;

  @ApiProperty({ type: 'string', nullable: true, example: '1.500' })
  volumeEstime!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  remarque!: string | null;

  @ApiProperty({ type: ReportContentTypeDto })
  typeDechet!: ReportContentTypeDto;
}

export class ReportPhotoDto {
  @ApiProperty({ format: 'uuid' })
  idPhotoSignalement!: string;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'date-time' })
  dateAjout!: Date;

  @ApiProperty({ example: 'EN_ATTENTE' })
  etatPublication!: string;
}

export class ReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateConstat!: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateSoumission!: Date | null;

  @ApiProperty()
  description!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  idCommune!: string | null;

  @ApiProperty({ type: 'string', nullable: true, example: '-14.716700' })
  latitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true, example: '-17.467700' })
  longitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  precisionLocalisation!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  descriptionLocalisation!: string | null;

  @ApiProperty({ example: 'SOUMIS' })
  statutSignalement!: string;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateDecision!: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  motifDecision!: string | null;

  @ApiProperty({ type: [ReportContentDto] })
  contenus!: ReportContentDto[];

  @ApiProperty({ type: [ReportPhotoDto] })
  photos!: ReportPhotoDto[];
}

export class ReportListResponseDto {
  @ApiProperty({ type: [ReportResponseDto] })
  items!: ReportResponseDto[];

  @ApiProperty({ minimum: 1, example: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100, example: 20 })
  pageSize!: number;

  @ApiProperty({ minimum: 0, example: 42 })
  total!: number;
}
