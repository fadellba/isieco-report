import { ApiProperty } from '@nestjs/swagger';

export class NearbyReportItemDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ minimum: -90, maximum: 90, description: 'Latitude arrondie à trois décimales.' })
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180, description: 'Longitude arrondie à trois décimales.' })
  longitude!: number;

  @ApiProperty({ enum: ['QUALIFIE'] })
  statutSignalement!: 'QUALIFIE';

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dateSoumission!: Date | null;

  @ApiProperty({ minimum: 0, description: 'Distance arrondie au mètre depuis le centre de recherche.' })
  distanceMeters!: number;
}

export class NearbyReportsResponseDto {
  @ApiProperty({ minimum: 250, maximum: 5000 })
  radiusMeters!: number;

  @ApiProperty({ type: [NearbyReportItemDto] })
  items!: NearbyReportItemDto[];
}
