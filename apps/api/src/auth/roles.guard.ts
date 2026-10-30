import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@supabase/supabase-js';
import { PrismaService } from '../database/prisma.service.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedRequest } from './supabase-auth.guard.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authUser: User | undefined = request.authUser;
    if (!authUser) throw new ForbiddenException('Utilisateur non authentifié.');

    const now = new Date();
    const account = await this.prisma.utilisateur.findUnique({
      where: { authUserId: authUser.id },
      select: {
        etatCompte: true,
        roles: {
          where: {
            dateDebut: { lte: now },
            OR: [{ dateFin: null }, { dateFin: { gt: now } }],
          },
          select: { role: { select: { codeRole: true } } },
        },
      },
    });

    if (!account || account.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Compte absent, suspendu ou désactivé.');
    }

    const assignedRoles = new Set(account.roles.map(({ role }) => role.codeRole));
    if (!requiredRoles.some((role) => assignedRoles.has(role))) {
      throw new ForbiddenException('Vous ne disposez pas des habilitations nécessaires.');
    }
    return true;
  }
}
