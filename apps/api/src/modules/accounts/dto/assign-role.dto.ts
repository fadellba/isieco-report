import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FUNCTIONAL_ROLE_CODES } from '@isieco/shared';

export class AssignRoleDto {
  @ApiProperty({ enum: [...FUNCTIONAL_ROLE_CODES], example: 'AGENT_QUALIFICATION' })
  @IsIn([...FUNCTIONAL_ROLE_CODES])
  codeRole!: (typeof FUNCTIONAL_ROLE_CODES)[number];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string;
}
