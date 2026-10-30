import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { FunctionalRole } from '@isieco/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
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
    const nom = typeof metadata.nom === 'string' && metadata.nom.trim()
      ? metadata.nom.trim()
      : typeof metadata.full_name === 'string' && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : email.split('@')[0] ?? 'Utilisateur';
    const prenom = typeof metadata.prenom === 'string' && metadata.prenom.trim()
      ? metadata.prenom.trim()
      : null;

    const citizenRole = await this.prisma.role.upsert({
      where: { codeRole: 'CITOYEN' },
      update: {},
      create: {
        codeRole: 'CITOYEN',
        libelleRole: 'Citoyen',
        description: 'Utilisateur citoyen pouvant déposer et suivre ses signalements.',
      },
    });

    await this.prisma.utilisateur.upsert({
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
    });

    return this.findProfile(authUser.id);
  }

  async updateMyProfile(authUser: User, dto: UpdateMyProfileDto) {
    const current = await this.getOrCreateMyProfile(authUser);
    await this.prisma.utilisateur.update({
      where: { idUtilisateur: current.utilisateurId },
      data: {
        ...(dto.nom !== undefined ? { nom: dto.nom.trim() } : {}),
        ...(dto.prenom !== undefined ? { prenom: dto.prenom.trim() || null } : {}),
        ...(dto.telephone !== undefined ? { telephone: dto.telephone.trim() || null } : {}),
      },
    });
    return this.findProfile(authUser.id);
  }

  async listAccounts(page: number, pageSize: number) {
    const now = new Date();
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.utilisateur.count(),
      this.prisma.utilisateur.findMany({
        orderBy: { dateInscription: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { roles: { where: activeRoleFilter(now), include: { role: true } } },
      }),
    ]);
    return { items: rows.map((row) => this.toProfileResponse(row)), page, pageSize, total };
  }

  async assignRole(targetId: string, actorAuthUserId: string, dto: AssignRoleDto) {
    const [target, actor, role] = await Promise.all([
      this.prisma.utilisateur.findUnique({ where: { idUtilisateur: targetId } }),
      this.prisma.utilisateur.findUnique({ where: { authUserId: actorAuthUserId } }),
      this.prisma.role.findUnique({ where: { codeRole: dto.codeRole } }),
    ]);
    if (!target) throw new NotFoundException('Compte cible introuvable.');
    if (target.etatCompte !== 'ACTIF') throw new ForbiddenException('Le compte cible est inactif.');
    if (!actor) throw new ForbiddenException('Compte administrateur métier introuvable.');
    if (!role) throw new NotFoundException('Rôle introuvable. Vérifiez les migrations.');

    const now = new Date();
    const motif = dto.motif?.trim() || 'Attribution par un administrateur des comptes.';

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.utilisateurRole.findFirst({
          where: { idUtilisateur: targetId, idRole: role.idRole, ...activeRoleFilter(now) },
        });
        if (existing) {
          throw new ConflictException('Ce rôle est déjà actif pour cet utilisateur.');
        }

        await tx.utilisateurRole.create({
          data: {
            utilisateur: { connect: { idUtilisateur: targetId } },
            role: { connect: { idRole: role.idRole } },
            attribuant: { connect: { idUtilisateur: actor.idUtilisateur } },
            motif,
          },
        });

        await tx.evenementMetier.create({
          data: {
            typeEvenement: 'ROLE_ATTRIBUE',
            dateEvenement: now,
            dateEnregistrement: now,
            origine: 'API',
            idActeur: actor.idUtilisateur,
            idUtilisateurCible: targetId,
            donneesApres: {
              codeRole: dto.codeRole,
              roleId: role.idRole,
              dateDebut: now.toISOString(),
            },
            motif,
            versionSchema: 1,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException('Attribution concurrente du rôle. Actualisez le compte puis réessayez.');
      }
      throw error;
    }

    return this.findProfileById(targetId);
  }

  async revokeRole(targetId: string, actorAuthUserId: string, codeRole: FunctionalRole) {
    const [target, actor, role] = await Promise.all([
      this.prisma.utilisateur.findUnique({ where: { idUtilisateur: targetId } }),
      this.prisma.utilisateur.findUnique({ where: { authUserId: actorAuthUserId } }),
      this.prisma.role.findUnique({ where: { codeRole } }),
    ]);
    if (!target) throw new NotFoundException('Compte cible introuvable.');
    if (!actor) throw new ForbiddenException('Compte administrateur métier introuvable.');
    if (!role) throw new NotFoundException('Rôle introuvable.');

    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const assignment = await tx.utilisateurRole.findFirst({
          where: { idUtilisateur: targetId, idRole: role.idRole, ...activeRoleFilter(now) },
        });
        if (!assignment) throw new NotFoundException('Aucune attribution active trouvée.');

        if (codeRole === 'ADMINISTRATEUR_COMPTES') {
          const adminCount = await tx.utilisateurRole.count({
            where: {
              idRole: role.idRole,
              ...activeRoleFilter(now),
              utilisateur: { etatCompte: 'ACTIF' },
            },
          });
          if (adminCount <= 1) throw new ConflictException('Le dernier administrateur ne peut pas être révoqué.');
        }

        const motif = 'Rôle révoqué par un administrateur des comptes.';
        const result = await tx.utilisateurRole.updateMany({
          where: {
            idUtilisateur: targetId,
            idRole: role.idRole,
            dateDebut: assignment.dateDebut,
            dateFin: assignment.dateFin,
          },
          data: { dateFin: now, motif },
        });
        if (result.count !== 1) throw new ConflictException('Attribution modifiée simultanément. Réessayez.');

        await tx.evenementMetier.create({
          data: {
            typeEvenement: 'ROLE_REVOQUE',
            dateEvenement: now,
            dateEnregistrement: now,
            origine: 'API',
            idActeur: actor.idUtilisateur,
            idUtilisateurCible: targetId,
            donneesAvant: {
              codeRole,
              roleId: role.idRole,
              dateDebut: assignment.dateDebut.toISOString(),
              dateFinPrevue: assignment.dateFin?.toISOString() ?? null,
            },
            donneesApres: {
              dateFin: now.toISOString(),
            },
            motif,
            versionSchema: 1,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') {
        throw new ConflictException('Conflit de transaction. Réessayez.');
      }
      throw error;
    }
    return this.findProfileById(targetId);
  }

  private async findProfile(authUserId: string) {
    const row = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      include: { roles: { where: activeRoleFilter(new Date()), include: { role: true } } },
    });
    if (!row) throw new NotFoundException('Profil métier introuvable.');
    if (row.etatCompte !== 'ACTIF') throw new ForbiddenException('Compte désactivé.');
    return this.toProfileResponse(row);
  }

  private async findProfileById(utilisateurId: string) {
    const row = await this.prisma.utilisateur.findUnique({
      where: { idUtilisateur: utilisateurId },
      include: { roles: { where: activeRoleFilter(new Date()), include: { role: true } } },
    });
    if (!row) throw new NotFoundException('Profil métier introuvable.');
    return this.toProfileResponse(row);
  }

  private toProfileResponse(row: {
    idUtilisateur: string; authUserId: string; nom: string; prenom: string | null;
    email: string; telephone: string | null; referenceAvatar: string | null;
    dateInscription: Date; etatCompte: string;
    roles: Array<{ role: { codeRole: string; libelleRole: string } }>;
  }) {
    return {
      utilisateurId: row.idUtilisateur,
      authUserId: row.authUserId,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone,
      referenceAvatar: row.referenceAvatar,
      dateInscription: row.dateInscription,
      etatCompte: row.etatCompte,
      roles: row.roles.map(({ role }) => ({
        code: role.codeRole as FunctionalRole,
        libelle: role.libelleRole,
      })),
    };
  }
}
