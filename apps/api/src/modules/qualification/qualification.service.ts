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
import { SupabaseStorageService } from '../../infrastructure/storage/supabase-storage.service.js';
import type { AcceptReportDto } from './dto/accept-report.dto.js';
import type { ListQualificationQueryDto } from './dto/list-qualification-query.dto.js';
import type { RejectReportDto } from './dto/reject-report.dto.js';
import type { RequestSupplementDto } from './dto/request-supplement.dto.js';

type Transaction = Prisma.TransactionClient;
const DECISIONABLE_STATUSES: readonly ReportStatus[] = ['SOUMIS', 'COMPLEMENT_REPONDU'];

@Injectable()
export class QualificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

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
    const where = { statutSignalement: { in: [...DECISIONABLE_STATUSES] } };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.signalement.count({ where }),
      this.prisma.signalement.findMany({
        where,
        orderBy: [{ dateSoumission: 'asc' }, { idSignalement: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          utilisateur: { select: { nom: true, prenom: true } },
          contenus: { include: { typeDechet: { select: { codeType: true, libelle: true } } } },
          demandesComplement: {
            orderBy: { dateDemande: 'desc' },
            take: 1,
            select: { etatDemande: true, motif: true, dateDemande: true, reponse: true, dateReponse: true },
          },
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        idSignalement: row.idSignalement,
        statutSignalement: row.statutSignalement,
        dateConstat: row.dateConstat,
        dateSoumission: row.dateSoumission,
        description: row.description,
        localisation: row.localisation,
        latitude: row.latitude?.toString() ?? null,
        longitude: row.longitude?.toString() ?? null,
        descriptionLocalisation: row.localisation,
        utilisateur: row.utilisateur,
        contenus: row.contenus.map((item) => ({
          idTypeDechet: item.idTypeDechet,
          quantiteEstimee: item.quantiteEstimee?.toString() ?? null,
          volumeEstime: item.volumeEstime?.toString() ?? null,
          remarque: item.remarque,
          etatQualification: item.etatQualification,
          typeDechet: item.typeDechet,
        })),
        demandesComplement: row.demandesComplement,
      })),
      page,
      pageSize,
      total,
    };
  }

  async getQueueItem(idSignalement: string) {
    const row = await this.prisma.signalement.findFirst({
      where: {
        idSignalement,
        statutSignalement: { in: [...DECISIONABLE_STATUSES] },
      },
      include: {
        utilisateur: { select: { nom: true, prenom: true } },
        contenus: {
          include: { typeDechet: { select: { codeType: true, libelle: true } } },
          orderBy: { idTypeDechet: 'asc' },
        },
        photos: {
          select: {
            idPhotoSignalement: true,
            description: true,
            dateAjout: true,
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
            reponse: true,
            dateReponse: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Signalement absent de la file de qualification.');

    return {
      idSignalement: row.idSignalement,
      statutSignalement: row.statutSignalement,
      dateConstat: row.dateConstat,
      dateSoumission: row.dateSoumission,
      description: row.description,
      latitude: row.latitude?.toString() ?? null,
      longitude: row.longitude?.toString() ?? null,
      precisionLocalisation: row.precisionLocalisation?.toString() ?? null,
      descriptionLocalisation: row.localisation,
      utilisateur: row.utilisateur,
      contenus: row.contenus.map((item) => ({
        idTypeDechet: item.idTypeDechet,
        quantiteEstimee: item.quantiteEstimee?.toString() ?? null,
        volumeEstime: item.volumeEstime?.toString() ?? null,
        remarque: item.remarque,
        etatQualification: item.etatQualification,
        typeDechet: item.typeDechet,
      })),
      photos: row.photos.map((photo) => ({ ...photo, etatPublication: 'PRIVEE' })),
      demandesComplement: row.demandesComplement.map((item) => ({
        idDemande: item.idDemande,
        dateDemande: item.dateDemande,
        motif: item.motif,
        etatDemande: item.etatDemande,
        reponse: item.reponse && item.dateReponse
          ? { dateReponse: item.dateReponse, contenu: item.reponse }
          : null,
      })),
    };
  }

  async createPhotoUrl(idSignalement: string, idPhotoSignalement: string) {
    const report = await this.prisma.signalement.findFirst({
      where: {
        idSignalement,
        statutSignalement: { in: [...DECISIONABLE_STATUSES] },
        photos: { some: { idPhotoSignalement } },
      },
      select: {
        photos: {
          where: { idPhotoSignalement },
          select: { referencePhoto: true, dateExpiration: true, mediaPurgeAt: true },
        },
      },
    });
    const photo = report?.photos[0];
    const now = new Date();
    if (!photo || photo.dateExpiration <= now || (photo.mediaPurgeAt && photo.mediaPurgeAt <= now)) {
      throw new NotFoundException('Photo absente de la file de qualification ou expirée.');
    }
    return this.storage.createSignedUrl(photo.referencePhoto);
  }

  async requestSupplement(idSignalement: string, dto: RequestSupplementDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const motif = dto.motif.trim();
    const now = new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const report = await this.getDecisionableReport(tx, idSignalement);
        const openRequest = await tx.demandeComplement.findFirst({
          where: { idSignalement, etatDemande: 'OUVERTE' },
          select: { idDemande: true },
        });
        if (openRequest) throw new ConflictException('Une demande de complément est déjà ouverte.');

        const request = await tx.demandeComplement.create({
          data: {
            idSignalement,
            demandePar: actorId,
            dateDemande: now,
            motif,
            etatDemande: 'OUVERTE',
          },
        });
        await tx.signalement.update({
          where: { idSignalement },
          data: {
            statutSignalement: 'EN_ATTENTE_COMPLEMENT',
            decisionPar: actorId,
            dateDecision: now,
            motifDecision: motif,
          },
        });
        await this.writeStatus(tx, {
          idSignalement,
          actorId,
          before: report.statutSignalement,
          after: 'EN_ATTENTE_COMPLEMENT',
          at: now,
          motif,
        });
        return request;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      this.handleTransactionError(error, 'Le signalement ou la demande de complément a été modifié simultanément.');
    }
  }

  async acceptReport(idSignalement: string, dto: AcceptReportDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    if (!dto.contenus.length) throw new BadRequestException('Au moins une catégorie doit être retenue.');
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        const report = await this.getDecisionableReport(tx, idSignalement);
        await this.ensureNoOpenSupplement(tx, idSignalement);

        const typeIds = dto.contenus.map((item) => item.idTypeDechet);
        const types = await tx.typeDechet.findMany({
          where: { idTypeDechet: { in: typeIds }, actif: true },
          select: { idTypeDechet: true },
        });
        if (types.length !== typeIds.length) {
          throw new BadRequestException('Un ou plusieurs types de déchets sont inconnus ou inactifs.');
        }

        const selected = new Set(typeIds);
        const existingContents = await tx.contenuSignalement.findMany({
          where: { idSignalement },
          select: { idTypeDechet: true },
        });

        for (const item of dto.contenus) {
          await tx.contenuSignalement.upsert({
            where: {
              idSignalement_idTypeDechet: {
                idSignalement,
                idTypeDechet: item.idTypeDechet,
              },
            },
            create: {
              idSignalement,
              idTypeDechet: item.idTypeDechet,
              quantiteEstimee: item.quantiteEstimee ?? null,
              volumeEstime: item.volumeEstime ?? null,
              remarque: item.remarque?.trim() || null,
              etatQualification: 'RETENU',
              qualifiePar: actorId,
              dateQualification: now,
            },
            update: {
              quantiteEstimee: item.quantiteEstimee ?? null,
              volumeEstime: item.volumeEstime ?? null,
              remarque: item.remarque?.trim() || null,
              etatQualification: 'RETENU',
              qualifiePar: actorId,
              dateQualification: now,
            },
          });
        }

        const excluded = existingContents
          .filter((item) => !selected.has(item.idTypeDechet))
          .map((item) => item.idTypeDechet);
        if (excluded.length) {
          await tx.contenuSignalement.updateMany({
            where: { idSignalement, idTypeDechet: { in: excluded } },
            data: { etatQualification: 'RETIRE', qualifiePar: actorId, dateQualification: now },
          });
        }

        await tx.signalement.update({
          where: { idSignalement },
          data: {
            statutSignalement: 'QUALIFIE',
            decisionPar: actorId,
            dateDecision: now,
            motifDecision: null,
          },
        });
        await this.writeStatus(tx, {
          idSignalement,
          actorId,
          before: report.statutSignalement,
          after: 'QUALIFIE',
          at: now,
          motif: null,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      this.handleTransactionError(error, 'La décision de qualification est entrée en conflit avec une autre opération.');
    }

    return this.getQueueItemAfterDecision(idSignalement);
  }

  async rejectReport(idSignalement: string, dto: RejectReportDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const motif = dto.motif.trim();
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        const report = await this.getDecisionableReport(tx, idSignalement);
        await this.ensureNoOpenSupplement(tx, idSignalement);
        await tx.signalement.update({
          where: { idSignalement },
          data: {
            statutSignalement: 'REJETE',
            decisionPar: actorId,
            dateDecision: now,
            motifDecision: motif,
          },
        });
        await this.writeStatus(tx, {
          idSignalement,
          actorId,
          before: report.statutSignalement,
          after: 'REJETE',
          at: now,
          motif,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      this.handleTransactionError(error, 'La décision de rejet est entrée en conflit avec une autre opération.');
    }
    return { idSignalement, statutSignalement: 'REJETE', motifDecision: motif };
  }

  private async getDecisionableReport(tx: Transaction, idSignalement: string) {
    const report = await tx.signalement.findUnique({
      where: { idSignalement },
      select: { idSignalement: true, statutSignalement: true },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');
    if (!DECISIONABLE_STATUSES.includes(report.statutSignalement as ReportStatus)) {
      throw new ConflictException('Le signalement ne peut plus recevoir de décision de qualification.');
    }
    return report;
  }

  private async ensureNoOpenSupplement(tx: Transaction, idSignalement: string) {
    const pending = await tx.demandeComplement.count({
      where: { idSignalement, etatDemande: 'OUVERTE' },
    });
    if (pending > 0) {
      throw new ConflictException('Une demande de complément doit être répondue avant toute décision.');
    }
  }

  private async writeStatus(
    tx: Transaction,
    input: { idSignalement: string; actorId: string; before: string; after: string; at: Date; motif: string | null },
  ) {
    await tx.historiqueStatutSignalement.create({
      data: {
        idSignalement: input.idSignalement,
        idUtilisateur: input.actorId,
        ancienStatut: input.before,
        nouveauStatut: input.after,
        dateChangement: input.at,
        motif: input.motif,
      },
    });
  }

  private async getQueueItemAfterDecision(idSignalement: string) {
    const item = await this.prisma.signalement.findUnique({
      where: { idSignalement },
      select: { idSignalement: true, statutSignalement: true, dateDecision: true },
    });
    return item;
  }

  private handleTransactionError(error: unknown, conflictMessage: string): never {
    if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
      throw new ConflictException(conflictMessage);
    }
    throw error;
  }
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
