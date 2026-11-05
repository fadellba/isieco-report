import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { SupabaseStorageService } from '../../infrastructure/storage/supabase-storage.service.js';
import { validateImageFile } from '../../infrastructure/storage/media-file.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ListReportsQueryDto } from './dto/list-reports-query.dto.js';

const reportSelect = {
  idSignalement: true,
  dateConstat: true,
  dateSoumission: true,
  description: true,
  localisation: true,
  latitude: true,
  longitude: true,
  precisionLocalisation: true,
  statutSignalement: true,
  dateDecision: true,
  motifDecision: true,
  contenus: {
    include: {
      typeDechet: { select: { codeType: true, libelle: true } },
    },
    orderBy: { idTypeDechet: 'asc' as const },
  },
  photos: {
    select: {
      idPhotoSignalement: true,
      description: true,
      dateAjout: true,
    },
    orderBy: { dateAjout: 'asc' as const },
  },
} satisfies Prisma.SignalementSelect;

type ReportRecord = Prisma.SignalementGetPayload<{ select: typeof reportSelect }>;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  private async citizenId(authUserId: string): Promise<string> {
    const user = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!user || user.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un compte citoyen actif est requis.');
    }
    return user.idUtilisateur;
  }

  async listActiveWasteTypes(authUserId: string) {
    await this.citizenId(authUserId);
    return this.prisma.typeDechet.findMany({
      where: { actif: true },
      orderBy: [{ libelle: 'asc' }, { codeType: 'asc' }],
      select: { idTypeDechet: true, codeType: true, libelle: true },
    });
  }

  async createReport(dto: CreateReportDto, authUserId: string, idempotencyKey: string) {
    const userId = await this.citizenId(authUserId);
    const key = idempotencyKey.trim();
    if (key.length < 8 || key.length > 128) {
      throw new BadRequestException('La clé Idempotency-Key doit contenir entre 8 et 128 caractères.');
    }
    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
      throw new BadRequestException('La latitude et la longitude doivent être fournies ensemble.');
    }

    const contents = dto.contenus ?? [];
    if (contents.length === 0) {
      throw new BadRequestException('Au moins une catégorie de déchets doit être sélectionnée.');
    }
    if (contents.length) {
      const typeIds = [...new Set(contents.map((item) => item.idTypeDechet))];
      const activeTypes = await this.prisma.typeDechet.findMany({
        where: { idTypeDechet: { in: typeIds }, actif: true },
        select: { idTypeDechet: true },
      });
      if (activeTypes.length !== typeIds.length) {
        throw new BadRequestException('Un ou plusieurs types de déchets sont inconnus ou inactifs.');
      }
    }

    const payload = {
      description: dto.description.trim(),
      dateConstat: dto.dateConstat ? new Date(dto.dateConstat).toISOString() : null,
      localisation: dto.descriptionLocalisation?.trim() || null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      precisionLocalisation: dto.precisionLocalisation ?? null,
      contenus: [...contents]
        .map((item) => ({
          idTypeDechet: item.idTypeDechet,
          quantiteEstimee: item.quantiteEstimee ?? null,
          volumeEstime: item.volumeEstime ?? null,
          remarque: item.remarque?.trim() || null,
        }))
        .sort((a, b) => a.idTypeDechet.localeCompare(b.idTypeDechet)),
    };
    const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    const existing = await this.prisma.signalement.findFirst({
      where: { idUtilisateur: userId, cleIdempotence: key },
      select: { idSignalement: true, empreinteRequete: true },
    });
    if (existing) {
      if (existing.empreinteRequete !== fingerprint) {
        throw new ConflictException('Cette clé idempotente a déjà été utilisée avec un autre contenu.');
      }
      return this.getMine(existing.idSignalement, authUserId);
    }

    const now = new Date();
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const report = await tx.signalement.create({
          data: {
            idUtilisateur: userId,
            dateConstat: payload.dateConstat ? new Date(payload.dateConstat) : null,
            dateSoumission: now,
            description: payload.description,
            localisation: payload.localisation,
            latitude: payload.latitude,
            longitude: payload.longitude,
            precisionLocalisation: payload.precisionLocalisation,
            statutSignalement: 'SOUMIS',
            cleIdempotence: key,
            empreinteRequete: fingerprint,
          },
          select: { idSignalement: true },
        });

        if (contents.length) {
          await tx.contenuSignalement.createMany({
            data: payload.contenus.map((item) => ({
              idSignalement: report.idSignalement,
              idTypeDechet: item.idTypeDechet,
              quantiteEstimee: item.quantiteEstimee,
              volumeEstime: item.volumeEstime,
              remarque: item.remarque,
              etatQualification: 'EN_ATTENTE',
            })),
          });
        }

        await tx.historiqueStatutSignalement.create({
          data: {
            idSignalement: report.idSignalement,
            idUtilisateur: userId,
            ancienStatut: null,
            nouveauStatut: 'SOUMIS',
            dateChangement: now,
            motif: 'Création du signalement.',
          },
        });
        return report;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return this.getMine(created.idSignalement, authUserId);
    } catch (error) {
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        const replay = await this.prisma.signalement.findFirst({
          where: { idUtilisateur: userId, cleIdempotence: key },
          select: { idSignalement: true, empreinteRequete: true },
        });
        if (replay?.empreinteRequete === fingerprint) {
          return this.getMine(replay.idSignalement, authUserId);
        }
        throw new ConflictException('Un signalement concurrent utilise déjà cette clé idempotente.');
      }
      throw error;
    }
  }

  async listMine(authUserId: string, query: ListReportsQueryDto) {
    const userId = await this.citizenId(authUserId);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where = { idUtilisateur: userId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.signalement.count({ where }),
      this.prisma.signalement.findMany({
        where,
        select: reportSelect,
        orderBy: [{ dateSoumission: 'desc' }, { idSignalement: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map((row) => this.toReportResponse(row)), page, pageSize, total };
  }

  async getMine(idSignalement: string, authUserId: string) {
    const userId = await this.citizenId(authUserId);
    const row = await this.prisma.signalement.findFirst({
      where: { idSignalement, idUtilisateur: userId },
      select: reportSelect,
    });
    if (!row) throw new NotFoundException('Signalement introuvable.');
    return this.toReportResponse(row);
  }

  async listMySupplements(idSignalement: string, authUserId: string) {
    const userId = await this.citizenId(authUserId);
    const report = await this.prisma.signalement.findFirst({
      where: { idSignalement, idUtilisateur: userId },
      select: {
        idSignalement: true,
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
    if (!report) throw new NotFoundException('Signalement introuvable.');
    return {
      idSignalement: report.idSignalement,
      demandes: report.demandesComplement.map((item) => ({
        idDemande: item.idDemande,
        dateDemande: item.dateDemande,
        motif: item.motif,
        etatDemande: item.etatDemande,
        reponse: item.reponse && item.dateReponse
          ? { idReponse: item.idDemande, dateReponse: item.dateReponse, contenu: item.reponse }
          : null,
      })),
    };
  }

  async answerSupplement(
    idSignalement: string,
    idDemande: string,
    contenu: string,
    authUserId: string,
  ) {
    const userId = await this.citizenId(authUserId);
    const text = contenu.trim();
    if (text.length < 10 || text.length > 4000) {
      throw new BadRequestException('La réponse doit contenir entre 10 et 4000 caractères.');
    }

    const now = new Date();
    try {
      const answer = await this.prisma.$transaction(async (tx) => {
        const request = await tx.demandeComplement.findFirst({
          where: { idDemande, idSignalement, signalement: { idUtilisateur: userId } },
          select: { idDemande: true, etatDemande: true, reponse: true },
        });
        if (!request) throw new NotFoundException('Demande de complément introuvable.');
        if (request.etatDemande !== 'OUVERTE' || request.reponse !== null) {
          throw new ConflictException('Cette demande de complément a déjà reçu une réponse.');
        }

        const report = await tx.signalement.findUnique({
          where: { idSignalement },
          select: { statutSignalement: true },
        });
        if (!report || report.statutSignalement !== 'EN_ATTENTE_COMPLEMENT') {
          throw new ConflictException('Le signalement n’attend plus de complément.');
        }

        await tx.demandeComplement.update({
          where: { idDemande },
          data: { reponse: text, reponduPar: userId, dateReponse: now, etatDemande: 'REPONDUE' },
        });
        await tx.signalement.update({
          where: { idSignalement },
          data: { statutSignalement: 'COMPLEMENT_REPONDU' },
        });
        await tx.historiqueStatutSignalement.create({
          data: {
            idSignalement,
            idUtilisateur: userId,
            ancienStatut: 'EN_ATTENTE_COMPLEMENT',
            nouveauStatut: 'COMPLEMENT_REPONDU',
            dateChangement: now,
            motif: 'Réponse citoyenne à une demande de complément.',
          },
        });
        return { idReponse: idDemande, idDemande, dateReponse: now, contenu: text };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return answer;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      if (isPrismaCode(error, 'P2034') || isPrismaCode(error, 'P2002')) {
        throw new ConflictException('La demande de complément a été modifiée simultanément.');
      }
      throw error;
    }
  }

  async addPhoto(
    idSignalement: string,
    authUserId: string,
    incomingFile: unknown,
    description?: string,
  ) {
    const userId = await this.citizenId(authUserId);
    const file = validateImageFile(incomingFile);
    const report = await this.prisma.signalement.findFirst({
      where: { idSignalement, idUtilisateur: userId },
      select: { idSignalement: true, statutSignalement: true },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');
    const count = await this.prisma.photoSignalement.count({ where: { idSignalement } });
    if (count >= 3) throw new BadRequestException('Un signalement peut contenir au maximum 3 photos.');

    const now = new Date();
    const referencePhoto = `reports/${idSignalement}/${randomUUID()}.${file.extension}`;
    await this.storage.upload(referencePhoto, file);
    try {
      const photo = await this.prisma.photoSignalement.create({
        data: {
          idSignalement,
          referencePhoto,
          description: description?.trim() || null,
          dateAjout: now,
          dateExpiration: this.storage.getExpirationDate(now),
        },
        select: { idPhotoSignalement: true, description: true, dateAjout: true },
      });
      return { ...photo, etatPublication: 'PRIVEE' };
    } catch (error) {
      await this.storage.remove(referencePhoto).catch(() => undefined);
      throw error;
    }
  }

  async createPhotoUrl(idSignalement: string, idPhotoSignalement: string, authUserId: string) {
    const userId = await this.citizenId(authUserId);
    const photo = await this.prisma.photoSignalement.findFirst({
      where: {
        idPhotoSignalement,
        idSignalement,
        signalement: { idUtilisateur: userId },
      },
      select: { referencePhoto: true, dateExpiration: true, mediaPurgeAt: true },
    });
    const now = new Date();
    if (!photo || photo.dateExpiration <= now || (photo.mediaPurgeAt && photo.mediaPurgeAt <= now)) {
      throw new NotFoundException('Photo introuvable ou expirée.');
    }
    return this.storage.createSignedUrl(photo.referencePhoto);
  }

  private toReportResponse(row: ReportRecord) {
    return {
      idSignalement: row.idSignalement,
      dateConstat: row.dateConstat,
      dateSoumission: row.dateSoumission,
      description: row.description,
      latitude: row.latitude?.toString() ?? null,
      longitude: row.longitude?.toString() ?? null,
      precisionLocalisation: row.precisionLocalisation?.toString() ?? null,
      descriptionLocalisation: row.localisation,
      statutSignalement: row.statutSignalement,
      dateDecision: row.dateDecision,
      motifDecision: row.motifDecision,
      contenus: row.contenus.map((item) => ({
        idTypeDechet: item.idTypeDechet,
        quantiteEstimee: item.quantiteEstimee?.toString() ?? null,
        volumeEstime: item.volumeEstime?.toString() ?? null,
        remarque: item.remarque,
        typeDechet: item.typeDechet,
      })),
      photos: row.photos.map((photo) => ({ ...photo, etatPublication: 'PRIVEE' })),
    };
  }
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
