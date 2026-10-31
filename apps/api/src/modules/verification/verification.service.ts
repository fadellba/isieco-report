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
import type { DecideVerificationDto } from './dto/decide-verification.dto.js';
import type { ListVerificationsQueryDto } from './dto/list-verifications-query.dto.js';

type Transaction = Prisma.TransactionClient;

const reviewSelect = {
  idAffectation: true,
  idEquipe: true,
  etatAffectation: true,
  decisionEquipe: true,
  dateFinAffectation: true,
  contenuDossier: {
    select: {
      idDossier: true,
      idTypeDechet: true,
      etatContenuDossier: true,
      etatPriseEnCharge: true,
      dossier: {
        select: {
          referenceDossier: true,
          statutDossier: true,
        },
      },
    },
  },
  interventions: {
    orderBy: [{ dateHeureDebut: 'desc' }, { idIntervention: 'desc' }],
    take: 1,
    select: {
      idIntervention: true,
      dateHeureDebut: true,
      dateSoumissionCompteRendu: true,
      statutIntervention: true,
      resultatIntervention: true,
      compteRendu: true,
      motifException: true,
      renseignePar: true,
      photos: {
        orderBy: [{ dateAjout: 'asc' }, { idPhotoIntervention: 'asc' }],
        select: {
          idPhotoIntervention: true,
          description: true,
          dateAjout: true,
          etatPublication: true,
        },
      },
    },
  },
  verifications: {
    orderBy: [{ dateVerification: 'desc' }, { idVerification: 'desc' }],
    take: 1,
    select: {
      idVerification: true,
      dateVerification: true,
      resultatVerification: true,
      etatVerification: true,
    },
  },
} satisfies Prisma.AffectationSelect;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

@Injectable()
export class VerificationService {
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

  async listPending(query: ListVerificationsQueryDto, authUserId: string) {
    await this.actorId(authUserId);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const candidates = await this.prisma.affectation.findMany({
      where: {
        dateFinAffectation: null,
        etatAffectation: 'ACTIVE',
        decisionEquipe: 'ACCEPTEE',
        interventions: {
          some: {
            statutIntervention: 'SOUMISE',
            dateSoumissionCompteRendu: { not: null },
          },
        },
      },
      orderBy: [{ dateHeureAffectation: 'desc' }, { idAffectation: 'desc' }],
      select: reviewSelect,
    });

    const pending = candidates
      .map((assignment) => this.toPendingItem(assignment))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) =>
        (right.intervention.dateSoumissionCompteRendu?.getTime() ?? 0) -
        (left.intervention.dateSoumissionCompteRendu?.getTime() ?? 0),
      );

    const total = pending.length;
    return {
      items: pending.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
    };
  }

  async getPending(idAffectation: string, authUserId: string) {
    await this.actorId(authUserId);
    const assignment = await this.prisma.affectation.findUnique({
      where: { idAffectation },
      select: reviewSelect,
    });
    if (!assignment) throw new NotFoundException('Affectation introuvable.');

    const item = this.toPendingItem(assignment);
    if (!item) {
      throw new ConflictException('Cette affectation ne possède pas de compte rendu soumis en attente de vérification.');
    }
    return item;
  }

  async createInterventionPhotoUrl(
    idAffectation: string,
    idPhotoIntervention: string,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const assignment = await this.prisma.affectation.findUnique({
      where: { idAffectation },
      select: reviewSelect,
    });
    if (!assignment) throw new NotFoundException('Affectation introuvable.');

    const pending = this.toPendingItem(assignment);
    if (!pending) {
      throw new ConflictException('Ce compte rendu n’est plus en attente de vérification.');
    }
    if (pending.intervention.renseignePar === actorId) {
      throw new ForbiddenException('Le vérificateur ne peut pas consulter les preuves de sa propre intervention.');
    }

    const photo = await this.prisma.photoIntervention.findFirst({
      where: {
        idPhotoIntervention,
        idIntervention: pending.intervention.idIntervention,
      },
      select: { referencePhoto: true, dateExpiration: true, mediaPurgeAt: true },
    });
    const now = new Date();
    if (
      !photo ||
      photo.dateExpiration.getTime() <= now.getTime() ||
      (photo.mediaPurgeAt !== null && photo.mediaPurgeAt.getTime() <= now.getTime())
    ) {
      throw new NotFoundException('Photo introuvable ou expirée.');
    }

    return this.storage.createSignedUrl(photo.referencePhoto);
  }

  async decide(
    idAffectation: string,
    dto: DecideVerificationDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const result = dto.resultatVerification;
    const motif = dto.motif?.trim();
    const referencePreuve = dto.referencePreuve?.trim();
    if (result === 'A_REPRENDRE' && (!motif || motif.length < 5)) {
      throw new BadRequestException('Un motif d’au moins 5 caractères est obligatoire pour demander une reprise.');
    }
    if (result === 'CONFORME' && motif && motif.length > 2000) {
      throw new BadRequestException('Le motif ne peut dépasser 2000 caractères.');
    }

    return this.serializableWrite(
      async (tx) => {
        const assignment = await tx.affectation.findUnique({
          where: { idAffectation },
          select: reviewSelect,
        });
        if (!assignment) throw new NotFoundException('Affectation introuvable.');

        const pending = this.toPendingItem(assignment);
        if (!pending) {
          throw new ConflictException('Le dernier compte rendu a déjà été vérifié ou ne peut plus être vérifié.');
        }
        const intervention = pending.intervention;
        if (intervention.renseignePar === actorId) {
          throw new ForbiddenException('Le vérificateur ne peut pas valider sa propre intervention.');
        }
        if (
          assignment.contenuDossier.dossier.statutDossier === 'CLOTURE' ||
          assignment.contenuDossier.etatContenuDossier !== 'ACTIF' ||
          assignment.contenuDossier.etatPriseEnCharge !== 'EN_COURS'
        ) {
          throw new ConflictException('Le dossier ou le contenu n’est plus éligible à la vérification.');
        }

        if (result === 'CONFORME' && intervention.resultatIntervention !== 'TERMINEE') {
          throw new ConflictException('Seul un résultat terrain TERMINEE peut être validé conforme. Un résultat partiel ou impossible doit faire l’objet d’une reprise.');
        }

        const now = new Date();
        const verification = await tx.verificationResolution.create({
          data: {
            idAffectation,
            idVerificateur: actorId,
            dateVerification: now,
            resultatVerification: result,
            etatVerification: result === 'CONFORME' ? 'VALIDEE' : 'REPRISE',
            motif: motif || null,
            referencePreuve: referencePreuve || null,
          },
        });

        let dossierCloture = false;
        if (result === 'CONFORME') {
          const assignmentUpdate = await tx.affectation.updateMany({
            where: {
              idAffectation,
              dateFinAffectation: null,
              etatAffectation: 'ACTIVE',
              decisionEquipe: 'ACCEPTEE',
            },
            data: {
              etatAffectation: 'TERMINEE',
              dateFinAffectation: now,
            },
          });
          if (assignmentUpdate.count !== 1) {
            throw new ConflictException('L’affectation a été modifiée simultanément.');
          }

          const contentUpdate = await tx.contenuDossier.updateMany({
            where: {
              idDossier: assignment.contenuDossier.idDossier,
              idTypeDechet: assignment.contenuDossier.idTypeDechet,
              etatContenuDossier: 'ACTIF',
              etatPriseEnCharge: 'EN_COURS',
            },
            data: { etatPriseEnCharge: 'TERMINE' },
          });
          if (contentUpdate.count !== 1) {
            throw new ConflictException('Le contenu n’est plus en cours de prise en charge.');
          }

          await this.writeVerificationEvent(tx, {
            type: 'RESOLUTION_VALIDEE',
            actorId,
            verificationId: verification.idVerification,
            before: {
              interventionId: intervention.idIntervention,
              resultatIntervention: intervention.resultatIntervention,
              etatPriseEnCharge: 'EN_COURS',
            },
            after: {
              resultatVerification: 'CONFORME',
              etatVerification: 'VALIDEE',
              dateVerification: now.toISOString(),
              etatPriseEnCharge: 'TERMINE',
            },
            ...(motif ? { reason: motif } : {}),
          });

          const remaining = await tx.contenuDossier.count({
            where: {
              idDossier: assignment.contenuDossier.idDossier,
              etatContenuDossier: 'ACTIF',
              etatPriseEnCharge: { not: 'TERMINE' },
            },
          });

          if (remaining === 0) {
            const closed = await tx.dossierTraitement.updateMany({
              where: {
                idDossier: assignment.contenuDossier.idDossier,
                statutDossier: { not: 'CLOTURE' },
                dateCloture: null,
              },
              data: { statutDossier: 'CLOTURE', dateCloture: now },
            });
            if (closed.count !== 1) {
              throw new ConflictException('Le dossier a été clôturé ou modifié simultanément.');
            }
            dossierCloture = true;
            await this.writeCaseClosureEvent(tx, {
              actorId,
              dossierId: assignment.contenuDossier.idDossier,
              verificationId: verification.idVerification,
              interventionId: intervention.idIntervention,
              previousStatus: assignment.contenuDossier.dossier.statutDossier,
              dateCloture: now,
            });
          }
        } else {
          await this.writeVerificationEvent(tx, {
            type: 'REPRISE_DEMANDEE',
            actorId,
            verificationId: verification.idVerification,
            before: {
              interventionId: intervention.idIntervention,
              resultatIntervention: intervention.resultatIntervention,
            },
            after: {
              resultatVerification: 'A_REPRENDRE',
              etatVerification: 'REPRISE',
              dateVerification: now.toISOString(),
            },
            reason: motif!,
          });
        }

        return {
          verification,
          dossierCloture,
        };
      },
      'Une vérification a été enregistrée ou l’affectation a changé simultanément.',
    );
  }

  private toPendingItem(assignment: Prisma.AffectationGetPayload<{ select: typeof reviewSelect }>) {
    if (
      assignment.dateFinAffectation ||
      assignment.etatAffectation !== 'ACTIVE' ||
      assignment.decisionEquipe !== 'ACCEPTEE'
    ) return null;

    const intervention = assignment.interventions[0];
    if (
      !intervention ||
      intervention.statutIntervention !== 'SOUMISE' ||
      !intervention.dateSoumissionCompteRendu ||
      !intervention.dateHeureDebut ||
      !intervention.resultatIntervention ||
      !intervention.compteRendu
    ) return null;

    const latestVerification = assignment.verifications[0] ?? null;
    if (latestVerification && latestVerification.dateVerification.getTime() >= intervention.dateSoumissionCompteRendu.getTime()) {
      return null;
    }

    return {
      affectation: {
        idAffectation: assignment.idAffectation,
        idEquipe: assignment.idEquipe,
        etatAffectation: assignment.etatAffectation,
        decisionEquipe: assignment.decisionEquipe,
        contenuDossier: {
          idDossier: assignment.contenuDossier.idDossier,
          idTypeDechet: assignment.contenuDossier.idTypeDechet,
          etatContenuDossier: assignment.contenuDossier.etatContenuDossier,
          etatPriseEnCharge: assignment.contenuDossier.etatPriseEnCharge,
          referenceDossier: assignment.contenuDossier.dossier.referenceDossier,
          statutDossier: assignment.contenuDossier.dossier.statutDossier,
        },
      },
      intervention: {
        ...intervention,
        photos: (intervention.photos ?? []).map((photo) => ({
          idPhotoIntervention: photo.idPhotoIntervention,
          description: photo.description,
          dateAjout: photo.dateAjout,
          etatPublication: photo.etatPublication,
        })),
      },
      derniereVerification: latestVerification?.dateVerification ?? null,
    };
  }

  private async writeVerificationEvent(
    tx: Transaction,
    payload: {
      type: string;
      actorId: string;
      verificationId: string;
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
        idVerificationCible: payload.verificationId,
        ...(payload.before ? { donneesAvant: payload.before as Prisma.InputJsonObject } : {}),
        ...(payload.after ? { donneesApres: payload.after as Prisma.InputJsonObject } : {}),
        ...(payload.reason ? { motif: payload.reason } : {}),
        versionSchema: 1,
      },
    });
  }

  private async writeCaseClosureEvent(
    tx: Transaction,
    payload: {
      actorId: string;
      dossierId: string;
      verificationId: string;
      interventionId: string;
      previousStatus: string;
      dateCloture: Date;
    },
  ): Promise<void> {
    const now = payload.dateCloture;
    await tx.evenementMetier.create({
      data: {
        typeEvenement: 'DOSSIER_CLOTURE_VERIFIEE',
        dateEvenement: now,
        dateEnregistrement: now,
        origine: 'API',
        idActeur: payload.actorId,
        idDossierCible: payload.dossierId,
        donneesAvant: {
          statutDossier: payload.previousStatus,
          verificationId: payload.verificationId,
          interventionId: payload.interventionId,
        },
        donneesApres: {
          statutDossier: 'CLOTURE',
          dateCloture: now.toISOString(),
        },
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
