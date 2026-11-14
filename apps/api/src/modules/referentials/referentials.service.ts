import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { recordBusinessEvent } from '../../infrastructure/audit/business-audit.js';
import type { CreateTeamDto } from './dto/create-team.dto.js';
import type { CreateWasteTypeDto } from './dto/create-waste-type.dto.js';
import type { UpdateTeamDto } from './dto/update-team.dto.js';
import type { UpdateWasteTypeDto } from './dto/update-waste-type.dto.js';
import type { CreateTeamMembershipDto, EndTeamMembershipDto } from './dto/team-membership.dto.js';
import type { CreateTeamSkillDto, EndTeamSkillDto } from './dto/team-skill.dto.js';

type Transaction = Prisma.TransactionClient;

@Injectable()
export class ReferentialsService {
  constructor(private readonly prisma: PrismaService) {}

  private async actorId(authUserId: string): Promise<string> {
    const actor = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!actor || actor.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un gestionnaire de référentiel actif est requis.');
    }
    return actor.idUtilisateur;
  }

  async listWasteTypes(includeInactive = false) {
    return this.prisma.typeDechet.findMany({
      where: includeInactive ? {} : { actif: true },
      orderBy: [{ libelle: 'asc' }, { codeType: 'asc' }],
    });
  }

  async createWasteType(dto: CreateWasteTypeDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.typeDechet.create({
          data: {
            codeType: dto.codeType.trim().toUpperCase(),
            libelle: dto.libelle.trim(),
            description: dto.description?.trim() || null,
            actif: true,
          },
        });
        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'TYPE_DECHET_CREE',
          entityType: 'REFERENTIEL',
          entityId: created.idTypeDechet,
        });
        return created;
      });
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) {
        throw new ConflictException('Un type de déchet utilise déjà ce code.');
      }
      throw error;
    }
  }

  async updateWasteType(id: string, dto: UpdateWasteTypeDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.typeDechet.updateMany({
        where: { idTypeDechet: id },
        data: {
          ...(dto.libelle !== undefined ? { libelle: dto.libelle.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.actif !== undefined ? { actif: dto.actif } : {}),
        },
      });
      if (updated.count !== 1) throw new NotFoundException('Type de déchet introuvable.');
      const result = await tx.typeDechet.findUniqueOrThrow({ where: { idTypeDechet: id } });
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'TYPE_DECHET_MODIFIE',
        entityType: 'REFERENTIEL',
        entityId: id,
      });
      return result;
    });
  }

  async listTeams() {
    const now = new Date();
    const teams = await this.prisma.equipe.findMany({
      orderBy: [{ nomEquipe: 'asc' }, { idEquipe: 'asc' }],
      include: {
        appartenances: {
          where: {
            dateDebut: { lte: now },
            OR: [{ dateFin: null }, { dateFin: { gt: now } }],
            utilisateur: { etatCompte: 'ACTIF' },
          },
          orderBy: { dateDebut: 'asc' },
          include: {
            utilisateur: {
              select: { idUtilisateur: true, nom: true, prenom: true, email: true, etatCompte: true },
            },
          },
        },
        competences: {
          where: { actif: true },
          orderBy: { dateAttribution: 'asc' },
          include: { typeDechet: { select: { idTypeDechet: true, codeType: true, libelle: true } } },
        },
      },
    });
    return teams;
  }

  async createTeam(dto: CreateTeamDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.equipe.create({
        data: {
          nomEquipe: dto.nomEquipe.trim(),
          description: dto.description?.trim() || null,
          etatEquipe: dto.etatEquipe.trim().toUpperCase() || 'ACTIVE',
        },
      });
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'EQUIPE_CREEE',
        entityType: 'EQUIPE',
        entityId: created.idEquipe,
      });
      return created;
    });
  }

  async updateTeam(teamId: string, dto: UpdateTeamDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.equipe.updateMany({
        where: { idEquipe: teamId },
        data: {
          ...(dto.nomEquipe !== undefined ? { nomEquipe: dto.nomEquipe.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.etatEquipe !== undefined ? { etatEquipe: dto.etatEquipe.trim().toUpperCase() } : {}),
        },
      });
      if (updated.count !== 1) throw new NotFoundException('Équipe introuvable.');
      const result = await tx.equipe.findUniqueOrThrow({ where: { idEquipe: teamId } });
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'EQUIPE_MODIFIEE',
        entityType: 'EQUIPE',
        entityId: teamId,
      });
      return result;
    });
  }

  async addMembership(teamId: string, dto: CreateTeamMembershipDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const dateDebut = dto.dateDebut ? new Date(dto.dateDebut) : new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [team, member] = await Promise.all([
          tx.equipe.findUnique({ where: { idEquipe: teamId }, select: { idEquipe: true } }),
          tx.utilisateur.findUnique({
            where: { idUtilisateur: dto.idUtilisateur },
            select: { idUtilisateur: true, etatCompte: true },
          }),
        ]);
        if (!team) throw new NotFoundException('Équipe introuvable.');
        if (!member) throw new NotFoundException('Utilisateur introuvable.');
        if (member.etatCompte !== 'ACTIF') {
          throw new ConflictException('Un compte inactif ne peut pas rejoindre une équipe.');
        }

        const existing = await tx.appartenanceEquipe.findFirst({
          where: { idEquipe: teamId, idUtilisateur: dto.idUtilisateur, dateFin: null },
          select: { idEquipe: true },
        });
        if (existing) throw new ConflictException('Cet utilisateur appartient déjà à cette équipe.');

        const created = await tx.appartenanceEquipe.create({
          data: {
            idEquipe: teamId,
            idUtilisateur: dto.idUtilisateur,
            dateDebut,
            dateFin: null,
            fonction: dto.fonction.trim(),
          },
        });
        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'APPARTENANCE_EQUIPE_AJOUTEE',
          entityType: 'APPARTENANCE',
          entityId: dto.idUtilisateur,
          metadata: { teamId },
        });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException('Une appartenance active existe déjà.');
      }
      throw error;
    }
  }

  async endMembership(teamId: string, dto: EndTeamMembershipDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.appartenanceEquipe.updateMany({
        where: {
          idEquipe: teamId,
          idUtilisateur: dto.idUtilisateur,
          dateDebut: new Date(dto.dateDebut),
          dateFin: null,
        },
        data: { dateFin: dto.dateFin ? new Date(dto.dateFin) : new Date() },
      });
      if (result.count !== 1) throw new NotFoundException('Appartenance active introuvable.');
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'APPARTENANCE_EQUIPE_TERMINEE',
        entityType: 'APPARTENANCE',
        entityId: dto.idUtilisateur,
        metadata: { teamId },
      });
      return { idEquipe: teamId, idUtilisateur: dto.idUtilisateur, terminee: true };
    });
  }

  async addSkill(teamId: string, dto: CreateTeamSkillDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const [team, wasteType] = await Promise.all([
        tx.equipe.findUnique({ where: { idEquipe: teamId }, select: { idEquipe: true, etatEquipe: true } }),
        tx.typeDechet.findUnique({ where: { idTypeDechet: dto.idTypeDechet }, select: { idTypeDechet: true, actif: true } }),
      ]);
      if (!team) throw new NotFoundException('Équipe introuvable.');
      if (team.etatEquipe !== 'ACTIVE') throw new ConflictException('Une équipe inactive ne peut recevoir de compétence.');
      if (!wasteType) throw new NotFoundException('Type de déchet introuvable.');
      if (!wasteType.actif) throw new ConflictException('Une compétence ne peut être ajoutée à un type de déchet inactif.');

      const existing = await tx.competenceEquipe.findUnique({
        where: { idEquipe_idTypeDechet: { idEquipe: teamId, idTypeDechet: dto.idTypeDechet } },
        select: { idCompetenceEquipe: true, actif: true },
      });
      if (existing?.actif) throw new ConflictException('Cette compétence est déjà active pour cette équipe.');

      const skill = existing
        ? await tx.competenceEquipe.update({
            where: { idCompetenceEquipe: existing.idCompetenceEquipe },
            data: {
              actif: true,
              dateAttribution: new Date(),
              commentaire: dto.commentaire?.trim() || null,
            },
          })
        : await tx.competenceEquipe.create({
            data: {
              idEquipe: teamId,
              idTypeDechet: dto.idTypeDechet,
              actif: true,
              dateAttribution: new Date(),
              commentaire: dto.commentaire?.trim() || null,
            },
          });
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'COMPETENCE_EQUIPE_AJOUTEE',
        entityType: 'COMPETENCE',
        entityId: skill.idCompetenceEquipe,
        metadata: { teamId },
      });
      return skill;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async endSkill(teamId: string, dto: EndTeamSkillDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.competenceEquipe.updateMany({
        where: { idCompetenceEquipe: dto.idCompetenceEquipe, idEquipe: teamId, actif: true },
        data: { actif: false },
      });
      if (result.count !== 1) throw new NotFoundException('Compétence active introuvable.');
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'COMPETENCE_EQUIPE_TERMINEE',
        entityType: 'COMPETENCE',
        entityId: dto.idCompetenceEquipe,
        metadata: { teamId },
      });
      return { idCompetenceEquipe: dto.idCompetenceEquipe, idEquipe: teamId, actif: false };
    });
  }


}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
