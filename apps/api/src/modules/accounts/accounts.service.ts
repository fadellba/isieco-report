import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { FunctionalRole } from '@isieco/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { recordBusinessEvent } from '../../infrastructure/audit/business-audit.js';
import type { AssignRoleDto } from './dto/assign-role.dto.js';
import type { UpdateMyProfileDto } from './dto/update-my-profile.dto.js';

const activeRoleFilter = (now: Date) => ({
  dateDebut: { lte: now },
  OR: [{ dateFin: null }, { dateFin: { gt: now } }],
});

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateMyProfile(authUser: User) {
    const email = authUser.email?.trim().toLowerCase();
    if (!email || !authUser.email_confirmed_at) {
      throw new UnauthorizedException('Une adresse e-mail confirmée est requise.');
    }

    const metadata = authUser.user_metadata ?? {};
    const nom =
      (typeof metadata.nom === 'string' && metadata.nom.trim()) ||
      (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
      email.split('@')[0] ||
      'Utilisateur';
    const prenom = typeof metadata.prenom === 'string' && metadata.prenom.trim()
      ? metadata.prenom.trim()
      : null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.utilisateur.findUnique({
          where: { authUserId: authUser.id },
          select: { idUtilisateur: true },
        });
        const citizenRole = await tx.role.upsert({
          where: { codeRole: 'CITOYEN' },
          update: {},
          create: {
            codeRole: 'CITOYEN',
            libelleRole: 'Citoyen',
            description: 'Dépose et suit ses signalements.',
          },
        });

        const profile = await tx.utilisateur.upsert({
          where: { authUserId: authUser.id },
          create: {
            authUserId: authUser.id,
            email,
            nom,
            prenom,
            roles: {
              create: {
                role: { connect: { idRole: citizenRole.idRole } },
                motif: 'Attribution automatique à la création du profil citoyen.',
              },
            },
          },
          update: { email },
          select: { idUtilisateur: true },
        });

        if (!existing) {
          // Self-provisioning is a system-originated event; do not copy auth metadata or PII.
          await recordBusinessEvent(tx, {
            actorId: null,
            actionCode: 'COMPTE_CREE',
            entityType: 'UTILISATEUR',
            entityId: profile.idUtilisateur,
          });
          await recordBusinessEvent(tx, {
            actorId: null,
            actionCode: 'ROLE_ATTRIBUE',
            entityType: 'UTILISATEUR',
            entityId: profile.idUtilisateur,
            metadata: { result: 'CITOYEN' },
          });
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      // A concurrent first sign-in may win the unique insert. Its committed account
      // and audit events are authoritative; only suppress the conflict if it exists.
      if (!isPrismaCode(error, 'P2002') && !isPrismaCode(error, 'P2034')) throw error;
      const concurrentProfile = await this.prisma.utilisateur.findUnique({
        where: { authUserId: authUser.id },
        select: { idUtilisateur: true },
      });
      if (!concurrentProfile) throw error;
    }

    return this.findProfile(authUser.id);
  }

  async updateMyProfile(authUser: User, dto: UpdateMyProfileDto) {
    const current = await this.getOrCreateMyProfile(authUser);
    const data = {
      ...(dto.nom !== undefined && dto.nom.trim() !== current.nom ? { nom: dto.nom.trim() } : {}),
      ...(dto.prenom !== undefined && (dto.prenom?.trim() || null) !== current.prenom
        ? { prenom: dto.prenom?.trim() || null }
        : {}),
      ...(dto.telephone !== undefined && (dto.telephone?.trim() || null) !== current.telephone
        ? { telephone: dto.telephone?.trim() || null }
        : {}),
    };

    if (Object.keys(data).length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.utilisateur.update({
          where: { idUtilisateur: current.utilisateurId },
          data,
        });
        await recordBusinessEvent(tx, {
          actorId: current.utilisateurId,
          actionCode: 'COMPTE_PROFIL_MODIFIE',
          entityType: 'UTILISATEUR',
          entityId: current.utilisateurId,
        });
      });
    }
    return this.findProfile(authUser.id);
  }

  async listAccounts(page: number, pageSize: number) {
    const now = new Date();
    const where = {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.utilisateur.count({ where }),
      this.prisma.utilisateur.findMany({
        where,
        orderBy: [{ dateInscription: 'desc' }, { idUtilisateur: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          roles: {
            where: activeRoleFilter(now),
            include: { role: true },
            orderBy: { dateDebut: 'asc' },
          },
        },
      }),
    ]);

    return {
      items: rows.map((row) => this.toProfileResponse(row)),
      page,
      pageSize,
      total,
    };
  }

  async assignRole(utilisateurId: string, actorAuthUserId: string, dto: AssignRoleDto) {
    const actorId = await this.requireActiveAdministrator(actorAuthUserId);
    const target = await this.prisma.utilisateur.findUnique({
      where: { idUtilisateur: utilisateurId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!target) throw new NotFoundException('Compte cible introuvable.');
    if (target.etatCompte !== 'ACTIF') {
      throw new ConflictException('Un rôle ne peut être attribué qu’à un compte actif.');
    }

    const role = await this.prisma.role.findUnique({ where: { codeRole: dto.codeRole } });
    if (!role) throw new NotFoundException('Rôle introuvable.');

    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.utilisateurRole.findFirst({
          where: {
            idUtilisateur: utilisateurId,
            idRole: role.idRole,
            ...activeRoleFilter(now),
          },
        });
        if (existing) throw new ConflictException('Ce rôle est déjà actif pour ce compte.');

        await tx.utilisateurRole.create({
          data: {
            idUtilisateur: utilisateurId,
            idRole: role.idRole,
            dateDebut: now,
            attribuePar: actorId,
            motif: dto.motif?.trim() || null,
          },
        });
        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'ROLE_ATTRIBUE',
          entityType: 'UTILISATEUR',
          entityId: utilisateurId,
          metadata: { result: dto.codeRole },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException('Une attribution concurrente de ce rôle a été détectée.');
      }
      throw error;
    }

    return this.findProfileById(utilisateurId);
  }

  async revokeRole(utilisateurId: string, actorAuthUserId: string, codeRole: FunctionalRole) {
    const actorId = await this.requireActiveAdministrator(actorAuthUserId);
    const target = await this.prisma.utilisateur.findUnique({
      where: { idUtilisateur: utilisateurId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!target) throw new NotFoundException('Compte cible introuvable.');

    const role = await this.prisma.role.findUnique({ where: { codeRole } });
    if (!role) throw new NotFoundException('Rôle introuvable.');

    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const active = await tx.utilisateurRole.findFirst({
          where: {
            idUtilisateur: utilisateurId,
            idRole: role.idRole,
            ...activeRoleFilter(now),
          },
        });
        if (!active) throw new NotFoundException('Aucune attribution active de ce rôle.');

        if (codeRole === 'ADMINISTRATEUR_COMPTES') {
          const activeAdministrators = await tx.utilisateurRole.count({
            where: {
              role: { codeRole: 'ADMINISTRATEUR_COMPTES' },
              utilisateur: { etatCompte: 'ACTIF' },
              ...activeRoleFilter(now),
            },
          });
          if (activeAdministrators <= 1) {
            throw new ConflictException('La révocation du dernier administrateur des comptes est interdite.');
          }
        }

        const result = await tx.utilisateurRole.updateMany({
          where: {
            idUtilisateur: utilisateurId,
            idRole: role.idRole,
            dateDebut: active.dateDebut,
            dateFin: null,
          },
          data: { dateFin: now },
        });
        if (result.count !== 1) {
          throw new ConflictException('L’attribution du rôle a été modifiée simultanément.');
        }
        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'ROLE_REVOQUE',
          entityType: 'UTILISATEUR',
          entityId: utilisateurId,
          metadata: { result: codeRole },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      if (isPrismaCode(error, 'P2034')) {
        throw new ConflictException('Une modification concurrente des habilitations a été détectée.');
      }
      throw error;
    }

    return this.findProfileById(utilisateurId);
  }

  private async requireActiveAdministrator(authUserId: string): Promise<string> {
    const actor = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      include: {
        roles: {
          where: {
            ...activeRoleFilter(new Date()),
            role: { codeRole: 'ADMINISTRATEUR_COMPTES' },
          },
          include: { role: true },
        },
      },
    });
    if (!actor || actor.etatCompte !== 'ACTIF' || actor.roles.length === 0) {
      throw new ForbiddenException('Un administrateur des comptes actif est requis.');
    }
    return actor.idUtilisateur;
  }

  private async findProfile(authUserId: string) {
    const row = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      include: {
        roles: {
          where: activeRoleFilter(new Date()),
          include: { role: true },
          orderBy: { dateDebut: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException('Profil métier introuvable.');
    if (row.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Ce compte est désactivé.');
    }
    return this.toProfileResponse(row);
  }

  private async findProfileById(utilisateurId: string) {
    const row = await this.prisma.utilisateur.findUnique({
      where: { idUtilisateur: utilisateurId },
      include: {
        roles: {
          where: activeRoleFilter(new Date()),
          include: { role: true },
          orderBy: { dateDebut: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException('Profil métier introuvable.');
    return this.toProfileResponse(row);
  }

  private toProfileResponse(row: {
    idUtilisateur: string;
    authUserId: string;
    nom: string;
    prenom: string | null;
    email: string;
    telephone: string | null;
    dateInscription: Date;
    etatCompte: string;
    roles: Array<{ role: { codeRole: string; libelleRole: string } }>;
  }) {
    return {
      utilisateurId: row.idUtilisateur,
      authUserId: row.authUserId,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone,
      referenceAvatar: null,
      dateInscription: row.dateInscription,
      etatCompte: row.etatCompte,
      roles: row.roles.map(({ role }) => ({
        code: role.codeRole as FunctionalRole,
        libelle: role.libelleRole,
      })),
    };
  }
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
