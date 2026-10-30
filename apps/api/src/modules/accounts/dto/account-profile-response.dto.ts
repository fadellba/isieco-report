import { ApiProperty } from '@nestjs/swagger';
import { FUNCTIONAL_ROLE_CODES, type FunctionalRole } from '@isieco/shared';

export class AccountRoleResponseDto {
  @ApiProperty({ enum: [...FUNCTIONAL_ROLE_CODES], example: 'CITOYEN' })
  code!: FunctionalRole;

  @ApiProperty({ example: 'Citoyen' })
  libelle!: string;
}

export class AccountProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  utilisateurId!: string;
  @ApiProperty({ format: 'uuid', description: 'Identifiant Supabase Auth.' })
  authUserId!: string;
  @ApiProperty({ example: 'Diallo' })
  nom!: string;
  @ApiProperty({ example: 'Aminata', nullable: true })
  prenom!: string | null;
  @ApiProperty({ format: 'email' })
  email!: string;
  @ApiProperty({ example: '+221770000000', nullable: true })
  telephone!: string | null;
  @ApiProperty({ nullable: true })
  referenceAvatar!: string | null;
  @ApiProperty({ format: 'date-time' })
  dateInscription!: string;
  @ApiProperty({ example: 'ACTIF' })
  etatCompte!: string;
  @ApiProperty({ type: [AccountRoleResponseDto] })
  roles!: AccountRoleResponseDto[];
}

export class AccountListResponseDto {
  @ApiProperty({ type: [AccountProfileResponseDto] })
  items!: AccountProfileResponseDto[];
  @ApiProperty({ example: 1, minimum: 1 })
  page!: number;
  @ApiProperty({ example: 20, minimum: 1, maximum: 100 })
  pageSize!: number;
  @ApiProperty({ example: 125, minimum: 0 })
  total!: number;
}
