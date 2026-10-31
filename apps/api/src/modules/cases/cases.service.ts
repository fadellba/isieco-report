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
import type { AttachReportDto } from './dto/attach-report.dto.js';
import type { CreateCaseFromReportDto } from './dto/create-case-from-report.dto.js';
import type { DetachReportDto } from './dto/detach-report.dto.js';
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
  dateQualification: true,
  idCommune: true,
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
  rattachements: {
    orderBy: { dateDebutRattachement: 'asc' as const },
    include: {
      signalement: {
        select: {
          idSignalement: true,
          dateSoumission: true,
          description: true,
          statutSignalement: true,
        },
      },
    },
  },
  historiquesPriorite: { orderBy: { dateDefinition: 'desc' as const } },
  historiquesLocalisation: { orderBy: { dateModification: 'desc' as const } },
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

  async createFromReport(
    idSignalement: string,
    dto: CreateCaseFromReportDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const linked = await tx.rattachementSignalement.findFirst({
            where: { idSignalement, dateFinRattachement: null },
            include: { dossier: { select: caseDetailSelect } },
          });
          if (linked) return linked.dossier;

          const report = await this.loadQualifiedReport(tx, idSignalement);
          const now = new Date();
          const summary =
            dto.descriptionSynthese?.trim() ||
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
              dateQualification: report.dateDecision ?? report.qualifications[0]?.dateQualification ?? now,
              idCommune: report.idCommune,
              latitude: report.latitude,
              longitude: report.longitude,
              precisionLocalisation: report.precisionLocalisation,
              descriptionLocalisation: report.descriptionLocalisation,
              creePar: actorId,
            },
            select: { idDossier: true },
          });

          const rattachement = await this.createAttachmentRecords(
            tx,
            dossier.idDossier,
            report,
            actorId,
            now,
            'INITIAL',
            'Création initiale du dossier à partir du signalement qualifié.',
          );

          await this.writeEvent(tx, {
            type: 'DOSSIER_CREE',
            actorId,
            dossierId: dossier.idDossier,
            after: {
              referenceDossier,
              statutDossier: 'OUVERT',
              priorite: dto.priorite ?? 'NORMALE',
              idSignalementSource: idSignalement,
              nombreCategories: report.qualifications.length,
            },
          });
          await this.writeEvent(tx, {
            type: 'SIGNALEMENT_RATTACHE_DOSSIER',
            actorId,
            rattachementId: rattachement.idRattachement,
            after: {
              idDossier: dossier.idDossier,
              idSignalement,
              typeRattachement: 'INITIAL',
            },
          });

          return tx.dossierTraitement.findUniqueOrThrow({
            where: { idDossier: dossier.idDossier },
            select: caseDetailSelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.handleWriteConflict(error, 'Le signalement a été rattaché à un dossier par une opération concurrente.');
    }
  }

  async listCases(query: ListCasesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where = query.statutDossier ? { statutDossier: query.statutDossier } : {};
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
          idCommune: true,
          contenus: {
            select: {
              idTypeDechet: true,
              etatContenuDossier: true,
              etatPriseEnCharge: true,
              typeDechet: { select: { idTypeDechet: true, codeType: true, libelle: true } },
            },
          },
          _count: { select: { rattachements: { where: { dateFinRattachement: null } } } },
        },
      }),
    ]);
    const items = rows.map(({ _count, ...item }) => ({
      ...item,
      nombreRattachements: _count.rattachements,
    }));
    return { items, page, pageSize, total };
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
    return this.prisma.evenementMetier.findMany({
      where: { idDossierCible: idDossier },
      orderBy: [{ dateEnregistrement: 'desc' }, { idEvenement: 'desc' }],
    });
  }

  async updatePriority(idDossier: string, dto: UpdateCasePriorityDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const justification = dto.justification.trim();
    if (justification.length < 5 || justification.length > 2000) {
      throw new BadRequestException('La justification doit contenir entre 5 et 2000 caractères.');
    }
    return this.serializableWrite(
      async (tx) => {
        const current = await tx.dossierTraitement.findUnique({
          where: { idDossier },
          select: { idDossier: true, priorite: true, statutDossier: true },
        });
        if (!current) throw new NotFoundException('Dossier introuvable.');
        if (current.statutDossier === 'CLOTURE') {
          throw new ConflictException('La priorité d’un dossier clôturé ne peut pas être modifiée.');
        }
        if (current.priorite === dto.priorite) {
          return tx.dossierTraitement.findUniqueOrThrow({ where: { idDossier }, select: caseDetailSelect });
        }

        const now = new Date();
        const updated = await tx.dossierTraitement.updateMany({
          where: { idDossier, priorite: current.priorite, statutDossier: current.statutDossier },
          data: { priorite: dto.priorite },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Le dossier a changé simultanément. Rechargez son état.');
        }

        await tx.historiquePrioriteDossier.create({
          data: {
            idDossier,
            priorite: dto.priorite,
            definiePar: actorId,
            dateDefinition: now,
            justification,
          },
        });
        await this.writeEvent(tx, {
          type: 'DOSSIER_PRIORITE_MODIFIEE',
          actorId,
          dossierId: idDossier,
          before: { priorite: current.priorite },
          after: { priorite: dto.priorite, dateDefinition: now.toISOString() },
          reason: justification,
        });
        return tx.dossierTraitement.findUniqueOrThrow({ where: { idDossier }, select: caseDetailSelect });
      },
      'Le dossier a été modifié simultanément. Rechargez son état.',
    );
  }

  async updateLocation(idDossier: string, dto: UpdateCaseLocationDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const motif = dto.motif.trim();
    if (motif.length < 5 || motif.length > 2000) {
      throw new BadRequestException('Le motif de modification doit contenir entre 5 et 2000 caractères.');
    }

    return this.serializableWrite(
      async (tx) => {
        const current = await tx.dossierTraitement.findUnique({
          where: { idDossier },
          select: {
            idDossier: true,
            idCommune: true,
            latitude: true,
            longitude: true,
            precisionLocalisation: true,
            descriptionLocalisation: true,
            statutDossier: true,
          },
        });
        if (!current) throw new NotFoundException('Dossier introuvable.');
        if (current.statutDossier === 'CLOTURE') {
          throw new ConflictException('La localisation d’un dossier clôturé ne peut pas être modifiée.');
        }

        const idCommune =
          dto.idCommune === undefined ? current.idCommune : dto.idCommune;
        const latitude =
          dto.latitude === undefined ? current.latitude : dto.latitude;
        const longitude =
          dto.longitude === undefined ? current.longitude : dto.longitude;
        const precisionLocalisation =
          dto.precisionLocalisation === undefined
            ? current.precisionLocalisation
            : dto.precisionLocalisation;
        const descriptionLocalisation =
          dto.descriptionLocalisation === undefined
            ? current.descriptionLocalisation
            : dto.descriptionLocalisation;

        if ((latitude === null) !== (longitude === null)) {
          throw new BadRequestException('La latitude et la longitude doivent être fournies ensemble.');
        }
        if (precisionLocalisation !== null && latitude === null) {
          throw new BadRequestException('La précision exige des coordonnées.');
        }
        if (idCommune) {
          const commune = await tx.commune.findFirst({
            where: {
              idCommune,
              actif: true,
              departement: { actif: true, region: { actif: true } },
            },
            select: { idCommune: true },
          });
          if (!commune) throw new BadRequestException('La commune fournie est inconnue ou inactive.');
        }

        const now = new Date();
        const updated = await tx.dossierTraitement.updateMany({
          where: { idDossier, statutDossier: current.statutDossier },
          data: {
            idCommune,
            latitude,
            longitude,
            precisionLocalisation,
            descriptionLocalisation,
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Le dossier a changé simultanément. Rechargez son état.');
        }

        await tx.historiqueLocalisationDossier.create({
          data: {
            idDossier,
            idCommune,
            latitude,
            longitude,
            precisionLocalisation,
            descriptionLocalisation,
            modifiePar: actorId,
            dateModification: now,
            motif,
          },
        });
        await this.writeEvent(tx, {
          type: 'DOSSIER_LOCALISATION_MODIFIEE',
          actorId,
          dossierId: idDossier,
          before: {
            idCommune: current.idCommune,
            latitude: current.latitude?.toString() ?? null,
            longitude: current.longitude?.toString() ?? null,
          },
          after: {
            idCommune,
            latitude: latitude?.toString() ?? null,
            longitude: longitude?.toString() ?? null,
            dateModification: now.toISOString(),
          },
          reason: motif,
        });
        return tx.dossierTraitement.findUniqueOrThrow({ where: { idDossier }, select: caseDetailSelect });
      },
      'Le dossier a été modifié simultanément. Rechargez son état.',
    );
  }

  async attachReport(
    idDossier: string,
    idSignalement: string,
    dto: AttachReportDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const dossier = await tx.dossierTraitement.findUnique({
            where: { idDossier },
            select: { idDossier: true, statutDossier: true },
          });
          if (!dossier) throw new NotFoundException('Dossier introuvable.');
          if (dossier.statutDossier === 'CLOTURE') {
            throw new ConflictException('Un signalement ne peut pas être ajouté à un dossier clôturé.');
          }
          const report = await this.loadQualifiedReport(tx, idSignalement);
          const alreadyAttached = await tx.rattachementSignalement.findFirst({
            where: { idSignalement, dateFinRattachement: null },
            select: { idRattachement: true, idDossier: true },
          });
          if (alreadyAttached) {
            throw new ConflictException(
              alreadyAttached.idDossier === idDossier
                ? 'Ce signalement est déjà rattaché à ce dossier.'
                : 'Ce signalement est déjà rattaché à un autre dossier actif.',
            );
          }

          const existingContent = await tx.contenuDossier.findMany({
            where: {
              idDossier,
              idTypeDechet: { in: report.qualifications.map((item) => item.idTypeDechet) },
            },
            select: { idTypeDechet: true },
          });
          if (existingContent.length > 0) {
            throw new ConflictException(
              'Au moins une catégorie existe déjà dans le dossier. La fusion de quantités de provenances multiples n’est pas définie.',
            );
          }

          const now = new Date();
          const rattachement = await this.createAttachmentRecords(
            tx,
            idDossier,
            report,
            actorId,
            now,
            'ASSOCIATION',
            dto.motif?.trim() || null,
          );
          await this.writeEvent(tx, {
            type: 'SIGNALEMENT_RATTACHE_DOSSIER',
            actorId,
            rattachementId: rattachement.idRattachement,
            after: {
              idDossier,
              idSignalement,
              typeRattachement: 'ASSOCIATION',
            },
            reason: dto.motif?.trim(),
          });
          return tx.dossierTraitement.findUniqueOrThrow({ where: { idDossier }, select: caseDetailSelect });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.handleWriteConflict(error, 'Le signalement a été rattaché simultanément.');
    }
  }

  async detachReport(
    idDossier: string,
    idSignalement: string,
    dto: DetachReportDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const motif = dto.motif.trim();
    if (motif.length < 5 || motif.length > 2000) {
      throw new BadRequestException('Le motif de détachement doit contenir entre 5 et 2000 caractères.');
    }

    return this.serializableWrite(
      async (tx) => {
        const dossier = await tx.dossierTraitement.findUnique({
          where: { idDossier },
          select: { idDossier: true, statutDossier: true },
        });
        if (!dossier) throw new NotFoundException('Dossier introuvable.');
        if (dossier.statutDossier === 'CLOTURE') {
          throw new ConflictException('Un signalement ne peut pas être détaché d’un dossier clôturé.');
        }

        const rattachement = await tx.rattachementSignalement.findFirst({
          where: { idDossier, idSignalement, dateFinRattachement: null },
          select: { idRattachement: true },
        });
        if (!rattachement) throw new NotFoundException('Rattachement actif introuvable.');

        const now = new Date();
        const closed = await tx.rattachementSignalement.updateMany({
          where: { idRattachement: rattachement.idRattachement, dateFinRattachement: null },
          data: { dateFinRattachement: now, motif },
        });
        if (closed.count !== 1) {
          throw new ConflictException('Le rattachement a été fermé simultanément.');
        }

        const activeProvenances = await tx.provenanceContenuDossier.findMany({
          where: { idRattachement: rattachement.idRattachement, dateFin: null },
          select: { idTypeDechet: true },
        });
        await tx.provenanceContenuDossier.updateMany({
          where: { idRattachement: rattachement.idRattachement, dateFin: null },
          data: { dateFin: now, motif },
        });

        for (const provenance of activeProvenances) {
          const remaining = await tx.provenanceContenuDossier.count({
            where: { idDossier, idTypeDechet: provenance.idTypeDechet, dateFin: null },
          });
          if (remaining === 0) {
            await tx.contenuDossier.updateMany({
              where: { idDossier, idTypeDechet: provenance.idTypeDechet, etatContenuDossier: 'ACTIF' },
              data: {
                etatContenuDossier: 'RETIRE',
                dateRetrait: now,
                retirePar: actorId,
                motifRetrait: motif,
              },
            });
          }
        }

        await this.writeEvent(tx, {
          type: 'SIGNALEMENT_DETACHE_DOSSIER',
          actorId,
          rattachementId: rattachement.idRattachement,
          before: { idDossier, idSignalement },
          after: { dateFinRattachement: now.toISOString() },
          reason: motif,
        });
        return tx.dossierTraitement.findUniqueOrThrow({ where: { idDossier }, select: caseDetailSelect });
      },
      'Le rattachement ou le dossier a été modifié simultanément.',
    );
  }

  private async loadQualifiedReport(tx: Transaction, idSignalement: string) {
    const report = await tx.signalement.findUnique({
      where: { idSignalement },
      select: {
        idSignalement: true,
        statutSignalement: true,
        description: true,
        dateDecision: true,
        idCommune: true,
        latitude: true,
        longitude: true,
        precisionLocalisation: true,
        descriptionLocalisation: true,
      },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');
    if (report.statutSignalement !== 'QUALIFIE') {
      throw new ConflictException('Seuls les signalements qualifiés peuvent être rattachés à un dossier.');
    }

    const qualifications = await tx.qualificationSignalement.findMany({
      where: { idSignalement, etatQualification: 'RETENU' },
      orderBy: { idTypeDechet: 'asc' },
      select: {
        idQualification: true,
        idSignalement: true,
        idTypeDechet: true,
        quantiteEstimee: true,
        uniteQuantite: true,
        quantiteEstimeeLegacy: true,
        volumeEstime: true,
        remarque: true,
        qualifiePar: true,
        dateQualification: true,
      },
    });
    if (qualifications.length === 0) {
      throw new ConflictException('Le signalement ne possède aucune catégorie retenue.');
    }

    const now = new Date();
    const activeTypes = await tx.typeDechet.findMany({
      where: {
        idTypeDechet: { in: qualifications.map((item) => item.idTypeDechet) },
        dateDebutValidite: { lte: now },
        OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: now } }],
      },
      select: { idTypeDechet: true },
    });
    if (activeTypes.length !== qualifications.length) {
      throw new ConflictException('Une catégorie qualifiée est devenue inactive ; le dossier ne peut pas être créé.');
    }

    if (report.idCommune) {
      const commune = await tx.commune.findFirst({
        where: {
          idCommune: report.idCommune,
          actif: true,
          departement: { actif: true, region: { actif: true } },
        },
        select: { idCommune: true },
      });
      if (!commune) {
        throw new ConflictException('La commune du signalement n’est plus active.');
      }
    }

    return { ...report, qualifications };
  }

  private async createAttachmentRecords(
    tx: Transaction,
    idDossier: string,
    report: Awaited<ReturnType<CasesService['loadQualifiedReport']>>,
    actorId: string,
    now: Date,
    typeRattachement: 'INITIAL' | 'ASSOCIATION',
    motif: string | null,
  ) {
    const rattachement = await tx.rattachementSignalement.create({
      data: {
        idSignalement: report.idSignalement,
        idDossier,
        dateDebutRattachement: now,
        typeRattachement,
        motif,
        idActeur: actorId,
      },
      select: { idRattachement: true },
    });

    await tx.contenuDossier.createMany({
      data: report.qualifications.map((item) => ({
        idDossier,
        idTypeDechet: item.idTypeDechet,
        quantiteEstimee: item.quantiteEstimee,
        uniteQuantite: item.uniteQuantite,
        quantiteEstimeeLegacy: item.quantiteEstimeeLegacy,
        volumeEstime: item.volumeEstime,
        niveauRisqueQualifie: null,
        remarque: item.remarque,
        qualifiePar: item.qualifiePar,
        dateQualification: item.dateQualification,
        etatContenuDossier: 'ACTIF',
        etatPriseEnCharge: 'EN_ATTENTE',
        dateAttenteEquipe: null,
        motifAttenteEquipe: null,
        dateRetrait: null,
        retirePar: null,
        motifRetrait: null,
        origineAjout: 'QUALIFICATION',
        motifAjout: null,
      })),
    });

    await tx.provenanceContenuDossier.createMany({
      data: report.qualifications.map((item) => ({
        idDossier,
        idTypeDechet: item.idTypeDechet,
        idQualification: item.idQualification,
        dateDebut: now,
        idSignalement: report.idSignalement,
        idRattachement: rattachement.idRattachement,
        ajoutePar: actorId,
        dateFin: null,
        motif: null,
      })),
    });
    return rattachement;
  }

  private async writeEvent(
    tx: Transaction,
    payload: {
      type: string;
      actorId: string;
      dossierId?: string;
      rattachementId?: string;
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
        ...(payload.dossierId ? { idDossierCible: payload.dossierId } : {}),
        ...(payload.rattachementId ? { idRattachementCible: payload.rattachementId } : {}),
        ...(payload.before ? { donneesAvant: payload.before as Prisma.InputJsonObject } : {}),
        ...(payload.after ? { donneesApres: payload.after as Prisma.InputJsonObject } : {}),
        ...(payload.reason ? { motif: payload.reason } : {}),
        versionSchema: 1,
      },
    });
  }


  private async serializableWrite<T>(
    operation: (tx: Transaction) => Promise<T>,
    conflictMessage: string,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      this.handleWriteConflict(error, conflictMessage);
    }
  }

  private handleWriteConflict(error: unknown, message: string): never {
    if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
      throw new ConflictException(message);
    }
    throw error;
  }
}
