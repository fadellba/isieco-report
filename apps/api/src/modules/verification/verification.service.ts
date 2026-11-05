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

const pendingInterventionSelect = {
  idIntervention: true,
  idAffectation: true,
  dateHeureDebut: true,
  dateSoumissionCompteRendu: true,
  statutIntervention: true,
  resultatIntervention: true,
  compteRendu: true,
  motifException: true,
  renseignePar: true,
  photos: {
    orderBy: [{ dateAjout: 'asc' as const }, { idPhotoIntervention: 'asc' as const }],
    select: { idPhotoIntervention: true, description: true, dateAjout: true },
  },
  affectation: {
    select: {
      idAffectation: true,
      idEquipe: true,
      etatAffectation: true,
      decisionEquipe: true,
      dateFinAffectation: true,
      contenuDossier: {
        select: {
          idContenuDossier: true,
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

type PendingIntervention = Prisma.InterventionGetPayload<{ select: typeof pendingInterventionSelect }>;

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

  private toPendingItem(intervention: PendingIntervention) {
    if (
      intervention.statutIntervention !== 'SOUMISE' ||
      !intervention.dateSoumissionCompteRendu ||
      !intervention.dateHeureDebut ||
      !intervention.resultatIntervention ||
      !intervention.compteRendu ||
      intervention.affectation.dateFinAffectation ||
      intervention.affectation.etatAffectation !== 'ACTIVE' ||
      intervention.affectation.decisionEquipe !== 'ACCEPTEE'
    ) return null;

    return {
      affectation: {
        idAffectation: intervention.affectation.idAffectation,
        idEquipe: intervention.affectation.idEquipe,
        etatAffectation: intervention.affectation.etatAffectation,
        decisionEquipe: intervention.affectation.decisionEquipe,
        contenuDossier: {
          idDossier: intervention.affectation.contenuDossier.idDossier,
          idTypeDechet: intervention.affectation.contenuDossier.idTypeDechet,
          etatContenuDossier: intervention.affectation.contenuDossier.etatContenuDossier,
          etatPriseEnCharge: intervention.affectation.contenuDossier.etatPriseEnCharge,
          referenceDossier: intervention.affectation.contenuDossier.dossier.referenceDossier,
          statutDossier: intervention.affectation.contenuDossier.dossier.statutDossier,
        },
      },
      intervention: {
        ...intervention,
        photos: intervention.photos.map((photo) => ({ ...photo, etatPublication: 'PRIVEE' })),
      },
    };
  }

  async listPending(query: ListVerificationsQueryDto, authUserId: string) {
    await this.actorId(authUserId);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.intervention.count({
        where: {
          statutIntervention: 'SOUMISE',
          dateSoumissionCompteRendu: { not: null },
          verification: null,
          affectation: {
            dateFinAffectation: null,
            etatAffectation: 'ACTIVE',
            decisionEquipe: 'ACCEPTEE',
          },
        },
      }),
      this.prisma.intervention.findMany({
        where: {
          statutIntervention: 'SOUMISE',
          dateSoumissionCompteRendu: { not: null },
          verification: null,
          affectation: {
            dateFinAffectation: null,
            etatAffectation: 'ACTIVE',
            decisionEquipe: 'ACCEPTEE',
          },
        },
        orderBy: [{ dateSoumissionCompteRendu: 'asc' }, { idIntervention: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: pendingInterventionSelect,
      }),
    ]);
    return {
      items: rows.map((row) => this.toPendingItem(row)).filter((item) => item !== null),
      page,
      pageSize,
      total,
    };
  }

  async getPending(idAffectation: string, authUserId: string) {
    await this.actorId(authUserId);
    const intervention = await this.prisma.intervention.findFirst({
      where: {
        idAffectation,
        statutIntervention: 'SOUMISE',
        dateSoumissionCompteRendu: { not: null },
        verification: null,
      },
      orderBy: [{ dateSoumissionCompteRendu: 'desc' }, { idIntervention: 'desc' }],
      select: pendingInterventionSelect,
    });
    if (!intervention) {
      throw new ConflictException('Cette affectation ne possède pas de compte rendu soumis en attente de vérification.');
    }
    const item = this.toPendingItem(intervention);
    if (!item) throw new ConflictException('Ce compte rendu n’est plus éligible à la vérification.');
    return item;
  }

  async createInterventionPhotoUrl(idAffectation: string, idPhotoIntervention: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const pending = await this.prisma.intervention.findFirst({
      where: {
        idAffectation,
        statutIntervention: 'SOUMISE',
        dateSoumissionCompteRendu: { not: null },
        verification: null,
      },
      orderBy: [{ dateSoumissionCompteRendu: 'desc' }, { idIntervention: 'desc' }],
      select: pendingInterventionSelect,
    });
    if (!pending) throw new ConflictException('Ce compte rendu n’est plus en attente de vérification.');
    if (pending.renseignePar === actorId) {
      throw new ForbiddenException('Le vérificateur ne peut pas consulter les preuves de sa propre intervention.');
    }

    const photo = await this.prisma.photoIntervention.findFirst({
      where: { idPhotoIntervention, idIntervention: pending.idIntervention },
      select: { referencePhoto: true, dateExpiration: true, mediaPurgeAt: true },
    });
    const now = new Date();
    if (!photo || photo.dateExpiration <= now || (photo.mediaPurgeAt && photo.mediaPurgeAt <= now)) {
      throw new NotFoundException('Photo introuvable ou expirée.');
    }
    return this.storage.createSignedUrl(photo.referencePhoto);
  }

  async decide(idAffectation: string, dto: DecideVerificationDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const result = dto.resultatVerification;
    const motif = dto.motif?.trim() || null;
    if (result === 'A_REPRENDRE' && (!motif || motif.length < 5)) {
      throw new BadRequestException('Un motif d’au moins 5 caractères est obligatoire pour demander une reprise.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const intervention = await tx.intervention.findFirst({
          where: {
            idAffectation,
            statutIntervention: 'SOUMISE',
            dateSoumissionCompteRendu: { not: null },
            verification: null,
          },
          orderBy: [{ dateSoumissionCompteRendu: 'desc' }, { idIntervention: 'desc' }],
          select: {
            idIntervention: true,
            idAffectation: true,
            renseignePar: true,
            resultatIntervention: true,
            affectation: {
              select: {
                idAffectation: true,
                dateFinAffectation: true,
                etatAffectation: true,
                decisionEquipe: true,
                contenuDossier: {
                  select: {
                    idContenuDossier: true,
                    idDossier: true,
                    etatContenuDossier: true,
                    etatPriseEnCharge: true,
                    dossier: { select: { statutDossier: true } },
                  },
                },
              },
            },
          },
        });
        if (!intervention) {
          throw new ConflictException('Le compte rendu a déjà été vérifié ou ne peut plus être vérifié.');
        }
        if (intervention.renseignePar === actorId) {
          throw new ForbiddenException('Le vérificateur ne peut pas valider sa propre intervention.');
        }
        if (
          intervention.affectation.dateFinAffectation ||
          intervention.affectation.etatAffectation !== 'ACTIVE' ||
          intervention.affectation.decisionEquipe !== 'ACCEPTEE' ||
          intervention.affectation.contenuDossier.dossier.statutDossier === 'CLOTURE' ||
          intervention.affectation.contenuDossier.etatContenuDossier !== 'ACTIF' ||
          intervention.affectation.contenuDossier.etatPriseEnCharge !== 'EN_COURS'
        ) {
          throw new ConflictException('Le dossier ou le contenu n’est plus éligible à la vérification.');
        }
        if (result === 'CONFORME' && intervention.resultatIntervention !== 'TERMINEE') {
          throw new ConflictException('Seul un résultat terrain TERMINEE peut être validé conforme. Un résultat partiel ou impossible doit faire l’objet d’une reprise.');
        }

        const now = new Date();
        const verification = await tx.verification.create({
          data: {
            idIntervention: intervention.idIntervention,
            idVerificateur: actorId,
            dateVerification: now,
            resultatVerification: result,
            motif,
          },
        });

        let dossierCloture = false;
        if (result === 'CONFORME') {
          const closedAssignment = await tx.affectation.updateMany({
            where: {
              idAffectation,
              dateFinAffectation: null,
              etatAffectation: 'ACTIVE',
              decisionEquipe: 'ACCEPTEE',
            },
            data: { etatAffectation: 'TERMINEE', dateFinAffectation: now },
          });
          if (closedAssignment.count !== 1) {
            throw new ConflictException('L’affectation a été modifiée simultanément.');
          }

          const finishedContent = await tx.contenuDossier.updateMany({
            where: {
              idContenuDossier: intervention.affectation.contenuDossier.idContenuDossier,
              etatContenuDossier: 'ACTIF',
              etatPriseEnCharge: 'EN_COURS',
            },
            data: { etatPriseEnCharge: 'TERMINE' },
          });
          if (finishedContent.count !== 1) {
            throw new ConflictException('Le contenu n’est plus en cours de prise en charge.');
          }

          const remaining = await tx.contenuDossier.count({
            where: {
              idDossier: intervention.affectation.contenuDossier.idDossier,
              etatContenuDossier: 'ACTIF',
              etatPriseEnCharge: { not: 'TERMINE' },
            },
          });
          if (remaining === 0) {
            const closed = await tx.dossierTraitement.updateMany({
              where: {
                idDossier: intervention.affectation.contenuDossier.idDossier,
                statutDossier: { not: 'CLOTURE' },
                dateCloture: null,
              },
              data: { statutDossier: 'CLOTURE', dateCloture: now },
            });
            dossierCloture = closed.count === 1;
          }
        }

        return {
          verification: {
            ...verification,
            idAffectation,
            etatVerification: result === 'CONFORME' ? 'VALIDEE' : 'REPRISE',
          },
          dossierCloture,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) throw error;
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException('Une vérification a été enregistrée simultanément.');
      }
      throw error;
    }
  }
}
