import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const STATISTICS_PERIODS = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'SEMIANNUAL',
  'ANNUAL',
] as const;

export type StatisticsPeriod = (typeof STATISTICS_PERIODS)[number];

export class StatisticsQueryDto {
  @ApiPropertyOptional({ enum: STATISTICS_PERIODS, default: 'MONTHLY' })
  @IsOptional()
  @IsIn(STATISTICS_PERIODS)
  period: StatisticsPeriod = 'MONTHLY';
}
