import { ApiProperty } from '@nestjs/swagger';

export class ReportHistoryEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: Date;

  @ApiProperty({ enum: ['STATUT', 'OPERATION'] })
  type!: 'STATUT' | 'OPERATION';

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;
}

export class ReportHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  idSignalement!: string;

  @ApiProperty({ type: [ReportHistoryEventDto] })
  events!: ReportHistoryEventDto[];
}
