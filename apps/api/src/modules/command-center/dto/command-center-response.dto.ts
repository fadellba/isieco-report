import { ApiProperty } from '@nestjs/swagger';

export class CommandCenterSummaryDto {
  @ApiProperty({ minimum: 0 }) reportsAwaitingQualification!: number;
  @ApiProperty({ minimum: 0 }) reportsAwaitingCitizen!: number;
  @ApiProperty({ minimum: 0 }) openCases!: number;
  @ApiProperty({ minimum: 0 }) urgentCases!: number;
  @ApiProperty({ minimum: 0 }) activeAssignments!: number;
  @ApiProperty({ minimum: 0 }) activeInterventions!: number;
  @ApiProperty({ minimum: 0 }) pendingVerifications!: number;
  @ApiProperty({ minimum: 0 }) locatedItems!: number;
  @ApiProperty({ minimum: 0 }) withoutLocation!: number;
}

export class CommandCenterFeatureDto {
  @ApiProperty({ enum: ['DOSSIER', 'SIGNALEMENT'] })
  kind!: 'DOSSIER' | 'SIGNALEMENT';

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: 'string', nullable: true })
  priority!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  latitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  longitude!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  locationLabel!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  occurredAt!: Date | null;

  @ApiProperty({ type: [String] })
  teamNames!: string[];

  @ApiProperty({ minimum: 0 })
  activeInterventions!: number;

  @ApiProperty({ type: [String] })
  wasteTypes!: string[];
}

export class CommandCenterMapDto {
  @ApiProperty({ type: [CommandCenterFeatureDto] })
  items!: CommandCenterFeatureDto[];

  @ApiProperty({ minimum: 0 })
  totalLocated!: number;

  @ApiProperty()
  truncated!: boolean;

  @ApiProperty({ minimum: 1, maximum: 250 })
  limit!: number;
}

export class CommandCenterOverviewResponseDto {
  @ApiProperty({ type: CommandCenterSummaryDto })
  summary!: CommandCenterSummaryDto;

  @ApiProperty({ type: CommandCenterMapDto })
  map!: CommandCenterMapDto;

  @ApiProperty({ format: 'date-time' })
  generatedAt!: Date;
}
