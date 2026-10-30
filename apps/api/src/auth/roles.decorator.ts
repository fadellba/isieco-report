import { SetMetadata } from '@nestjs/common';
import type { FunctionalRole } from '@isieco/shared';

export const REQUIRED_ROLES_KEY = 'required-roles';
export const Roles = (...roles: FunctionalRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
