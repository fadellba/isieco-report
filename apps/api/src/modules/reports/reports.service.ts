import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ListReportsQueryDto } from './dto/list-reports-query.dto.js';

type Transaction = Prisma.TransactionClient;

const reportSelect = {
  idSignalement: true,
  dateConstat: true,
  dateSoumission: true,
  description: true,
  idCommune: true,
  latitude: true,
  longitude: true,
  precisionLocalisation: true,
  descriptionLocalisation: true,
  statutSignalement: true,
  dateDecision: true,
  motifDecision: true,
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
  photos: {
    select: {
      idPhotoSignalement: true,
      description: true,
      dateAjout: true,
      etatPublication: true,
    },
    orderBy: { dateAjout: 'asc' as const },
  },
} satisfies Prisma.SignalementSelect;

type ReportRecord = Prisma.SignalementGetPayload<{ select: typeof reportSelect }>;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function canonicalPayload(dto: CreateReportDto) {
  return {
    description: dto.description.trim(),
    dateConstat: dto.dateConstat ? new Date(dto.dateConstat).toISOString() : null,
    idCommune: dto.idCommune ?? null,
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
    precisionLocalisation: dto.precisionLocalisation ?? null,
    descriptionLocalisation: dto.descriptionLocalisation?.trim() || null,
    contenus: [...(dto.contenus ?? [])]
      .map((content) => ({
        idTypeDechet: content.idTypeDechet,
        quantiteEstimee: content.quantiteEstimee ?? null,
        volumeEstime: content.volumeEstime ?? null,
        remarque: content.remarque?.trim() || null,
      }))
      .sort((left, right) => left.idTypeDechet.localeCompare(right.idTypeDechet)),
  };
}

function fingerprint(payload: ReturnType<typeof canonicalPayload>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async actorId(authUserId: string): Promise<string> {
    const actor = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: { idUtilisateur: true, etatCompte: true },
    });
    if (!actor || actor.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un compte citoyen actif est requis pour déposer un signalement.');
    }
    return actor.idUtilisateur;
  }

  private async findIdempotent(
    actorId: string,
    key: string,
  ): Promise<{ empreinteRequete: string; signalement: ReportRecord } | null> {
    return this.prisma.idempotenceSignalement.findUnique({
      where: {
        idUtilisateur_cleIdempotence: {
          idUtilisateur: actorId,
          cleIdempotence: key,
        },
      },
      include: { signalement: { select: reportSelect } },
    });
  }

  private assertSameRequest(
    existing: { empreinteRequete: string; signalement: ReportRecord },
    requestFingerprint: string,
  ): ReportRecord {
    if (existing.empreinteRequete !== requestFingerprint) {
      throw new ConflictException(
        'Cette clé Idempotency-Key a déjà été utilisée avec un contenu différent.',
      );
    }
    return existing.signalement;
  }

  async createReport(dto: CreateReportDto, authUserId: string, idempotencyKey: string) {
    const actorId = await this.actorId(authUserId);
    const key = idempotencyKey.trim();
    if (!/^[A-Za-z0-9._:-]{8,128}$/u.test(key)) {
      throw new BadRequestException('L’en-tête Idempotency-Key doit contenir 8 à 128 caractères autorisés.');
    }

    const payload = canonicalPayload(dto);
    const requestFingerprint = fingerprint(payload);
    const now = new Date();

    if (payload.dateConstat && new Date(payload.dateConstat).getTime() > now.getTime()) {
      throw new BadRequestException('La date du constat ne peut pas être dans le futur.');
    }
    if ((payload.latitude === null) !== (payload.longitude === null)) {
      throw new BadRequestException('La latitude et la longitude doivent être fournies ensemble.');
    }
    if (payload.precisionLocalisation !== null && payload.latitude === null) {
      throw new BadRequestException('La précision de localisation exige des coordonnées.');
    }

    const existing = await this.findIdempotent(actorId, key);
    if (existing) return this.assertSameRequest(existing, requestFingerprint);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const concurrent = await tx.idempotenceSignalement.findUnique({
            where: {
              idUtilisateur_cleIdempotence: {
                idUtilisateur: actorId,
                cleIdempotence: key,
              },
            },
            include: { signalement: { select: reportSelect } },
          });
          if (concurrent) return this.assertSameRequest(concurrent, requestFingerprint);

          if (payload.contenus.length > 0) {
            const activeWasteTypes = await tx.typeDechet.findMany({
              where: {
                idTypeDechet: { in: payload.contenus.map((content) => content.idTypeDechet) },
                dateDebutValidite: { lte: now },
                OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: now } }],
              },
              select: { idTypeDechet: true },
            });
            if (activeWasteTypes.length !== payload.contenus.length) {
              throw new BadRequestException('Un ou plusieurs types de déchets sont inconnus ou inactifs.');
            }
          }

          if (payload.idCommune) {
            const commune = await tx.commune.findFirst({
              where: {
                idCommune: payload.idCommune,
                actif: true,
                departement: {
                  actif: true,
                  region: { actif: true },
                },
              },
              select: { idCommune: true },
            });
            if (!commune) {
              throw new BadRequestException('La commune fournie est inconnue ou inactive.');
            }
          }

          const report = await tx.signalement.create({
            data: {
              idUtilisateur: actorId,
              dateConstat: payload.dateConstat ? new Date(payload.dateConstat) : null,
              dateSoumission: now,
              description: payload.description,
              idCommune: payload.idCommune,
              latitude: payload.latitude,
              longitude: payload.longitude,
              precisionLocalisation: payload.precisionLocalisation,
              descriptionLocalisation: payload.descriptionLocalisation,
              statutSignalement: 'SOUMIS',
            },
            select: { idSignalement: true },
          });

          if (payload.contenus.length > 0) {
            await tx.contenuSignalement.createMany({
              data: payload.contenus.map((content) => ({
                idSignalement: report.idSignalement,
                idTypeDechet: content.idTypeDechet,
                quantiteEstimee: content.quantiteEstimee,
                volumeEstime: content.volumeEstime,
                remarque: content.remarque,
              })),
            });
          }

          await tx.idempotenceSignalement.create({
            data: {
              idUtilisateur: actorId,
              cleIdempotence: key,
              empreinteRequete: requestFingerprint,
              idSignalement: report.idSignalement,
              dateCreation: now,
            },
          });

          await this.writeEvent(tx, {
            reportId: report.idSignalement,
            actorId,
            type: 'SIGNALEMENT_SOUMIS',
            after: {
              statut: 'SOUMIS',
              nombreContenus: payload.contenus.length,
              localisationFournie: payload.latitude !== null || payload.idCommune !== null,
            },
          });

          return tx.signalement.findUniqueOrThrow({
            where: { idSignalement: report.idSignalement },
            select: reportSelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) {
        const raced = await this.findIdempotent(actorId, key);
        if (raced) return this.assertSameRequest(raced, requestFingerprint);
        throw new ConflictException('Une soumission concurrente a utilisé cette clé Idempotency-Key.');
      }
      if (isPrismaCode(error, 'P2034')) {
        throw new ConflictException('Le signalement a été modifié simultanément. Réessayez avec la même clé.');
      }
      throw error;
    }
  }

  async listMine(authUserId: string, query: ListReportsQueryDto) {
    const actorId = await this.actorId(authUserId);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const [total, items] = await this.prisma.$transaction([
      this.prisma.signalement.count({ where: { idUtilisateur: actorId } }),
      this.prisma.signalement.findMany({
        where: { idUtilisateur: actorId },
        orderBy: [{ dateSoumission: 'desc' }, { idSignalement: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: reportSelect,
      }),
    ]);
    return { items, page, pageSize, total };
  }

  async getMine(idSignalement: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const report = await this.prisma.signalement.findFirst({
      where: { idSignalement, idUtilisateur: actorId },
      select: reportSelect,
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');
    return report;
  }


  async listMySupplements(idSignalement: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const report = await this.prisma.signalement.findFirst({
      where: { idSignalement, idUtilisateur: actorId },
      select: { idSignalement: true },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');

    const demandes = await this.prisma.demandeComplement.findMany({
      where: { idSignalement },
      orderBy: [{ dateDemande: 'desc' }, { idDemande: 'desc' }],
      select: {
        idDemande: true,
        dateDemande: true,
        motif: true,
        etatDemande: true,
        reponse: {
          select: {
            idReponse: true,
            dateReponse: true,
            contenu: true,
          },
        },
      },
    });
    return { idSignalement, demandes };
  }

  async answerSupplement(
    idSignalement: string,
    idDemande: string,
    contenu: string,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const cleanContent = contenu.trim();
    if (cleanContent.length < 10 || cleanContent.length > 4000) {
      throw new BadRequestException('La réponse doit contenir entre 10 et 4000 caractères.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const demande = await tx.demandeComplement.findFirst({
            where: { idDemande, idSignalement },
            include: {
              signalement: {
                select: {
                  idSignalement: true,
                  idUtilisateur: true,
                  statutSignalement: true,
                },
              },
            },
          });

          if (!demande || demande.signalement.idUtilisateur !== actorId) {
            throw new NotFoundException('Demande de complément introuvable.');
          }
          if (
            demande.etatDemande !== 'OUVERTE' ||
            demande.signalement.statutSignalement !== 'EN_ATTENTE_COMPLEMENT'
          ) {
            throw new ConflictException('Cette demande de complément n’est plus ouverte.');
          }

          const now = new Date();
          const closedRequest = await tx.demandeComplement.updateMany({
            where: { idDemande, etatDemande: 'OUVERTE' },
            data: { etatDemande: 'REPONDUE' },
          });
          if (closedRequest.count !== 1) {
            throw new ConflictException('La demande de complément a été traitée simultanément.');
          }

          const updatedReport = await tx.signalement.updateMany({
            where: {
              idSignalement,
              idUtilisateur: actorId,
              statutSignalement: 'EN_ATTENTE_COMPLEMENT',
            },
            data: { statutSignalement: 'COMPLEMENT_REPONDU' },
          });
          if (updatedReport.count !== 1) {
            throw new ConflictException('Le signalement a changé d’état simultanément.');
          }

          const reponse = await tx.reponseComplement.create({
            data: {
              idDemande,
              reponduPar: actorId,
              dateReponse: now,
              contenu: cleanContent,
            },
            select: {
              idReponse: true,
              idDemande: true,
              dateReponse: true,
              contenu: true,
            },
          });

          await this.writeEvent(tx, {
            reportId: idSignalement,
            actorId,
            type: 'COMPLEMENT_REPONDU',
            after: {
              statutSignalement: 'COMPLEMENT_REPONDU',
              etatDemande: 'REPONDUE',
              idDemande,
              dateReponse: now.toISOString(),
            },
          });
          return reponse;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) {
        throw new ConflictException('Une réponse a déjà été enregistrée pour cette demande.');
      }
      if (isPrismaCode(error, 'P2034')) {
        throw new ConflictException('La demande a été modifiée simultanément. Rechargez le signalement.');
      }
      throw error;
    }
  }

  private async writeEvent(
    tx: Transaction,
    payload: {
      reportId: string;
      actorId: string;
      type: string;
      after: Prisma.InputJsonValue;
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
        donneesApres: payload.after,
        versionSchema: 1,
      },
    });
  }
}
