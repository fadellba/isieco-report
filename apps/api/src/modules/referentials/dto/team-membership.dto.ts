import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTeamMembershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idUtilisateur!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateDebut!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fonction!: string;
}

export class EndTeamMembershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idUtilisateur!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateDebut!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  dateFin!: string;
}
