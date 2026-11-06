import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { recordBusinessEvent } from '../../infrastructure/audit/business-audit.js';
import type { CreateCaseFromReportDto } from './dto/create-case-from-report.dto.js';
import type { ListCasesQueryDto } from './dto/list-cases-query.dto.js';
import type { UpdateCaseLocationDto } from './dto/update-case-location.dto.js';
import type { UpdateCasePriorityDto } from './dto/update-case-priority.dto.js';

type Transaction = Prisma.TransactionClient;

const caseDetailSelect = {
  idDossier: true,
  referenceDossier: true,
  descriptionSynthese: true,
  dateCreationDossier: true,
  statutDossier: true,
  priorite: true,
  latitude: true,
  longitude: true,
  precisionLocalisation: true,
  descriptionLocalisation: true,
  dateCloture: true,
  creePar: true,
  contenus: {
    orderBy: { idTypeDechet: 'asc' as const },
    include: {
      typeDechet: { select: { idTypeDechet: true, codeType: true, libelle: true } },
    },
  },
  signalements: {
    orderBy: { dateSoumission: 'asc' as const },
    select: {
      idSignalement: true,
      dateSoumission: true,
      description: true,
      statutSignalement: true,
      utilisateur: { select: { nom: true, prenom: true } },
    },
  },
} satisfies Prisma.DossierTraitementSelect;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  private async actorId(authUserId: string): Promise<string> {
    const actor = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!actor || actor.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un compte responsable de traitement actif est requis.');
    }
    return actor.idUtilisateur;
  }

  async createFromReport(idSignalement: string, dto: CreateCaseFromReportDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const report = await this.loadQualifiedReport(tx, idSignalement);
        if (report.idDossier) throw new ConflictException('Ce signalement appartient déjà à un dossier.');

        const now = new Date();
        const summary = dto.descriptionSynthese?.trim() ||
          report.description?.trim() ||
          `Dossier constitué à partir du signalement ${idSignalement}.`;
        const referenceDossier =
          `DOS-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;

        const dossier = await tx.dossierTraitement.create({
          data: {
            referenceDossier,
            descriptionSynthese: summary,
            dateCreationDossier: now,
            statutDossier: 'OUVERT',
            priorite: dto.priorite ?? 'NORMALE',
            latitude: report.latitude,
            longitude: report.longitude,
            precisionLocalisation: report.precisionLocalisation,
            descriptionLocalisation: report.localisation,
            creePar: actorId,
            contenus: {
              create: report.contenus
                .filter((item) => item.etatQualification === 'RETENU')
                .map((item) => ({
                  idTypeDechet: item.idTypeDechet,
                  quantiteEstimee: item.quantiteEstimee,
                  uniteQuantite: null,
                  volumeEstime: item.volumeEstime,
                  remarque: item.remarque,
                  etatContenuDossier: 'ACTIF',
                  etatPriseEnCharge: 'EN_ATTENTE',
                })),
            },
          },
          select: { idDossier: true },
        });

        const linked = await tx.signalement.updateMany({
          where: { idSignalement, idDossier: null, statutSignalement: 'QUALIFIE' },
          data: { idDossier: dossier.idDossier },
        });
        if (linked.count !== 1) {
          throw new ConflictException('Le signalement a été associé à un dossier par une opération concurrente.');
        }

        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'DOSSIER_CREE',
          entityType: 'DOSSIER',
          entityId: dossier.idDossier,
          dossierId: dossier.idDossier,
          metadata: { priority: dto.priorite ?? 'NORMALE', reportId: idSignalement },
        });
        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'SIGNALEMENT_RATTACHE',
          entityType: 'SIGNALEMENT',
          entityId: idSignalement,
          dossierId: dossier.idDossier,
        });

        return tx.dossierTraitement.findUniqueOrThrow({
          where: { idDossier: dossier.idDossier },
          select: caseDetailSelect,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      this.handleWriteConflict(error, 'Le signalement a été rattaché à un dossier par une opération concurrente.');
    }
  }

  async listQualifiedUnassignedReports(query: ListCasesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.SignalementWhereInput = {
      statutSignalement: 'QUALIFIE',
      idDossier: null,
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.signalement.count({ where }),
      this.prisma.signalement.findMany({
        where,
        orderBy: [{ dateSoumission: 'asc' }, { idSignalement: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          idSignalement: true,
          dateSoumission: true,
          description: true,
          localisation: true,
          latitude: true,
          longitude: true,
          precisionLocalisation: true,
          utilisateur: { select: { idUtilisateur: true, nom: true, prenom: true } },
          contenus: {
            where: { etatQualification: 'RETENU' },
            orderBy: { idTypeDechet: 'asc' },
            select: {
              idTypeDechet: true,
              quantiteEstimee: true,
              volumeEstime: true,
              remarque: true,
              typeDechet: { select: { codeType: true, libelle: true } },
            },
          },
        },
      }),
    ]);
    return { items, page, pageSize, total };
  }

  async listCases(query: ListCasesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.DossierTraitementWhereInput = query.statutDossier
      ? { statutDossier: query.statutDossier }
      : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.dossierTraitement.count({ where }),
      this.prisma.dossierTraitement.findMany({
        where,
        orderBy: [{ dateCreationDossier: 'desc' }, { idDossier: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          idDossier: true,
          referenceDossier: true,
          descriptionSynthese: true,
          dateCreationDossier: true,
          statutDossier: true,
          priorite: true,
          contenus: {
            select: {
              idContenuDossier: true,
              idTypeDechet: true,
              quantiteEstimee: true,
              volumeEstime: true,
              remarque: true,
              etatContenuDossier: true,
              etatPriseEnCharge: true,
              typeDechet: { select: { idTypeDechet: true, codeType: true, libelle: true } },
            },
          },
          _count: { select: { signalements: true } },
        },
      }),
    ]);
    return {
      items: rows.map(({ _count, ...item }) => ({
        ...item,
        nombreSignalements: _count.signalements,
      })),
      page,
      pageSize,
      total,
    };
  }

  async getCase(idDossier: string) {
    const dossier = await this.prisma.dossierTraitement.findUnique({
      where: { idDossier },
      select: caseDetailSelect,
    });
    if (!dossier) throw new NotFoundException('Dossier introuvable.');
    return dossier;
  }

  async getCaseHistory(idDossier: string) {
    const dossier = await this.prisma.dossierTraitement.findUnique({
      where: { idDossier },
      select: { idDossier: true },
    });
    if (!dossier) throw new NotFoundException('Dossier introuvable.');
    return this.prisma.$queryRaw<Array<{
      id: string;
      occurredAt: Date;
      actorId: string | null;
      actionCode: string;
      entityType: string;
      entityId: string;
      dossierId: string | null;
      reason: string | null;
      metadata: Record<string, unknown>;
    }>>`
      SELECT
        id,
        occurred_at AS "occurredAt",
        actor_id AS "actorId",
        action_code AS "actionCode",
        entity_type AS "entityType",
        entity_id AS "entityId",
        dossier_id AS "dossierId",
        reason,
        metadata
      FROM audit.evenement_metier
      WHERE dossier_id = ${idDossier}::uuid
      ORDER BY occurred_at DESC, id DESC
    `;
  }

  async updatePriority(idDossier: string, dto: UpdateCasePriorityDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dossierTraitement.updateMany({
        where: { idDossier, statutDossier: { not: 'CLOTURE' } },
        data: { priorite: dto.priorite },
      });
      if (updated.count !== 1) {
        const exists = await tx.dossierTraitement.findUnique({ where: { idDossier }, select: { idDossier: true } });
        if (!exists) throw new NotFoundException('Dossier introuvable.');
        throw new ConflictException('La priorité d’un dossier clôturé ne peut pas être modifiée.');
      }
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'DOSSIER_PRIORITE_MODIFIEE',
        entityType: 'DOSSIER',
        entityId: idDossier,
        dossierId: idDossier,
        metadata: { priority: dto.priorite },
      });
    });
    return this.getCase(idDossier);
  }

  async updateLocation(idDossier: string, dto: UpdateCaseLocationDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    if ((dto.latitude === null) !== (dto.longitude === null)) {
      throw new BadRequestException('La latitude et la longitude doivent être fournies ensemble.');
    }
    if (dto.precisionLocalisation != null && dto.latitude == null) {
      throw new BadRequestException('La précision exige des coordonnées.');
    }
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dossierTraitement.updateMany({
        where: { idDossier, statutDossier: { not: 'CLOTURE' } },
        data: {
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.precisionLocalisation !== undefined ? { precisionLocalisation: dto.precisionLocalisation } : {}),
          ...(dto.descriptionLocalisation !== undefined ? { descriptionLocalisation: dto.descriptionLocalisation?.trim() || null } : {}),
        },
      });
      if (updated.count !== 1) {
        const exists = await tx.dossierTraitement.findUnique({ where: { idDossier }, select: { idDossier: true } });
        if (!exists) throw new NotFoundException('Dossier introuvable.');
        throw new ConflictException('La localisation d’un dossier clôturé ne peut pas être modifiée.');
      }
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'DOSSIER_LOCALISATION_MODIFIEE',
        entityType: 'DOSSIER',
        entityId: idDossier,
        dossierId: idDossier,
      });
    });
    return this.getCase(idDossier);
  }

  async attachReport(idDossier: string, idSignalement: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const dossier = await tx.dossierTraitement.findUnique({
          where: { idDossier },
          select: { statutDossier: true },
        });
        if (!dossier) throw new NotFoundException('Dossier introuvable.');
        if (dossier.statutDossier === 'CLOTURE') throw new ConflictException('Un dossier clôturé ne peut plus recevoir de signalement.');

        const report = await this.loadQualifiedReport(tx, idSignalement);
        if (report.idDossier) throw new ConflictException('Ce signalement appartient déjà à un dossier.');

        await tx.signalement.update({ where: { idSignalement }, data: { idDossier } });
        for (const item of report.contenus.filter((content) => content.etatQualification === 'RETENU')) {
          const existing = await tx.contenuDossier.findUnique({
            where: { idDossier_idTypeDechet: { idDossier, idTypeDechet: item.idTypeDechet } },
          });
          if (!existing) {
            await tx.contenuDossier.create({
              data: {
                idDossier,
                idTypeDechet: item.idTypeDechet,
                quantiteEstimee: item.quantiteEstimee,
                volumeEstime: item.volumeEstime,
                remarque: item.remarque,
                etatContenuDossier: 'ACTIF',
                etatPriseEnCharge: 'EN_ATTENTE',
              },
            });
            continue;
          }

          const quantity = existing.quantiteEstimee === null
            ? item.quantiteEstimee
            : item.quantiteEstimee === null
              ? existing.quantiteEstimee
              : existing.quantiteEstimee.add(item.quantiteEstimee);
          const volume = existing.volumeEstime === null
            ? item.volumeEstime
            : item.volumeEstime === null
              ? existing.volumeEstime
              : existing.volumeEstime.add(item.volumeEstime);
          const remarks = [existing.remarque, item.remarque].filter((value): value is string => Boolean(value?.trim()));
          await tx.contenuDossier.update({
            where: { idContenuDossier: existing.idContenuDossier },
            data: {
              quantiteEstimee: quantity,
              volumeEstime: volume,
              remarque: remarks.length ? remarks.join('\\n') : null,
            },
          });
        }
        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'SIGNALEMENT_RATTACHE',
          entityType: 'SIGNALEMENT',
          entityId: idSignalement,
          dossierId: idDossier,
        });
        return tx.dossierTraitement.findUniqueOrThrow({ where: { idDossier }, select: caseDetailSelect });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) throw error;
      this.handleWriteConflict(error, 'Le signalement a été rattaché simultanément.');
    }
  }

  async detachReport(idDossier: string, idSignalement: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const report = await tx.signalement.findFirst({
          where: { idSignalement, idDossier },
          include: { contenus: { where: { etatQualification: 'RETENU' } } },
        });
        if (!report) throw new NotFoundException('Signalement introuvable dans ce dossier.');

        for (const item of report.contenus) {
          const dossierContent = await tx.contenuDossier.findUnique({
            where: { idDossier_idTypeDechet: { idDossier, idTypeDechet: item.idTypeDechet } },
            select: { idContenuDossier: true },
          });
          if (!dossierContent) continue;

          const activeAssignments = await tx.affectation.count({
            where: { idContenuDossier: dossierContent.idContenuDossier, dateFinAffectation: null },
          });
          if (activeAssignments > 0) {
            throw new ConflictException('Ce contenu possède une affectation active et ne peut pas être retiré.');
          }
          const historicalAssignments = await tx.affectation.count({
            where: { idContenuDossier: dossierContent.idContenuDossier },
          });
          if (historicalAssignments > 0) {
            throw new ConflictException('Un contenu déjà affecté ne peut pas être détaché sans historique de provenance.');
          }
        }

        await tx.signalement.update({ where: { idSignalement }, data: { idDossier: null } });
        for (const item of report.contenus) {
          const otherReports = await tx.signalement.findMany({
            where: {
              idDossier,
              idSignalement: { not: idSignalement },
              contenus: { some: { idTypeDechet: item.idTypeDechet, etatQualification: 'RETENU' } },
            },
            select: { contenus: { where: { idTypeDechet: item.idTypeDechet, etatQualification: 'RETENU' } } },
          });
          const remaining = otherReports.flatMap((entry) => entry.contenus);
          const existing = await tx.contenuDossier.findUnique({
            where: { idDossier_idTypeDechet: { idDossier, idTypeDechet: item.idTypeDechet } },
          });
          if (!existing) continue;
          if (!remaining.length) {
            await tx.contenuDossier.delete({ where: { idContenuDossier: existing.idContenuDossier } });
            continue;
          }

          const quantityValues = remaining.map((value) => value.quantiteEstimee).filter((value): value is Prisma.Decimal => value !== null);
          const volumeValues = remaining.map((value) => value.volumeEstime).filter((value): value is Prisma.Decimal => value !== null);
          await tx.contenuDossier.update({
            where: { idContenuDossier: existing.idContenuDossier },
            data: {
              quantiteEstimee: quantityValues.length ? quantityValues.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0)) : null,
              volumeEstime: volumeValues.length ? volumeValues.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0)) : null,
              remarque: remaining.map((value) => value.remarque).filter((value): value is string => Boolean(value?.trim())).join('\\n') || null,
            },
          });
        }

        await recordBusinessEvent(tx, {
          actorId,
          actionCode: 'SIGNALEMENT_DETACHE',
          entityType: 'SIGNALEMENT',
          entityId: idSignalement,
          dossierId: idDossier,
        });
        return tx.dossierTraitement.findUniqueOrThrow({ where: { idDossier }, select: caseDetailSelect });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) throw error;
      this.handleWriteConflict(error, 'Le rattachement a été modifié simultanément.');
    }
  }

  private async loadQualifiedReport(tx: Transaction, idSignalement: string) {
    const report = await tx.signalement.findUnique({
      where: { idSignalement },
      select: {
        idSignalement: true,
        idDossier: true,
        statutSignalement: true,
        description: true,
        localisation: true,
        latitude: true,
        longitude: true,
        precisionLocalisation: true,
        dateDecision: true,
        contenus: {
          where: { etatQualification: 'RETENU' },
          orderBy: { idTypeDechet: 'asc' },
          include: { typeDechet: { select: { idTypeDechet: true, actif: true } } },
        },
      },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');
    if (report.statutSignalement !== 'QUALIFIE') {
      throw new ConflictException('Seuls les signalements qualifiés peuvent être rattachés à un dossier.');
    }
    if (!report.contenus.length) {
      throw new ConflictException('Le signalement ne possède aucune catégorie retenue.');
    }
    if (report.contenus.some((item) => !item.typeDechet.actif)) {
      throw new ConflictException('Une catégorie qualifiée est inactive.');
    }
    return report;
  }

  private handleWriteConflict(error: unknown, message: string): never {
    if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) throw new ConflictException(message);
    throw error;
  }
}
