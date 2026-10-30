import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { FUNCTIONAL_ROLE_CODES, type FunctionalRole } from '@isieco/shared';

@Injectable()
export class FunctionalRolePipe implements PipeTransform<string, FunctionalRole> {
  transform(value: string): FunctionalRole {
    if (!FUNCTIONAL_ROLE_CODES.includes(value as FunctionalRole)) {
      throw new BadRequestException(`Code de rôle invalide : ${value}.`);
    }
    return value as FunctionalRole;
  }
}
