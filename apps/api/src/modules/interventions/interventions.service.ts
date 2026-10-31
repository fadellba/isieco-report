import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { SupabaseStorageService } from '../../infrastructure/storage/supabase-storage.service.js';
import { validateImageFile } from '../../infrastructure/storage/media-file.js';
import type { SubmitInterventionDto } from './dto/submit-intervention.dto.js';
import type { UploadInterventionPhotoDto } from './dto/upload-intervention-photo.dto.js';

type Transaction = Prisma.TransactionClient;

const interventionDetailSelect = {
  idIntervention: true,
  idAffectation: true,
  dateHeureDebut: true,
  dateHeureFin: true,
  dateSoumissionCompteRendu: true,
  statutIntervention: true,
  resultatIntervention: true,
  compteRendu: true,
  motifException: true,
  renseignePar: true,
  affectation: {
    select: {
      idAffectation: true,
      idEquipe: true,
      etatAffectation: true,
      decisionEquipe: true,
      contenuDossier: {
        select: {
          idDossier: true,
          idTypeDechet: true,
          etatContenuDossier: true,
          etatPriseEnCharge: true,
          dossier: { select: { referenceDossier: true, statutDossier: true } },
        },
      },
    },
  },
} satisfies Prisma.InterventionSelect;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

@Injectable()
export class InterventionsService {
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
      throw new ForbiddenException('Un compte actif est requis pour cette opération.');
    }
    return actor.idUtilisateur;
  }

  async listTeamInterventions(idEquipe: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const now = new Date();
    const [team, membership, assignments] = await Promise.all([
      this.prisma.equipe.findUnique({
        where: { idEquipe },
        select: { idEquipe: true },
      }),
      this.prisma.appartenanceEquipe.findFirst({
        where: {
          idEquipe,
          idUtilisateur: actorId,
          dateDebut: { lte: now },
          OR: [{ dateFin: null }, { dateFin: { gte: now } }],
        },
        select: { idEquipe: true },
      }),
      this.prisma.affectation.findMany({
        where: { idEquipe, dateFinAffectation: null },
        select: { idAffectation: true },
      }),
    ]);
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (!membership) throw new ForbiddenException('Une appartenance active à cette équipe est requise.');
    const assignmentIds = assignments.map((assignment) => assignment.idAffectation);
    if (assignmentIds.length === 0) return [];
    return this.prisma.intervention.findMany({
      where: { idAffectation: { in: assignmentIds } },
      orderBy: [{ dateHeureDebut: 'desc' }, { idIntervention: 'desc' }],
      select: interventionDetailSelect,
    });
  }

  async startIntervention(idAffectation: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.serializableWrite(
      async (tx) => {
        const assignment = await tx.affectation.findUnique({
          where: { idAffectation },
          select: {
            idAffectation: true,
            idEquipe: true,
            dateFinAffectation: true,
            etatAffectation: true,
            decisionEquipe: true,
            equipe: { select: { etatEquipe: true } },
            contenuDossier: {
              select: {
                etatContenuDossier: true,
                etatPriseEnCharge: true,
                dossier: { select: { statutDossier: true } },
              },
            },
          },
        });
        if (!assignment) throw new NotFoundException('Affectation introuvable.');
        if (
          assignment.dateFinAffectation ||
          assignment.etatAffectation !== 'ACTIVE' ||
          assignment.decisionEquipe !== 'ACCEPTEE'
        ) {
          throw new ConflictException('Seule une affectation active et acceptée peut démarrer une intervention.');
        }
        if (assignment.equipe.etatEquipe !== 'ACTIVE') {
          throw new ConflictException('L’équipe affectée n’est plus active.');
        }
        if (
          assignment.contenuDossier.etatContenuDossier !== 'ACTIF' ||
          assignment.contenuDossier.etatPriseEnCharge !== 'EN_COURS' ||
          assignment.contenuDossier.dossier.statutDossier === 'CLOTURE'
        ) {
          throw new ConflictException('Le contenu ou le dossier n’est plus éligible à une intervention.');
        }

        await this.requireCurrentTeamMembership(tx, actorId, assignment.idEquipe);
        const openIntervention = await tx.intervention.findFirst({
          where: { idAffectation, statutIntervention: 'EN_COURS', dateSoumissionCompteRendu: null },
          select: { idIntervention: true },
        });
        if (openIntervention) {
          throw new ConflictException('Une intervention est déjà en cours pour cette affectation.');
        }

        const latestIntervention = await tx.intervention.findFirst({
          where: { idAffectation },
          orderBy: [{ dateHeureDebut: 'desc' }, { idIntervention: 'desc' }],
          select: {
            idIntervention: true,
            statutIntervention: true,
            dateSoumissionCompteRendu: true,
          },
        });
        if (latestIntervention) {
          if (latestIntervention.statutIntervention !== 'SOUMISE' || !latestIntervention.dateSoumissionCompteRendu) {
            throw new ConflictException('La précédente intervention doit être soumise avant tout nouveau démarrage.');
          }
          const latestVerification = await tx.verificationResolution.findFirst({
            where: { idAffectation },
            orderBy: [{ dateVerification: 'desc' }, { idVerification: 'desc' }],
            select: { etatVerification: true, dateVerification: true },
          });
          if (
            latestVerification?.etatVerification !== 'REPRISE' ||
            latestVerification.dateVerification.getTime() < latestIntervention.dateSoumissionCompteRendu.getTime()
          ) {
            throw new ConflictException('Une nouvelle intervention n’est autorisée qu’après une demande de reprise par le vérificateur.');
          }
        }

        const now = new Date();
        const created = await tx.intervention.create({
          data: {
            idAffectation,
            dateHeureDebut: now,
            dateHeureFin: null,
            dateSoumissionCompteRendu: null,
            statutIntervention: 'EN_COURS',
            resultatIntervention: null,
            compteRendu: null,
            motifException: null,
            renseignePar: actorId,
          },
          select: { idIntervention: true },
        });
        await this.writeEvent(tx, {
          type: 'INTERVENTION_DEMARREE',
          actorId,
          interventionId: created.idIntervention,
          after: {
            idAffectation,
            dateHeureDebut: now.toISOString(),
            statutIntervention: 'EN_COURS',
          },
        });
        return tx.intervention.findUniqueOrThrow({
          where: { idIntervention: created.idIntervention },
          select: interventionDetailSelect,
        });
      },
      'Une intervention est déjà en cours ou l’affectation a changé simultanément.',
    );
  }

  async submitIntervention(
    idIntervention: string,
    dto: SubmitInterventionDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const result = dto.resultatIntervention;
    const exceptionReason = dto.motifException?.trim();
    if (result !== 'TERMINEE' && (!exceptionReason || exceptionReason.length < 5)) {
      throw new BadRequestException('Un motif d’exception d’au moins 5 caractères est obligatoire pour un résultat partiel ou impossible.');
    }
    const compteRendu = dto.compteRendu.trim();
    if (compteRendu.length < 20) {
      throw new BadRequestException('Le compte rendu doit contenir au moins 20 caractères.');
    }

    return this.serializableWrite(
      async (tx) => {
        const current = await tx.intervention.findUnique({
          where: { idIntervention },
          select: {
            idIntervention: true,
            idAffectation: true,
            dateHeureDebut: true,
            dateHeureFin: true,
            dateSoumissionCompteRendu: true,
            statutIntervention: true,
            renseignePar: true,
            affectation: {
              select: {
                idEquipe: true,
                dateFinAffectation: true,
                etatAffectation: true,
                decisionEquipe: true,
                contenuDossier: {
                  select: {
                    etatContenuDossier: true,
                    etatPriseEnCharge: true,
                    dossier: { select: { statutDossier: true } },
                  },
                },
              },
            },
          },
        });
        if (!current) throw new NotFoundException('Intervention introuvable.');
        if (
          current.statutIntervention !== 'EN_COURS' ||
          current.dateSoumissionCompteRendu ||
          current.dateHeureFin
        ) {
          throw new ConflictException('Cette intervention n’est plus ouverte à la soumission.');
        }
        if (current.renseignePar !== actorId) {
          throw new ForbiddenException('Seul l’agent ayant démarré cette intervention peut soumettre son compte rendu.');
        }
        if (
          current.affectation.dateFinAffectation ||
          current.affectation.etatAffectation !== 'ACTIVE' ||
          current.affectation.decisionEquipe !== 'ACCEPTEE' ||
          current.affectation.contenuDossier.etatContenuDossier !== 'ACTIF' ||
          current.affectation.contenuDossier.etatPriseEnCharge !== 'EN_COURS' ||
          current.affectation.contenuDossier.dossier.statutDossier === 'CLOTURE'
        ) {
          throw new ConflictException('La mission ou le contenu n’est plus actif.');
        }

        await this.requireCurrentTeamMembership(tx, actorId, current.affectation.idEquipe);
        const now = new Date();
        const update = await tx.intervention.updateMany({
          where: {
            idIntervention,
            statutIntervention: 'EN_COURS',
            dateSoumissionCompteRendu: null,
            dateHeureFin: null,
          },
          data: {
            dateHeureFin: now,
            dateSoumissionCompteRendu: now,
            statutIntervention: 'SOUMISE',
            resultatIntervention: result,
            compteRendu,
            motifException: exceptionReason || null,
          },
        });
        if (update.count !== 1) {
          throw new ConflictException('Le compte rendu a été soumis simultanément.');
        }
        await this.writeEvent(tx, {
          type: 'INTERVENTION_COMPTE_RENDU_SOUMIS',
          actorId,
          interventionId: idIntervention,
          before: { statutIntervention: 'EN_COURS' },
          after: {
            statutIntervention: 'SOUMISE',
            resultatIntervention: result,
            dateSoumissionCompteRendu: now.toISOString(),
          },
          ...(exceptionReason ? { reason: exceptionReason } : {}),
        });
        return tx.intervention.findUniqueOrThrow({
          where: { idIntervention },
          select: interventionDetailSelect,
        });
      },
      'Le compte rendu a été soumis ou l’intervention modifiée simultanément.',
    );
  }

  async addPhoto(
    idIntervention: string,
    dto: UploadInterventionPhotoDto,
    file: unknown,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const image = validateImageFile(file);
    const context = dto.contextePhoto.trim();
    const description = dto.description?.trim() || null;
    if (context.length < 3 || context.length > 100) {
      throw new BadRequestException('Le contexte de la photo doit contenir entre 3 et 100 caractères.');
    }
    if (description && description.length > 500) {
      throw new BadRequestException('La description de la photo ne peut dépasser 500 caractères.');
    }

    const current = await this.prisma.intervention.findUnique({
      where: { idIntervention },
      select: {
        idIntervention: true,
        statutIntervention: true,
        dateHeureFin: true,
        dateSoumissionCompteRendu: true,
        renseignePar: true,
        affectation: {
          select: {
            idEquipe: true,
            dateFinAffectation: true,
            etatAffectation: true,
            decisionEquipe: true,
            equipe: { select: { etatEquipe: true } },
            contenuDossier: {
              select: {
                etatContenuDossier: true,
                etatPriseEnCharge: true,
                dossier: { select: { statutDossier: true } },
              },
            },
          },
        },
      },
    });
    if (!current) throw new NotFoundException('Intervention introuvable.');
    if (current.renseignePar !== actorId) {
      throw new ForbiddenException('Seul l’agent ayant démarré cette intervention peut joindre une photo.');
    }
    if (
      current.statutIntervention !== 'EN_COURS' ||
      current.dateHeureFin ||
      current.dateSoumissionCompteRendu
    ) {
      throw new ConflictException('Les photos ne peuvent être ajoutées qu’avant la soumission du compte rendu.');
    }
    if (
      current.affectation.dateFinAffectation ||
      current.affectation.etatAffectation !== 'ACTIVE' ||
      current.affectation.decisionEquipe !== 'ACCEPTEE' ||
      current.affectation.equipe.etatEquipe !== 'ACTIVE' ||
      current.affectation.contenuDossier.etatContenuDossier !== 'ACTIF' ||
      current.affectation.contenuDossier.etatPriseEnCharge !== 'EN_COURS' ||
      current.affectation.contenuDossier.dossier.statutDossier === 'CLOTURE'
    ) {
      throw new ConflictException('La mission ou le contenu n’est plus actif.');
    }
    const membership = await this.prisma.appartenanceEquipe.findFirst({
      where: {
        idUtilisateur: actorId,
        idEquipe: current.affectation.idEquipe,
        dateDebut: { lte: new Date() },
        OR: [{ dateFin: null }, { dateFin: { gte: new Date() } }],
      },
      select: { idUtilisateur: true },
    });
    if (!membership) {
      throw new ForbiddenException('Une appartenance active à l’équipe est requise pour joindre une photo.');
    }

    const now = new Date();
    const photoId = randomUUID();
    const storagePath = `${authUserId}/interventions/${idIntervention}/${photoId}.${image.extension}`;
    const dateExpiration = this.storage.getExpirationDate(now);
    await this.storage.upload(storagePath, image);

    try {
      const photo = await this.prisma.$transaction(
        async (tx) => {
          const latest = await tx.intervention.findUnique({
            where: { idIntervention },
            select: {
              idIntervention: true,
              statutIntervention: true,
              dateHeureFin: true,
              dateSoumissionCompteRendu: true,
              renseignePar: true,
              affectation: {
                select: {
                  idEquipe: true,
                  dateFinAffectation: true,
                  etatAffectation: true,
                  decisionEquipe: true,
                  equipe: { select: { etatEquipe: true } },
                  contenuDossier: {
                    select: {
                      etatContenuDossier: true,
                      etatPriseEnCharge: true,
                      dossier: { select: { statutDossier: true } },
                    },
                  },
                },
              },
            },
          });
          if (!latest) throw new NotFoundException('Intervention introuvable.');
          if (latest.renseignePar !== actorId) {
            throw new ForbiddenException('Seul l’agent ayant démarré cette intervention peut joindre une photo.');
          }
          if (
            latest.statutIntervention !== 'EN_COURS' ||
            latest.dateHeureFin ||
            latest.dateSoumissionCompteRendu ||
            latest.affectation.dateFinAffectation ||
            latest.affectation.etatAffectation !== 'ACTIVE' ||
            latest.affectation.decisionEquipe !== 'ACCEPTEE' ||
            latest.affectation.equipe.etatEquipe !== 'ACTIVE' ||
            latest.affectation.contenuDossier.etatContenuDossier !== 'ACTIF' ||
            latest.affectation.contenuDossier.etatPriseEnCharge !== 'EN_COURS' ||
            latest.affectation.contenuDossier.dossier.statutDossier === 'CLOTURE'
          ) {
            throw new ConflictException('La mission ou le contenu n’est plus actif.');
          }
          await this.requireCurrentTeamMembership(tx, actorId, latest.affectation.idEquipe);

          const created = await tx.photoIntervention.create({
            data: {
              idPhotoIntervention: photoId,
              idIntervention,
              referencePhoto: storagePath,
              contextePhoto: context,
              description,
              dateAjout: now,
              dateExpiration,
              mediaPurgeAt: null,
              mediaStockeeLocale: false,
              etatPublication: 'EN_ATTENTE',
              referencePhotoPublique: null,
              floutageConfirme: false,
              varianteSoumisePar: null,
              dateSoumissionVariante: null,
              approuvePar: null,
              dateApprobation: null,
            },
            select: {
              idPhotoIntervention: true,
              description: true,
              dateAjout: true,
              etatPublication: true,
            },
          });

          await this.writeEvent(tx, {
            type: 'PHOTO_INTERVENTION_AJOUTEE',
            actorId,
            interventionId,
            after: {
              idPhotoIntervention: photoId,
              contextePhoto: context,
              contentType: image.contentType,
              dateAjout: now.toISOString(),
            },
          });

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return {
        idPhoto: photo.idPhotoIntervention,
        description: photo.description,
        dateAjout: photo.dateAjout,
        etatPublication: photo.etatPublication,
      };
    } catch (error) {
      await this.storage.remove(storagePath).catch(() => undefined);
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException('L’intervention a été modifiée simultanément. Réessayez.');
      }
      throw error;
    }
  }

  private async requireCurrentTeamMembership(
    tx: Transaction,
    actorId: string,
    idEquipe: string,
  ): Promise<void> {
    const now = new Date();
    const membership = await tx.appartenanceEquipe.findFirst({
      where: {
        idUtilisateur: actorId,
        idEquipe,
        dateDebut: { lte: now },
        OR: [{ dateFin: null }, { dateFin: { gte: now } }],
      },
      select: { idUtilisateur: true },
    });
    if (!membership) {
      throw new ForbiddenException('Une appartenance active à l’équipe est requise pour cette intervention.');
    }
  }

  private async writeEvent(
    tx: Transaction,
    payload: {
      type: string;
      actorId: string;
      interventionId: string;
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
        idInterventionCible: payload.interventionId,
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
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException(conflictMessage);
      }
      throw error;
    }
  }
}
