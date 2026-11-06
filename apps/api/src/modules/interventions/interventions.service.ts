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
import { recordBusinessEvent } from '../../infrastructure/audit/business-audit.js';
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
  photos: {
    orderBy: { dateAjout: 'asc' as const },
    select: { idPhotoIntervention: true, description: true, dateAjout: true },
  },
  verification: {
    select: { dateVerification: true, resultatVerification: true, motif: true },
  },
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
          typeDechet: { select: { codeType: true, libelle: true } },
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

  private shapeIntervention(row: Prisma.InterventionGetPayload<{ select: typeof interventionDetailSelect }>) {
    return {
      ...row,
      photos: row.photos.map((photo) => ({ ...photo, etatPublication: 'PRIVEE' })),
      verification: row.verification
        ? {
            ...row.verification,
            etatVerification: row.verification.resultatVerification === 'A_REPRENDRE' ? 'REPRISE' : 'VALIDEE',
          }
        : null,
    };
  }

  async listMyTeams(authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const now = new Date();
    const memberships = await this.prisma.appartenanceEquipe.findMany({
      where: {
        idUtilisateur: actorId,
        dateDebut: { lte: now },
        OR: [{ dateFin: null }, { dateFin: { gte: now } }],
        equipe: { etatEquipe: 'ACTIVE' },
      },
      orderBy: [{ dateDebut: 'desc' }],
      select: {
        dateDebut: true,
        fonction: true,
        equipe: { select: { idEquipe: true, nomEquipe: true, etatEquipe: true } },
      },
    });
    const currentTeams = new Map<string, {
      idEquipe: string;
      nomEquipe: string;
      etatEquipe: string;
      dateDebut: Date;
      fonction: string;
    }>();
    for (const membership of memberships) {
      if (!currentTeams.has(membership.equipe.idEquipe)) {
        currentTeams.set(membership.equipe.idEquipe, {
          ...membership.equipe,
          dateDebut: membership.dateDebut,
          fonction: membership.fonction,
        });
      }
    }
    return [...currentTeams.values()].sort((left, right) => left.nomEquipe.localeCompare(right.nomEquipe, 'fr'));
  }

  async listTeamInterventions(idEquipe: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const now = new Date();
    const [team, membership] = await Promise.all([
      this.prisma.equipe.findUnique({ where: { idEquipe }, select: { idEquipe: true } }),
      this.prisma.appartenanceEquipe.findFirst({
        where: {
          idEquipe,
          idUtilisateur: actorId,
          dateDebut: { lte: now },
          OR: [{ dateFin: null }, { dateFin: { gte: now } }],
        },
        select: { idEquipe: true },
      }),
    ]);
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (!membership) throw new ForbiddenException('Une appartenance active à cette équipe est requise.');
    const rows = await this.prisma.intervention.findMany({
      where: { affectation: { idEquipe } },
      orderBy: [{ dateHeureDebut: 'desc' }, { idIntervention: 'desc' }],
      select: interventionDetailSelect,
    });
    return rows.map((row) => this.shapeIntervention(row));
  }

  async startIntervention(idAffectation: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    return this.serializableWrite(async (tx) => {
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
              idContenuDossier: true,
              idDossier: true,
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
      if (assignment.equipe.etatEquipe !== 'ACTIVE') throw new ConflictException('L’équipe affectée n’est plus active.');
      if (
        assignment.contenuDossier.etatContenuDossier !== 'ACTIF' ||
        assignment.contenuDossier.etatPriseEnCharge !== 'EN_COURS' ||
        assignment.contenuDossier.dossier.statutDossier === 'CLOTURE'
      ) {
        throw new ConflictException('Le contenu ou le dossier n’est plus éligible à une intervention.');
      }
      await this.requireCurrentTeamMembership(tx, actorId, assignment.idEquipe);

      const latest = await tx.intervention.findFirst({
        where: { idAffectation },
        orderBy: [{ dateHeureDebut: 'desc' }, { idIntervention: 'desc' }],
        select: {
          idIntervention: true,
          statutIntervention: true,
          dateSoumissionCompteRendu: true,
          verification: { select: { resultatVerification: true, dateVerification: true } },
        },
      });
      if (latest) {
        if (latest.statutIntervention !== 'SOUMISE' || !latest.dateSoumissionCompteRendu) {
          throw new ConflictException('La précédente intervention doit être soumise avant tout nouveau démarrage.');
        }
        if (
          latest.verification?.resultatVerification !== 'A_REPRENDRE' ||
          latest.verification.dateVerification < latest.dateSoumissionCompteRendu
        ) {
          throw new ConflictException('Une nouvelle intervention exige une décision de reprise du vérificateur.');
        }
      }

      const now = new Date();
      const created = await tx.intervention.create({
        data: {
          idAffectation,
          dateHeureDebut: now,
          statutIntervention: 'EN_COURS',
          renseignePar: actorId,
        },
        select: { idIntervention: true },
      });
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'INTERVENTION_DEMARREE',
        entityType: 'INTERVENTION',
        entityId: created.idIntervention,
        dossierId: assignment.contenuDossier.idDossier,
        metadata: { assignmentId: idAffectation },
      });
      const row = await tx.intervention.findUniqueOrThrow({
        where: { idIntervention: created.idIntervention },
        select: interventionDetailSelect,
      });
      return this.shapeIntervention(row);
    }, 'Une intervention concurrente est déjà ouverte ou l’affectation a changé.');
  }

  async submitIntervention(idIntervention: string, dto: SubmitInterventionDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const result = dto.resultatIntervention;
    const exceptionReason = dto.motifException?.trim();
    if (result !== 'TERMINEE' && (!exceptionReason || exceptionReason.length < 5)) {
      throw new BadRequestException('Un motif d’exception d’au moins 5 caractères est obligatoire pour un résultat partiel ou impossible.');
    }
    const compteRendu = dto.compteRendu.trim();
    if (compteRendu.length < 20) throw new BadRequestException('Le compte rendu doit contenir au moins 20 caractères.');

    return this.serializableWrite(async (tx) => {
      const current = await tx.intervention.findUnique({
        where: { idIntervention },
        select: {
          idIntervention: true,
          idAffectation: true,
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
      if (!current) throw new NotFoundException('Intervention introuvable.');
      if (current.statutIntervention !== 'EN_COURS' || current.dateSoumissionCompteRendu || current.dateHeureFin) {
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
      const updated = await tx.intervention.updateMany({
        where: { idIntervention, statutIntervention: 'EN_COURS', dateSoumissionCompteRendu: null, dateHeureFin: null },
        data: {
          dateHeureFin: now,
          dateSoumissionCompteRendu: now,
          statutIntervention: 'SOUMISE',
          resultatIntervention: result,
          compteRendu,
          motifException: exceptionReason || null,
        },
      });
      if (updated.count !== 1) throw new ConflictException('Le compte rendu a été soumis simultanément.');
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'INTERVENTION_SOUMISE',
        entityType: 'INTERVENTION',
        entityId: idIntervention,
        dossierId: current.affectation.contenuDossier.idDossier,
        metadata: { result },
      });
      const row = await tx.intervention.findUniqueOrThrow({
        where: { idIntervention },
        select: interventionDetailSelect,
      });
      return this.shapeIntervention(row);
    }, 'Le compte rendu a été soumis ou l’intervention modifiée simultanément.');
  }

  async addPhoto(
    idIntervention: string,
    dto: UploadInterventionPhotoDto,
    incomingFile: unknown,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const file = validateImageFile(incomingFile);
    const context = dto.contextePhoto.trim();
    const description = dto.description?.trim() || null;
    if (context.length < 3 || context.length > 100) {
      throw new BadRequestException('Le contexte de la photo doit contenir entre 3 et 100 caractères.');
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
    if (current.statutIntervention !== 'EN_COURS' || current.dateHeureFin || current.dateSoumissionCompteRendu) {
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
    await this.requireCurrentTeamMembership(this.prisma, actorId, current.affectation.idEquipe);

    const now = new Date();
    const photoId = randomUUID();
    const storagePath = `interventions/${idIntervention}/${photoId}.${file.extension}`;
    const dateExpiration = this.storage.getExpirationDate(now);
    await this.storage.upload(storagePath, file);

    try {
      const photo = await this.prisma.photoIntervention.create({
        data: {
          idPhotoIntervention: photoId,
          idIntervention,
          referencePhoto: storagePath,
          contextePhoto: context,
          description,
          dateAjout: now,
          dateExpiration,
        },
        select: {
          idPhotoIntervention: true,
          description: true,
          dateAjout: true,
        },
      });
      return { ...photo, etatPublication: 'PRIVEE' };
    } catch (error) {
      await this.storage.remove(storagePath).catch(() => undefined);
      throw error;
    }
  }

  private async requireCurrentTeamMembership(
    db: Pick<PrismaService, 'appartenanceEquipe'> | Transaction,
    actorId: string,
    idEquipe: string,
  ): Promise<void> {
    const now = new Date();
    const membership = await db.appartenanceEquipe.findFirst({
      where: {
        idUtilisateur: actorId,
        idEquipe,
        dateDebut: { lte: now },
        OR: [{ dateFin: null }, { dateFin: { gte: now } }],
      },
      select: { idEquipe: true },
    });
    if (!membership) {
      throw new ForbiddenException('Une appartenance active à l’équipe est requise.');
    }
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
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) throw error;
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException(conflictMessage);
      }
      throw error;
    }
  }
}
