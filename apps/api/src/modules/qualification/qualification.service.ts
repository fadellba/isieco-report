import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { ReportStatus } from '@isieco/shared';
import { PrismaService } from '../../database/prisma.service.js';
import type { AcceptReportDto } from './dto/accept-report.dto.js';
import type { ListQualificationQueryDto } from './dto/list-qualification-query.dto.js';
import type { RejectReportDto } from './dto/reject-report.dto.js';
import type { RequestSupplementDto } from './dto/request-supplement.dto.js';

type Transaction = Prisma.TransactionClient;

const DECISIONABLE_STATUSES: readonly ReportStatus[] = ['SOUMIS', 'COMPLEMENT_REPONDU'];

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

@Injectable()
export class QualificationService {
  constructor(private readonly prisma: PrismaService) {}

  private async actorId(authUserId: string): Promise<string> {
    const actor = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!actor || actor.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un compte agent actif est requis pour qualifier un signalement.');
    }
    return actor.idUtilisateur;
  }

  async listQueue(query: ListQualificationQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where = {
      statutSignalement: { in: [...DECISIONABLE_STATUSES] },
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
          statutSignalement: true,
          dateConstat: true,
          dateSoumission: true,
          description: true,
          idCommune: true,
          latitude: true,
          longitude: true,
          descriptionLocalisation: true,
          utilisateur: {
            select: {
              idUtilisateur: true,
              nom: true,
              prenom: true,
            },
          },
          contenus: {
            select: {
              idTypeDechet: true,
              quantiteEstimee: true,
              volumeEstime: true,
              remarque: true,
              typeDechet: {
                select: { codeType: true, libelle: true },
              },
            },
          },
          demandesComplement: {
            orderBy: { dateDemande: 'desc' },
            take: 1,
            select: {
              idDemande: true,
              dateDemande: true,
              etatDemande: true,
            },
          },
        },
      }),
    ]);

    return { items, page, pageSize, total };
  }

  async getQueueItem(idSignalement: string) {
    const report = await this.prisma.signalement.findFirst({
      where: {
        idSignalement,
        statutSignalement: { in: [...DECISIONABLE_STATUSES] },
      },
      select: {
        idSignalement: true,
        statutSignalement: true,
        dateConstat: true,
        dateSoumission: true,
        description: true,
        idCommune: true,
        latitude: true,
        longitude: true,
        precisionLocalisation: true,
        descriptionLocalisation: true,
        utilisateur: {
          select: { idUtilisateur: true, nom: true, prenom: true },
        },
        contenus: {
          select: {
            idTypeDechet: true,
            quantiteEstimee: true,
            volumeEstime: true,
            remarque: true,
            typeDechet: { select: { codeType: true, libelle: true } },
          },
        },
        photos: {
          select: {
            idPhotoSignalement: true,
            description: true,
            dateAjout: true,
            etatPublication: true,
          },
          orderBy: { dateAjout: 'asc' },
        },
        demandesComplement: {
          orderBy: { dateDemande: 'desc' },
          select: {
            idDemande: true,
            dateDemande: true,
            motif: true,
            etatDemande: true,
            reponse: {
              select: { idReponse: true, dateReponse: true, contenu: true },
            },
          },
        },
      },
    });
    if (!report) throw new NotFoundException('Signalement absent de la file de qualification.');
    return report;
  }

  async requestSupplement(
    idSignalement: string,
    dto: RequestSupplementDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const motif = dto.motif.trim();
    if (motif.length < 5 || motif.length > 2000) {
      throw new BadRequestException('Le motif de complément doit contenir entre 5 et 2000 caractères.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const report = await this.requireDecisionableReport(tx, idSignalement);
          const openRequest = await tx.demandeComplement.findFirst({
            where: { idSignalement, etatDemande: 'OUVERTE' },
            select: { idDemande: true },
          });
          if (openRequest) {
            throw new ConflictException('Une demande de complément est déjà ouverte pour ce signalement.');
          }

          const now = new Date();
          const demande = await tx.demandeComplement.create({
            data: {
              idSignalement,
              demandePar: actorId,
              dateDemande: now,
              motif,
              etatDemande: 'OUVERTE',
            },
          });
          const reportUpdate = await tx.signalement.updateMany({
            where: {
              idSignalement,
              statutSignalement: report.statutSignalement,
            },
            data: { statutSignalement: 'EN_ATTENTE_COMPLEMENT' },
          });
          if (reportUpdate.count !== 1) {
            throw new ConflictException('Le signalement a changé d’état simultanément.');
          }
          await this.writeEvent(tx, {
            type: 'COMPLEMENT_DEMANDE',
            actorId,
            reportId: idSignalement,
            before: { statutSignalement: report.statutSignalement },
            after: {
              statutSignalement: 'EN_ATTENTE_COMPLEMENT',
              idDemande: demande.idDemande,
              dateDemande: now.toISOString(),
            },
            reason: motif,
          });
          return demande;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.handleTransactionError(error, 'Une demande de complément concurrente a été enregistrée.');
    }
  }

  async acceptReport(
    idSignalement: string,
    dto: AcceptReportDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const now = new Date();
    if (!dto.contenus?.length || dto.contenus.length > 20) {
      throw new BadRequestException('La qualification doit contenir entre 1 et 20 catégories.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const report = await this.requireDecisionableReport(tx, idSignalement);
          await this.assertNoOpenSupplement(tx, idSignalement);

          const wasteTypeIds = dto.contenus.map((item) => item.idTypeDechet);
          if (new Set(wasteTypeIds).size !== wasteTypeIds.length) {
            throw new BadRequestException('Chaque type de déchet ne peut apparaître qu’une fois.');
          }

          const activeWasteTypes = await tx.typeDechet.findMany({
            where: {
              idTypeDechet: { in: wasteTypeIds },
              dateDebutValidite: { lte: now },
              OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: now } }],
            },
            select: { idTypeDechet: true },
          });
          if (activeWasteTypes.length !== wasteTypeIds.length) {
            throw new BadRequestException('Un ou plusieurs types de déchets sont inconnus ou inactifs.');
          }

          await tx.qualificationSignalement.createMany({
            data: dto.contenus.map((item) => ({
              idSignalement,
              idTypeDechet: item.idTypeDechet,
              quantiteEstimee: item.quantiteEstimee ?? null,
              uniteQuantite: item.uniteQuantite?.trim() || null,
              quantiteEstimeeLegacy: item.quantiteEstimeeLegacy ?? null,
              volumeEstime: item.volumeEstime ?? null,
              remarque: item.remarque?.trim() || null,
              qualifiePar: actorId,
              dateQualification: now,
              etatQualification: 'RETENU',
              motifRetrait: null,
            })),
          });

          const reportUpdate = await tx.signalement.updateMany({
            where: {
              idSignalement,
              statutSignalement: report.statutSignalement,
            },
            data: {
              statutSignalement: 'QUALIFIE',
              decisionPar: actorId,
              dateDecision: now,
              motifDecision: null,
            },
          });
          if (reportUpdate.count !== 1) {
            throw new ConflictException('Le signalement a changé d’état simultanément.');
          }

          await this.writeEvent(tx, {
            type: 'SIGNALEMENT_QUALIFIE',
            actorId,
            reportId: idSignalement,
            before: { statutSignalement: report.statutSignalement },
            after: {
              statutSignalement: 'QUALIFIE',
              nombreCategoriesRetenues: dto.contenus.length,
              dateDecision: now.toISOString(),
            },
          });

          return tx.qualificationSignalement.findMany({
            where: { idSignalement, qualifiePar: actorId, dateQualification: now },
            orderBy: { idTypeDechet: 'asc' },
            include: {
              typeDechet: { select: { codeType: true, libelle: true } },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.handleTransactionError(error, 'Le signalement a été qualifié simultanément.');
    }
  }

  async rejectReport(
    idSignalement: string,
    dto: RejectReportDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const motif = dto.motif.trim();
    if (motif.length < 5 || motif.length > 2000) {
      throw new BadRequestException('Le motif de rejet doit contenir entre 5 et 2000 caractères.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const report = await this.requireDecisionableReport(tx, idSignalement);
          await this.assertNoOpenSupplement(tx, idSignalement);
          const now = new Date();
          const reportUpdate = await tx.signalement.updateMany({
            where: {
              idSignalement,
              statutSignalement: report.statutSignalement,
            },
            data: {
              statutSignalement: 'REJETE',
              decisionPar: actorId,
              dateDecision: now,
              motifDecision: motif,
            },
          });
          if (reportUpdate.count !== 1) {
            throw new ConflictException('Le signalement a changé d’état simultanément.');
          }
          await this.writeEvent(tx, {
            type: 'SIGNALEMENT_REJETE',
            actorId,
            reportId: idSignalement,
            before: { statutSignalement: report.statutSignalement },
            after: {
              statutSignalement: 'REJETE',
              dateDecision: now.toISOString(),
            },
            reason: motif,
          });
          return { idSignalement, statutSignalement: 'REJETE', dateDecision: now, motifDecision: motif };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.handleTransactionError(error, 'Le signalement a été rejeté ou modifié simultanément.');
    }
  }

  private async requireDecisionableReport(tx: Transaction, idSignalement: string) {
    const report = await tx.signalement.findUnique({
      where: { idSignalement },
      select: {
        idSignalement: true,
        statutSignalement: true,
      },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');
    if (!DECISIONABLE_STATUSES.includes(report.statutSignalement as ReportStatus)) {
      throw new ConflictException('Le signalement n’est pas dans un état permettant cette décision.');
    }
    return report;
  }

  private async assertNoOpenSupplement(tx: Transaction, idSignalement: string): Promise<void> {
    const openRequest = await tx.demandeComplement.findFirst({
      where: { idSignalement, etatDemande: 'OUVERTE' },
      select: { idDemande: true },
    });
    if (openRequest) {
      throw new ConflictException('Une demande de complément doit être clôturée avant toute décision.');
    }
  }

  private async writeEvent(
    tx: Transaction,
    payload: {
      type: string;
      actorId: string;
      reportId: string;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      reason?: string;
    },
  ): Promise<void> {
    const now = new Date();
    await tx.evenementMetier.create({
      data: {
        typeEvenement: payload.type,
        dateEvenement: now,
        dateEnregistrement: now,
        origine: 'API',
        idActeur: payload.actorId,
        idSignalementCible: payload.reportId,
        ...(payload.before ? { donneesAvant: payload.before as Prisma.InputJsonObject } : {}),
        ...(payload.after ? { donneesApres: payload.after as Prisma.InputJsonObject } : {}),
        ...(payload.reason ? { motif: payload.reason } : {}),
        versionSchema: 1,
      },
    });
  }

  private handleTransactionError(error: unknown, conflictMessage: string): never {
    if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
      throw new ConflictException(conflictMessage);
    }
    throw error;
  }
}
