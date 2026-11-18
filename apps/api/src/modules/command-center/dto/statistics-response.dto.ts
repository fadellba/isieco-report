import { ApiProperty } from '@nestjs/swagger';
import { STATISTICS_PERIODS, type StatisticsPeriod } from './statistics-query.dto.js';

export class StatisticsTotalsDto {
  @ApiProperty({ minimum: 0 }) signalements!: number;
  @ApiProperty({ minimum: 0 }) dossiers!: number;
  @ApiProperty({ minimum: 0 }) affectations!: number;
  @ApiProperty({ minimum: 0 }) interventions!: number;
  @ApiProperty({ minimum: 0 }) verificationsConformes!: number;
}

export class StatisticsBucketDto {
  @ApiProperty({ type: 'string', format: 'date-time' }) bucketStart!: Date;
  @ApiProperty({ minimum: 0 }) signalements!: number;
  @ApiProperty({ minimum: 0 }) dossiers!: number;
  @ApiProperty({ minimum: 0 }) affectations!: number;
  @ApiProperty({ minimum: 0 }) interventions!: number;
}

export class StatisticsResponseDto {
  @ApiProperty({ enum: STATISTICS_PERIODS }) period!: StatisticsPeriod;
  @ApiProperty({ type: 'string', format: 'date-time' }) from!: Date;
  @ApiProperty({ type: 'string', format: 'date-time' }) to!: Date;
  @ApiProperty({ type: StatisticsTotalsDto }) totals!: StatisticsTotalsDto;
  @ApiProperty({ type: [StatisticsBucketDto] }) series!: StatisticsBucketDto[];
}
