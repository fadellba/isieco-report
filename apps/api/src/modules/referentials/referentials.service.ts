import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { CreateWasteTypeDto } from './dto/create-waste-type.dto.js';
import type { UpdateWasteTypeDto } from './dto/update-waste-type.dto.js';
import type { CreateRegionDto } from './dto/create-region.dto.js';
import type { UpdateRegionDto } from './dto/update-region.dto.js';
import type { CreateDepartmentDto } from './dto/create-department.dto.js';
import type { CreateCommuneDto } from './dto/create-commune.dto.js';
import type { UpdateDepartmentDto, UpdateCommuneDto } from './dto/update-geography.dto.js';
import type { CreateTeamDto } from './dto/create-team.dto.js';
import type { UpdateTeamDto } from './dto/update-team.dto.js';
import type { CreateTeamMembershipDto, EndTeamMembershipDto } from './dto/team-membership.dto.js';
import type { CreateTeamSkillDto, EndTeamSkillDto } from './dto/team-skill.dto.js';
import type { SetTeamAvailabilityDto } from './dto/team-availability.dto.js';
import type { CreateTeamDelegationDto, EndTeamDelegationDto } from './dto/team-delegation.dto.js';

type Transaction = Prisma.TransactionClient;
type EventTarget = { teamId?: string; wasteTypeId?: string; regionId?: string; departmentId?: string; communeId?: string };
type EventPayload = {
  type: string;
  actorId: string;
  target: EventTarget;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
};

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

@Injectable()
export class ReferentialsService {
  constructor(private readonly prisma: PrismaService) {}

  private async actorId(authUserId: string): Promise<string> {
    const actor = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!actor || actor.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un compte actif est requis pour administrer les référentiels.');
    }
    return actor.idUtilisateur;
  }

  private async requireTeam(teamId: string) {
    const team = await this.prisma.equipe.findUnique({ where: { idEquipe: teamId } });
    if (!team) throw new NotFoundException('Équipe introuvable.');
    return team;
  }

  private async writeEvent(tx: Transaction, payload: EventPayload): Promise<void> {
    const now = new Date();
    await tx.evenementMetier.create({
      data: {
        typeEvenement: payload.type,
        dateEvenement: now,
        dateEnregistrement: now,
        origine: 'API',
        idActeur: payload.actorId,
        ...(payload.target.teamId ? { idEquipeCible: payload.target.teamId } : {}),
        ...(payload.target.regionId ? { idRegionCible: payload.target.regionId } : {}),
        ...(payload.target.departmentId ? { idDepartementCible: payload.target.departmentId } : {}),
        ...(payload.target.communeId ? { idCommuneCible: payload.target.communeId } : {}),
        ...(payload.target.wasteTypeId ? { idTypeDechetCible: payload.target.wasteTypeId } : {}),
        ...(payload.before ? { donneesAvant: payload.before as Prisma.InputJsonObject } : {}),
        ...(payload.after ? { donneesApres: payload.after as Prisma.InputJsonObject } : {}),
        ...(payload.reason ? { motif: payload.reason } : {}),
        versionSchema: 1,
      },
    });
  }

  private rethrowUniqueConflict(error: unknown, message: string): never {
    if (isPrismaCode(error, 'P2002')) throw new ConflictException(message);
    throw error;
  }

  // Waste types: keep stable identifiers and close validity intervals instead of deleting rows.
  async listWasteTypes(includeInactive = false) {
    const now = new Date();
    return this.prisma.typeDechet.findMany({
      where: includeInactive
        ? {}
        : {
            dateDebutValidite: { lte: now },
            OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: now } }],
          },
      orderBy: [{ libelle: 'asc' }, { codeType: 'asc' }],
    });
  }

  async createWasteType(dto: CreateWasteTypeDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const dateDebutValidite = new Date(dto.dateDebutValidite);
    if (Number.isNaN(dateDebutValidite.getTime())) {
      throw new BadRequestException('La date de début de validité est invalide.');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const wasteType = await tx.typeDechet.create({
          data: {
            codeType: dto.codeType.trim(),
            libelle: dto.libelle.trim(),
            description: dto.description?.trim() || null,
            orientationSpecialisee: dto.orientationSpecialisee,
            dateDebutValidite,
          },
        });
        await this.writeEvent(tx, {
          type: 'REFERENTIEL_TYPE_DECHET_CREE',
          actorId,
          target: { wasteTypeId: wasteType.idTypeDechet },
          after: {
            codeType: wasteType.codeType,
            libelle: wasteType.libelle,
            dateDebutValidite: wasteType.dateDebutValidite.toISOString(),
          },
        });
        return wasteType;
      });
    } catch (error) {
      this.rethrowUniqueConflict(error, 'Un type de déchet avec ce code existe déjà.');
    }
  }

  async updateWasteType(id: string, dto: UpdateWasteTypeDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const current = await this.prisma.typeDechet.findUnique({ where: { idTypeDechet: id } });
    if (!current) throw new NotFoundException('Type de déchet introuvable.');

    const data = {
      ...(dto.libelle !== undefined ? { libelle: dto.libelle.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      ...(dto.orientationSpecialisee !== undefined
        ? { orientationSpecialisee: dto.orientationSpecialisee }
        : {}),
    };
    if (Object.keys(data).length === 0) return current;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.typeDechet.update({
        where: { idTypeDechet: id },
        data,
      });
      await this.writeEvent(tx, {
        type: 'REFERENTIEL_TYPE_DECHET_MODIFIE',
        actorId,
        target: { wasteTypeId: id },
        before: {
          libelle: current.libelle,
          description: current.description,
          orientationSpecialisee: current.orientationSpecialisee,
        },
        after: {
          libelle: updated.libelle,
          description: updated.description,
          orientationSpecialisee: updated.orientationSpecialisee,
        },
      });
      return updated;
    });
  }

  async closeWasteType(id: string, dateFin: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const current = await this.prisma.typeDechet.findUnique({ where: { idTypeDechet: id } });
    if (!current) throw new NotFoundException('Type de déchet introuvable.');
    if (current.dateFinValidite) throw new ConflictException('Ce type de déchet possède déjà une fin de validité.');
    const dateFinValidite = new Date(dateFin);
    if (
      Number.isNaN(dateFinValidite.getTime()) ||
      dateFinValidite.getTime() < current.dateDebutValidite.getTime()
    ) {
      throw new BadRequestException('La fin de validité doit être postérieure ou égale au début de validité.');
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.typeDechet.updateMany({
        where: { idTypeDechet: id, dateFinValidite: null },
        data: { dateFinValidite },
      });
      if (result.count !== 1) throw new ConflictException('Le type de déchet a été modifié simultanément.');
      await this.writeEvent(tx, {
        type: 'REFERENTIEL_TYPE_DECHET_CLOTURE',
        actorId,
        target: { wasteTypeId: id },
        before: { dateFinValidite: null },
        after: { dateFinValidite: dateFinValidite.toISOString() },
      });
      return tx.typeDechet.findUniqueOrThrow({ where: { idTypeDechet: id } });
    });
  }

  // Geography: names and codes remain immutable; references are deactivated, never physically deleted.
  async listRegions(includeInactive = false) {
    return this.prisma.region.findMany({
      where: includeInactive ? {} : { actif: true },
      orderBy: { nomRegion: 'asc' },
      include: {
        departements: {
          where: includeInactive ? {} : { actif: true },
          orderBy: { nomDepartement: 'asc' },
          include: {
            communes: {
              where: includeInactive ? {} : { actif: true },
              orderBy: { nomCommune: 'asc' },
            },
          },
        },
      },
    });
  }

  async createRegion(dto: CreateRegionDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const region = await tx.region.create({
          data: {
            codeRegion: dto.codeRegion?.trim() || null,
            nomRegion: dto.nomRegion.trim(),
            actif: dto.actif ?? true,
          },
        });
        await this.writeEvent(tx, {
          type: 'REFERENTIEL_REGION_CREE',
          actorId,
          target: { regionId: region.idRegion },
          after: { codeRegion: region.codeRegion, nomRegion: region.nomRegion, actif: region.actif },
        });
        return region;
      });
    } catch (error) {
      this.rethrowUniqueConflict(error, 'Une région avec ce code ou ce nom existe déjà.');
    }
  }

  async updateRegion(id: string, dto: UpdateRegionDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const current = await this.prisma.region.findUnique({ where: { idRegion: id } });
    if (!current) throw new NotFoundException('Région introuvable.');
    const actif = dto.actif;
    if (actif === undefined || actif === current.actif) return current;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.region.update({ where: { idRegion: id }, data: { actif } });
      await this.writeEvent(tx, {
        type: 'REFERENTIEL_REGION_ACTIVATION_MODIFIEE',
        actorId,
        target: { regionId: id },
        before: { actif: current.actif },
        after: { actif: updated.actif, nomRegion: updated.nomRegion },
      });
      return updated;
    });
  }

  async createDepartment(regionId: string, dto: CreateDepartmentDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const region = await this.prisma.region.findUnique({ where: { idRegion: regionId } });
    if (!region) throw new NotFoundException('Région introuvable.');
    if (!region.actif) throw new ConflictException('Une région inactive ne peut recevoir de nouveau département.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const department = await tx.departement.create({
          data: {
            idRegion: regionId,
            codeDepartement: dto.codeDepartement?.trim() || null,
            nomDepartement: dto.nomDepartement.trim(),
            actif: dto.actif ?? true,
          },
        });
        await this.writeEvent(tx, {
          type: 'REFERENTIEL_DEPARTEMENT_CREE',
          actorId,
          target: { departmentId: department.idDepartement },
          after: {
            codeDepartement: department.codeDepartement,
            nomDepartement: department.nomDepartement,
            regionId,
            actif: department.actif,
          },
        });
        return department;
      });
    } catch (error) {
      this.rethrowUniqueConflict(error, 'Un département avec ce code ou ce nom existe déjà dans cette région.');
    }
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const current = await this.prisma.departement.findUnique({ where: { idDepartement: id } });
    if (!current) throw new NotFoundException('Département introuvable.');
    const actif = dto.actif;
    if (actif === undefined || actif === current.actif) return current;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.departement.update({ where: { idDepartement: id }, data: { actif } });
      await this.writeEvent(tx, {
        type: 'REFERENTIEL_DEPARTEMENT_ACTIVATION_MODIFIEE',
        actorId,
        target: { departmentId: id },
        before: { actif: current.actif },
        after: { actif: updated.actif, nomDepartement: updated.nomDepartement, regionId: updated.idRegion },
      });
      return updated;
    });
  }

  async createCommune(departmentId: string, dto: CreateCommuneDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const department = await this.prisma.departement.findUnique({
      where: { idDepartement: departmentId },
      include: { region: true },
    });
    if (!department) throw new NotFoundException('Département introuvable.');
    if (!department.actif || !department.region.actif) {
      throw new ConflictException('Une commune ne peut être ajoutée à une subdivision inactive.');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const commune = await tx.commune.create({
          data: {
            idDepartement: departmentId,
            codeCommune: dto.codeCommune?.trim() || null,
            nomCommune: dto.nomCommune.trim(),
            actif: dto.actif ?? true,
          },
        });
        await this.writeEvent(tx, {
          type: 'REFERENTIEL_COMMUNE_CREE',
          actorId,
          target: { communeId: commune.idCommune },
          after: {
            codeCommune: commune.codeCommune,
            nomCommune: commune.nomCommune,
            departmentId,
            actif: commune.actif,
          },
        });
        return commune;
      });
    } catch (error) {
      this.rethrowUniqueConflict(error, 'Une commune avec ce code ou ce nom existe déjà dans ce département.');
    }
  }

  async updateCommune(id: string, dto: UpdateCommuneDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const current = await this.prisma.commune.findUnique({ where: { idCommune: id } });
    if (!current) throw new NotFoundException('Commune introuvable.');
    const actif = dto.actif;
    if (actif === undefined || actif === current.actif) return current;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.commune.update({ where: { idCommune: id }, data: { actif } });
      await this.writeEvent(tx, {
        type: 'REFERENTIEL_COMMUNE_ACTIVATION_MODIFIEE',
        actorId,
        target: { communeId: id },
        before: { actif: current.actif },
        after: { actif: updated.actif, nomCommune: updated.nomCommune, departmentId: updated.idDepartement },
      });
      return updated;
    });
  }

  // Teams and their temporal memberships, skills, availability and delegations.
  async listTeams() {
    const now = new Date();
    return this.prisma.equipe.findMany({
      orderBy: { nomEquipe: 'asc' },
      include: {
        appartenances: {
          where: { dateDebut: { lte: now }, OR: [{ dateFin: null }, { dateFin: { gt: now } }] },
          include: { utilisateur: { select: { idUtilisateur: true, nom: true, prenom: true, email: true } } },
          orderBy: { dateDebut: 'desc' },
        },
        competences: {
          where: { dateDebut: { lte: now }, OR: [{ dateFin: null }, { dateFin: { gt: now } }] },
          include: { typeDechet: true },
          orderBy: { dateDebut: 'desc' },
        },
        disponibilite: true,
      },
    });
  }

  async createTeam(dto: CreateTeamDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.equipe.create({
        data: {
          nomEquipe: dto.nomEquipe.trim(),
          description: dto.description?.trim() || null,
          etatEquipe: dto.etatEquipe.trim(),
        },
      });
      await this.writeEvent(tx, {
        type: 'EQUIPE_CREEE',
        actorId,
        target: { teamId: team.idEquipe },
        after: {
          nomEquipe: team.nomEquipe,
          etatEquipe: team.etatEquipe,
        },
      });
      return team;
    });
  }

  async updateTeam(id: string, dto: UpdateTeamDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const current = await this.requireTeam(id);
    if (Object.keys(dto).length === 0) return current;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.equipe.update({
        where: { idEquipe: id },
        data: {
          ...(dto.nomEquipe !== undefined ? { nomEquipe: dto.nomEquipe.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.etatEquipe !== undefined ? { etatEquipe: dto.etatEquipe.trim() } : {}),
        },
      });
      await this.writeEvent(tx, {
        type: 'EQUIPE_MODIFIEE',
        actorId,
        target: { teamId: id },
        before: { nomEquipe: current.nomEquipe, etatEquipe: current.etatEquipe },
        after: { nomEquipe: updated.nomEquipe, etatEquipe: updated.etatEquipe },
      });
      return updated;
    });
  }

  async addMembership(teamId: string, dto: CreateTeamMembershipDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const [team, user] = await Promise.all([
      this.requireTeam(teamId),
      this.prisma.utilisateur.findUnique({
        where: { idUtilisateur: dto.idUtilisateur },
        select: { idUtilisateur: true, etatCompte: true },
      }),
    ]);
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (user.etatCompte !== 'ACTIF') throw new ConflictException('Un compte inactif ne peut rejoindre une équipe.');
    const dateDebut = new Date(dto.dateDebut);
    return this.prisma.$transaction(async (tx) => {
      try {
        const membership = await tx.appartenanceEquipe.create({
          data: {
            idUtilisateur: user.idUtilisateur,
            idEquipe: team.idEquipe,
            dateDebut,
            fonction: dto.fonction.trim(),
          },
        });
        await this.writeEvent(tx, {
          type: 'EQUIPE_MEMBRE_AJOUTE',
          actorId,
          target: { teamId },
          after: {
            utilisateurId: user.idUtilisateur,
            dateDebut: dateDebut.toISOString(),
            fonction: membership.fonction,
          },
        });
        return membership;
      } catch (error) {
        this.rethrowUniqueConflict(error, 'Une appartenance identique ou déjà active existe pour cet utilisateur et cette équipe.');
      }
    });
  }

  async endMembership(teamId: string, dto: EndTeamMembershipDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = new Date(dto.dateFin);
    if (dateFin.getTime() < dateDebut.getTime()) {
      throw new BadRequestException('La fin d’appartenance doit être postérieure ou égale au début.');
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.appartenanceEquipe.findUnique({
        where: {
          idUtilisateur_idEquipe_dateDebut: {
            idUtilisateur: dto.idUtilisateur,
            idEquipe: teamId,
            dateDebut,
          },
        },
      });
      if (!current) throw new NotFoundException('Appartenance introuvable.');
      if (current.dateFin) throw new ConflictException('Cette appartenance est déjà clôturée.');
      const update = await tx.appartenanceEquipe.updateMany({
        where: { idUtilisateur: dto.idUtilisateur, idEquipe: teamId, dateDebut, dateFin: null },
        data: { dateFin },
      });
      if (update.count !== 1) throw new ConflictException('L’appartenance a été modifiée simultanément.');
      await this.writeEvent(tx, {
        type: 'EQUIPE_MEMBRE_RETIRE',
        actorId,
        target: { teamId },
        before: { utilisateurId: dto.idUtilisateur, dateDebut: dateDebut.toISOString(), fonction: current.fonction },
        after: { dateFin: dateFin.toISOString() },
      });
      return { idUtilisateur: dto.idUtilisateur, idEquipe: teamId, dateDebut, dateFin };
    });
  }

  async addSkill(teamId: string, dto: CreateTeamSkillDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const [team, wasteType] = await Promise.all([
      this.requireTeam(teamId),
      this.prisma.typeDechet.findUnique({ where: { idTypeDechet: dto.idTypeDechet } }),
    ]);
    if (!wasteType) throw new NotFoundException('Type de déchet introuvable.');
    const dateDebut = new Date(dto.dateDebut);
    if (
      dateDebut.getTime() < wasteType.dateDebutValidite.getTime() ||
      (wasteType.dateFinValidite && dateDebut.getTime() > wasteType.dateFinValidite.getTime())
    ) {
      throw new ConflictException('La compétence doit commencer pendant la période de validité du type de déchet.');
    }
    return this.prisma.$transaction(async (tx) => {
      try {
        const skill = await tx.competenceEquipe.create({
          data: {
            idEquipe: team.idEquipe,
            idTypeDechet: wasteType.idTypeDechet,
            dateDebut,
            commentaire: dto.commentaire?.trim() || null,
            valideePar: actorId,
          },
        });
        await this.writeEvent(tx, {
          type: 'COMPETENCE_EQUIPE_AJOUTEE',
          actorId,
          target: { teamId },
          after: {
            competenceId: skill.idCompetenceEquipe,
            typeDechetId: wasteType.idTypeDechet,
            codeType: wasteType.codeType,
            dateDebut: dateDebut.toISOString(),
          },
        });
        return skill;
      } catch (error) {
        this.rethrowUniqueConflict(error, 'Cette compétence est déjà attribuée ou existe sur la même période.');
      }
    });
  }

  async endSkill(teamId: string, dto: EndTeamSkillDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const dateFin = new Date(dto.dateFin);
    return this.prisma.$transaction(async (tx) => {
      const skill = await tx.competenceEquipe.findFirst({
        where: { idCompetenceEquipe: dto.idCompetenceEquipe, idEquipe: teamId },
      });
      if (!skill) throw new NotFoundException('Compétence d’équipe introuvable.');
      if (skill.dateFin) throw new ConflictException('Cette compétence est déjà clôturée.');
      if (dateFin.getTime() < skill.dateDebut.getTime()) {
        throw new BadRequestException('La fin de compétence doit être postérieure ou égale au début.');
      }
      const update = await tx.competenceEquipe.updateMany({
        where: { idCompetenceEquipe: skill.idCompetenceEquipe, dateFin: null },
        data: { dateFin },
      });
      if (update.count !== 1) throw new ConflictException('La compétence a été modifiée simultanément.');
      await this.writeEvent(tx, {
        type: 'COMPETENCE_EQUIPE_CLOTUREE',
        actorId,
        target: { teamId },
        before: {
          competenceId: skill.idCompetenceEquipe,
          typeDechetId: skill.idTypeDechet,
          dateDebut: skill.dateDebut.toISOString(),
        },
        after: { dateFin: dateFin.toISOString() },
      });
      return { ...skill, dateFin };
    });
  }

  async setAvailability(teamId: string, dto: SetTeamAvailabilityDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    await this.requireTeam(teamId);
    const now = new Date();
    const valideJusqua = new Date(dto.valideJusqua);
    if (Number.isNaN(valideJusqua.getTime()) || valideJusqua.getTime() < now.getTime()) {
      throw new BadRequestException('La disponibilité doit être valide jusqu’à une date future.');
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.disponibiliteEquipe.findUnique({ where: { idEquipe: teamId } });
      const data = {
        etatDisponibilite: dto.etatDisponibilite.trim(),
        miseAJourPar: actorId,
        dateMiseAJour: now,
        valideJusqua,
        commentaire: dto.commentaire?.trim() || null,
      };
      const availability = await tx.disponibiliteEquipe.upsert({
        where: { idEquipe: teamId },
        create: { idEquipe: teamId, ...data },
        update: data,
      });
      await tx.historiqueDisponibiliteEquipe.create({
        data: { idEquipe: teamId, ...data },
      });
      await this.writeEvent(tx, {
        type: 'DISPONIBILITE_EQUIPE_MODIFIEE',
        actorId,
        target: { teamId },
        ...(current
          ? {
              before: {
                etatDisponibilite: current.etatDisponibilite,
                dateMiseAJour: current.dateMiseAJour.toISOString(),
                valideJusqua: current.valideJusqua.toISOString(),
              },
            }
          : {}),
        after: {
          etatDisponibilite: availability.etatDisponibilite,
          dateMiseAJour: now.toISOString(),
          valideJusqua: valideJusqua.toISOString(),
        },
      });
      return availability;
    });
  }

  async availabilityHistory(teamId: string) {
    await this.requireTeam(teamId);
    return this.prisma.historiqueDisponibiliteEquipe.findMany({
      where: { idEquipe: teamId },
      orderBy: { dateMiseAJour: 'desc' },
      include: {
        auteur: { select: { idUtilisateur: true, nom: true, prenom: true } },
      },
    });
  }

  async createDelegation(teamId: string, dto: CreateTeamDelegationDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const [team, member, delegate] = await Promise.all([
      this.requireTeam(teamId),
      this.prisma.appartenanceEquipe.findUnique({
        where: {
          idUtilisateur_idEquipe_dateDebut: {
            idUtilisateur: dto.idUtilisateurDelegue,
            idEquipe: teamId,
            dateDebut: new Date(dto.dateDebutAppartenance),
          },
        },
      }),
      this.prisma.utilisateur.findUnique({
        where: { idUtilisateur: dto.idUtilisateurDelegue },
        select: { idUtilisateur: true, etatCompte: true },
      }),
    ]);
    if (!delegate) throw new NotFoundException('Utilisateur délégué introuvable.');
    if (delegate.etatCompte !== 'ACTIF') {
      throw new ConflictException('Un compte inactif ne peut recevoir une délégation.');
    }
    if (!member) throw new NotFoundException('Appartenance de l’utilisateur à cette équipe introuvable.');
    const dateDebut = new Date(dto.dateDebut);
    const dateFin = dto.dateFin ? new Date(dto.dateFin) : null;
    if (dateDebut.getTime() < member.dateDebut.getTime() || (member.dateFin && dateDebut.getTime() > member.dateFin.getTime())) {
      throw new ConflictException('La délégation doit débuter pendant la période d’appartenance.');
    }
    if (member.dateFin && (!dateFin || dateFin.getTime() > member.dateFin.getTime())) {
      throw new ConflictException('La délégation ne peut dépasser la période d’appartenance de son bénéficiaire.');
    }
    if (dateFin && dateFin.getTime() < dateDebut.getTime()) {
      throw new BadRequestException('La fin de délégation doit être postérieure ou égale au début.');
    }
    if (member.dateFin && member.dateFin.getTime() < new Date().getTime()) {
      throw new ConflictException('L’appartenance du bénéficiaire est expirée.');
    }
    return this.prisma.$transaction(async (tx) => {
      try {
        const delegation = await tx.delegationDecisionEquipe.create({
          data: {
            idEquipe: team.idEquipe,
            idUtilisateurDelegue: dto.idUtilisateurDelegue,
            dateDebutAppartenance: member.dateDebut,
            typeDecision: dto.typeDecision.trim(),
            deleguePar: actorId,
            dateDebut,
            dateFin,
            motif: dto.motif?.trim() || null,
          },
        });
        await this.writeEvent(tx, {
          type: 'DELEGATION_EQUIPE_CREEE',
          actorId,
          target: { teamId },
          after: {
            delegationId: delegation.idDelegation,
            utilisateurDelegueId: delegation.idUtilisateurDelegue,
            typeDecision: delegation.typeDecision,
            dateDebut: delegation.dateDebut.toISOString(),
            dateFin: delegation.dateFin?.toISOString() ?? null,
          },
          ...(delegation.motif ? { reason: delegation.motif } : {}),
        });
        return delegation;
      } catch (error) {
        this.rethrowUniqueConflict(error, 'Une délégation identique existe déjà pour cette équipe et cette période.');
      }
    });
  }

  async endDelegation(teamId: string, idDelegation: string, dto: EndTeamDelegationDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const dateFin = new Date(dto.dateFin);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.delegationDecisionEquipe.findFirst({
        where: { idDelegation, idEquipe: teamId },
      });
      if (!current) throw new NotFoundException('Délégation introuvable.');
      if (current.dateFin) throw new ConflictException('Cette délégation est déjà clôturée.');
      if (dateFin.getTime() < current.dateDebut.getTime()) {
        throw new BadRequestException('La fin de délégation doit être postérieure ou égale au début.');
      }
      const update = await tx.delegationDecisionEquipe.updateMany({
        where: { idDelegation, idEquipe: teamId, dateFin: null },
        data: { dateFin },
      });
      if (update.count !== 1) throw new ConflictException('La délégation a été modifiée simultanément.');
      await this.writeEvent(tx, {
        type: 'DELEGATION_EQUIPE_CLOTUREE',
        actorId,
        target: { teamId },
        before: {
          delegationId: current.idDelegation,
          utilisateurDelegueId: current.idUtilisateurDelegue,
          typeDecision: current.typeDecision,
          dateDebut: current.dateDebut.toISOString(),
        },
        after: { dateFin: dateFin.toISOString() },
      });
      return { ...current, dateFin };
    });
  }
}
