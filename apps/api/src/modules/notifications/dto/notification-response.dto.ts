import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  actionCode!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty({ format: 'uuid' })
  entityId!: string;

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  dossierId!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  occurredAt!: Date;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;
}
