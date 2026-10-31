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
import type { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import type { ListAssignmentsQueryDto } from './dto/list-assignments-query.dto.js';
import type { ReassignAssignmentDto } from './dto/reassign-assignment.dto.js';
import type { RespondAssignmentDto } from './dto/respond-assignment.dto.js';

type Transaction = Prisma.TransactionClient;

const assignmentDetailSelect = {
  idAffectation: true,
  idDossier: true,
  idTypeDechet: true,
  idEquipe: true,
  idCompetenceEquipe: true,
  dateHeureAffectation: true,
  idDecideur: true,
  etatAffectation: true,
  motif: true,
  observation: true,
  dateFinAffectation: true,
  decisionEquipe: true,
  reponduPar: true,
  dateReponseEquipe: true,
  motifRefusEquipe: true,
  equipe: {
    select: { idEquipe: true, nomEquipe: true, etatEquipe: true },
  },
  competence: {
    select: { idCompetenceEquipe: true, dateDebut: true, dateFin: true },
  },
  contenuDossier: {
    select: {
      idDossier: true,
      idTypeDechet: true,
      etatContenuDossier: true,
      etatPriseEnCharge: true,
      dossier: { select: { referenceDossier: true, statutDossier: true } },
      typeDechet: { select: { idTypeDechet: true, codeType: true, libelle: true } },
    },
  },
} satisfies Prisma.AffectationSelect;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async listAssignments(query: ListAssignmentsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.AffectationWhereInput = {
      ...(query.idDossier ? { idDossier: query.idDossier } : {}),
      ...(query.idEquipe ? { idEquipe: query.idEquipe } : {}),
      ...(query.etatAffectation ? { etatAffectation: query.etatAffectation } : {}),
      ...(query.decisionEquipe ? { decisionEquipe: query.decisionEquipe } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.affectation.count({ where }),
      this.prisma.affectation.findMany({
        where,
        orderBy: [{ dateHeureAffectation: 'desc' }, { idAffectation: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: assignmentDetailSelect,
      }),
    ]);
    return { items, page, pageSize, total };
  }

  async listPendingContents(query: ListAssignmentsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.ContenuDossierWhereInput = {
      etatContenuDossier: 'ACTIF',
      etatPriseEnCharge: 'EN_ATTENTE',
      dossier: { statutDossier: { not: 'CLOTURE' } },
      affectations: { none: { dateFinAffectation: null } },
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.contenuDossier.count({ where }),
      this.prisma.contenuDossier.findMany({
        where,
        orderBy: [
          { dossier: { dateCreationDossier: 'asc' } },
          { idDossier: 'asc' },
          { idTypeDechet: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          idDossier: true,
          idTypeDechet: true,
          etatContenuDossier: true,
          etatPriseEnCharge: true,
          dossier: {
            select: {
              idDossier: true,
              referenceDossier: true,
              statutDossier: true,
              priorite: true,
            },
          },
          typeDechet: {
            select: {
              idTypeDechet: true,
              codeType: true,
              libelle: true,
            },
          },
        },
      }),
    ]);
    return { items, page, pageSize, total };
  }

  async listEligibleTeams(idTypeDechet: string) {
    const now = new Date();
    const teams = await this.prisma.equipe.findMany({
      where: {
        etatEquipe: 'ACTIVE',
        competences: {
          some: {
            idTypeDechet,
            dateDebut: { lte: now },
            OR: [{ dateFin: null }, { dateFin: { gte: now } }],
          },
        },
      },
      orderBy: { nomEquipe: 'asc' },
      select: {
        idEquipe: true,
        nomEquipe: true,
        etatEquipe: true,
        competences: {
          where: {
            idTypeDechet,
            dateDebut: { lte: now },
            OR: [{ dateFin: null }, { dateFin: { gte: now } }],
          },
          orderBy: { dateDebut: 'desc' },
          take: 1,
          select: {
            idCompetenceEquipe: true,
            dateDebut: true,
            dateFin: true,
          },
        },
        disponibilite: {
          select: {
            etatDisponibilite: true,
            valideJusqua: true,
          },
        },
      },
    });

    return teams
      .filter((team) => !(
        team.disponibilite &&
        team.disponibilite.valideJusqua.getTime() >= now.getTime() &&
        team.disponibilite.etatDisponibilite === 'INDISPONIBLE'
      ))
      .filter((team) => team.competences.length > 0)
      .map((team) => ({
        idEquipe: team.idEquipe,
        nomEquipe: team.nomEquipe,
        etatEquipe: team.etatEquipe,
        competence: team.competences[0]!,
        disponibilite: team.disponibilite,
      }));
  }

  async listTeamAssignments(idEquipe: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const now = new Date();
    const [team, membership] = await Promise.all([
      this.prisma.equipe.findUnique({
        where: { idEquipe },
        select: { idEquipe: true, nomEquipe: true, etatEquipe: true },
      }),
      this.prisma.appartenanceEquipe.findFirst({
        where: {
          idEquipe,
          idUtilisateur: actorId,
          dateDebut: { lte: now },
          OR: [{ dateFin: null }, { dateFin: { gte: now } }],
        },
        select: { idEquipe: true, idUtilisateur: true },
      }),
    ]);
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de cette équipe pendant la période courante.');
    return this.prisma.affectation.findMany({
      where: { idEquipe, dateFinAffectation: null },
      orderBy: [{ dateHeureAffectation: 'asc' }, { idAffectation: 'asc' }],
      select: assignmentDetailSelect,
    });
  }

  async createAssignment(
    dto: CreateAssignmentDto,
    authUserId: string,
    idempotencyKey: string,
  ) {
    const actorId = await this.actorId(authUserId);
    this.validateIdempotencyKey(idempotencyKey);
    const referenceOperationUnique = this.operationReference(actorId, idempotencyKey, {
      operation: 'CREATE',
      idDossier: dto.idDossier,
      idTypeDechet: dto.idTypeDechet,
      idEquipe: dto.idEquipe,
      motif: dto.motif?.trim() ?? null,
      observation: dto.observation?.trim() ?? null,
    });

    return this.serializableWrite(
      async (tx) => {
        const previous = await tx.affectation.findUnique({
          where: { referenceOperationUnique },
          select: assignmentDetailSelect,
        });
        if (previous) return previous;

        const target = await this.validateAssignmentTarget(
          tx,
          dto.idDossier,
          dto.idTypeDechet,
          dto.idEquipe,
        );
        const current = await tx.affectation.findFirst({
          where: {
            idDossier: dto.idDossier,
            idTypeDechet: dto.idTypeDechet,
            dateFinAffectation: null,
          },
          select: { idAffectation: true, idEquipe: true },
        });
        if (current) {
          throw new ConflictException('Cette catégorie possède déjà une affectation active.');
        }

        const assignment = await this.createAssignmentRecord(tx, {
          idDossier: dto.idDossier,
          idTypeDechet: dto.idTypeDechet,
          idEquipe: dto.idEquipe,
          idCompetenceEquipe: target.idCompetenceEquipe,
          actorId,
          referenceOperationUnique,
          motif: dto.motif?.trim() || null,
          observation: dto.observation?.trim() || null,
        });

        await this.writeEvent(tx, {
          type: 'AFFECTATION_CREEE',
          actorId,
          assignmentId: assignment.idAffectation,
          after: {
            idDossier: dto.idDossier,
            idTypeDechet: dto.idTypeDechet,
            idEquipe: dto.idEquipe,
            idCompetenceEquipe: target.idCompetenceEquipe,
            decisionEquipe: 'EN_ATTENTE',
          },
          ...(dto.motif?.trim() ? { reason: dto.motif.trim() } : {}),
        });
        return tx.affectation.findUniqueOrThrow({
          where: { idAffectation: assignment.idAffectation },
          select: assignmentDetailSelect,
        });
      },
      'Une affectation concurrente existe déjà pour cette catégorie ou l’opération a été modifiée.',
    );
  }

  async respondToAssignment(
    idAffectation: string,
    dto: RespondAssignmentDto,
    authUserId: string,
  ) {
    const actorId = await this.actorId(authUserId);
    const refusalReason = dto.motifRefusEquipe?.trim();
    if (dto.decisionEquipe === 'REFUSEE' && (!refusalReason || refusalReason.length < 5)) {
      throw new BadRequestException('Un motif de refus d’au moins 5 caractères est obligatoire.');
    }

    return this.serializableWrite(
      async (tx) => {
        const current = await tx.affectation.findUnique({
          where: { idAffectation },
          select: {
            idAffectation: true,
            idDossier: true,
            idTypeDechet: true,
            idEquipe: true,
            dateFinAffectation: true,
            etatAffectation: true,
            decisionEquipe: true,
            observation: true,
            contenuDossier: {
              select: {
                etatContenuDossier: true,
                etatPriseEnCharge: true,
                dossier: { select: { statutDossier: true } },
              },
            },
          },
        });
        if (!current) throw new NotFoundException('Affectation introuvable.');
        if (current.dateFinAffectation || current.etatAffectation !== 'ACTIVE' || current.decisionEquipe !== 'EN_ATTENTE') {
          throw new ConflictException('Cette affectation n’attend plus de réponse de l’équipe.');
        }
        if (current.contenuDossier.etatContenuDossier !== 'ACTIF' || current.contenuDossier.dossier.statutDossier === 'CLOTURE') {
          throw new ConflictException('Le contenu ou le dossier n’est plus éligible à une réponse.');
        }

        await this.requireCurrentTeamMembership(tx, actorId, current.idEquipe);
        const now = new Date();
        const accepted = dto.decisionEquipe === 'ACCEPTEE';
        const update = await tx.affectation.updateMany({
          where: {
            idAffectation,
            dateFinAffectation: null,
            etatAffectation: 'ACTIVE',
            decisionEquipe: 'EN_ATTENTE',
          },
          data: {
            decisionEquipe: dto.decisionEquipe,
            ...(accepted ? {} : { etatAffectation: 'TERMINEE', dateFinAffectation: now }),
            reponduPar: actorId,
            dateReponseEquipe: now,
            motifRefusEquipe: accepted ? null : (refusalReason ?? null),
            observation: dto.observation?.trim() || current.observation,
          },
        });
        if (update.count !== 1) {
          throw new ConflictException('L’affectation a reçu une réponse simultanée.');
        }

        if (accepted) {
          const contentUpdate = await tx.contenuDossier.updateMany({
            where: {
              idDossier: current.idDossier,
              idTypeDechet: current.idTypeDechet,
              etatContenuDossier: 'ACTIF',
              etatPriseEnCharge: 'EN_ATTENTE',
            },
            data: { etatPriseEnCharge: 'EN_COURS' },
          });
          if (contentUpdate.count !== 1) {
            throw new ConflictException('Le contenu du dossier n’est plus en attente de prise en charge.');
          }
        }

        await this.writeEvent(tx, {
          type: accepted ? 'EQUIPE_AFFECTATION_ACCEPTEE' : 'EQUIPE_AFFECTATION_REFUSEE',
          actorId,
          assignmentId: idAffectation,
          before: { decisionEquipe: 'EN_ATTENTE' },
          after: {
            decisionEquipe: dto.decisionEquipe,
            reponduPar: actorId,
            dateReponseEquipe: now.toISOString(),
            ...(accepted ? {} : { dateFinAffectation: now.toISOString() }),
          },
          ...(refusalReason ? { reason: refusalReason } : {}),
        });

        return tx.affectation.findUniqueOrThrow({
          where: { idAffectation },
          select: assignmentDetailSelect,
        });
      },
      'La réponse à l’affectation a été enregistrée ou modifiée simultanément.',
    );
  }

  async reassign(
    idAffectation: string,
    dto: ReassignAssignmentDto,
    authUserId: string,
    idempotencyKey: string,
  ) {
    const actorId = await this.actorId(authUserId);
    this.validateIdempotencyKey(idempotencyKey);
    const motif = dto.motif.trim();
    if (motif.length < 5) throw new BadRequestException('Le motif de réaffectation est trop court.');
    const referenceOperationUnique = this.operationReference(actorId, idempotencyKey, {
      operation: 'REASSIGN',
      idAffectation,
      idEquipe: dto.idEquipe,
      motif,
      observation: dto.observation?.trim() ?? null,
    });

    return this.serializableWrite(
      async (tx) => {
        const replay = await tx.affectation.findUnique({
          where: { referenceOperationUnique },
          select: assignmentDetailSelect,
        });
        if (replay) return replay;

        const current = await tx.affectation.findUnique({
          where: { idAffectation },
          select: {
            idAffectation: true,
            idDossier: true,
            idTypeDechet: true,
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
        });
        if (!current) throw new NotFoundException('Affectation introuvable.');
        if (dto.idEquipe === current.idEquipe) {
          throw new BadRequestException('La nouvelle équipe doit être différente de l’équipe précédente.');
        }
        if (
          current.contenuDossier.etatContenuDossier !== 'ACTIF' ||
          current.contenuDossier.etatPriseEnCharge !== 'EN_ATTENTE' ||
          current.contenuDossier.dossier.statutDossier === 'CLOTURE'
        ) {
          throw new ConflictException('Le contenu ou le dossier n’est plus réaffectable.');
        }

        const interventions = await tx.intervention.count({ where: { idAffectation } });
        if (interventions > 0) {
          throw new ConflictException('Une affectation ayant déjà une intervention ne peut pas être réaffectée par ce parcours.');
        }

        const target = await this.validateAssignmentTarget(
          tx,
          current.idDossier,
          current.idTypeDechet,
          dto.idEquipe,
        );
        const now = new Date();

        if (!current.dateFinAffectation) {
          if (current.etatAffectation !== 'ACTIVE' || current.decisionEquipe !== 'EN_ATTENTE') {
            throw new ConflictException('Seule une affectation en attente peut être annulée avant réaffectation.');
          }
          const closed = await tx.affectation.updateMany({
            where: {
              idAffectation,
              dateFinAffectation: null,
              etatAffectation: 'ACTIVE',
              decisionEquipe: 'EN_ATTENTE',
            },
            data: {
              etatAffectation: 'ANNULEE',
              dateFinAffectation: now,
            },
          });
          if (closed.count !== 1) {
            throw new ConflictException('L’ancienne affectation a été modifiée simultanément.');
          }
          await this.writeEvent(tx, {
            type: 'AFFECTATION_ANNULEE',
            actorId,
            assignmentId: idAffectation,
            after: { dateFinAffectation: now.toISOString(), etatAffectation: 'ANNULEE' },
            reason: motif,
          });
        } else if (current.decisionEquipe !== 'REFUSEE' || current.etatAffectation !== 'TERMINEE') {
          throw new ConflictException('Seule une affectation refusée ou en attente peut être réaffectée.');
        }

        const assignment = await this.createAssignmentRecord(tx, {
          idDossier: current.idDossier,
          idTypeDechet: current.idTypeDechet,
          idEquipe: dto.idEquipe,
          idCompetenceEquipe: target.idCompetenceEquipe,
          actorId,
          referenceOperationUnique,
          motif,
          observation: dto.observation?.trim() || null,
        });
        await this.writeEvent(tx, {
          type: 'AFFECTATION_REAFFECTEE',
          actorId,
          assignmentId: assignment.idAffectation,
          before: {
            ancienneAffectation: idAffectation,
            ancienneEquipe: current.idEquipe,
          },
          after: {
            nouvelleAffectation: assignment.idAffectation,
            nouvelleEquipe: dto.idEquipe,
            idDossier: current.idDossier,
            idTypeDechet: current.idTypeDechet,
            idCompetenceEquipe: target.idCompetenceEquipe,
          },
          reason: motif,
        });
        return tx.affectation.findUniqueOrThrow({
          where: { idAffectation: assignment.idAffectation },
          select: assignmentDetailSelect,
        });
      },
      'La réaffectation a rencontré un conflit concurrent ou une affectation active existe déjà.',
    );
  }

  private async validateAssignmentTarget(
    tx: Transaction,
    idDossier: string,
    idTypeDechet: string,
    idEquipe: string,
  ) {
    const content = await tx.contenuDossier.findUnique({
      where: { idDossier_idTypeDechet: { idDossier, idTypeDechet } },
      select: {
        idDossier: true,
        idTypeDechet: true,
        etatContenuDossier: true,
        etatPriseEnCharge: true,
        dossier: { select: { statutDossier: true } },
      },
    });
    if (!content) throw new NotFoundException('Contenu du dossier introuvable.');
    if (content.etatContenuDossier !== 'ACTIF' || content.etatPriseEnCharge !== 'EN_ATTENTE') {
      throw new ConflictException('Seul un contenu actif en attente peut recevoir une affectation.');
    }
    if (content.dossier.statutDossier === 'CLOTURE') {
      throw new ConflictException('Un dossier clôturé ne peut pas recevoir d’affectation.');
    }

    const team = await tx.equipe.findUnique({
      where: { idEquipe },
      select: { idEquipe: true, etatEquipe: true },
    });
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (team.etatEquipe !== 'ACTIVE') {
      throw new ConflictException('Une équipe inactive ne peut recevoir de nouvelle affectation.');
    }

    const now = new Date();
    const competence = await tx.competenceEquipe.findFirst({
      where: {
        idEquipe,
        idTypeDechet,
        dateDebut: { lte: now },
        OR: [{ dateFin: null }, { dateFin: { gte: now } }],
      },
      select: { idCompetenceEquipe: true },
    });
    if (!competence) {
      throw new ConflictException('L’équipe ne possède pas de compétence valide pour ce type de déchet.');
    }

    const availability = await tx.disponibiliteEquipe.findUnique({
      where: { idEquipe },
      select: { etatDisponibilite: true, valideJusqua: true },
    });
    if (
      availability &&
      availability.valideJusqua.getTime() >= now.getTime() &&
      availability.etatDisponibilite === 'INDISPONIBLE'
    ) {
      throw new ConflictException('L’équipe est déclarée indisponible pour la période courante.');
    }

    return { idCompetenceEquipe: competence.idCompetenceEquipe };
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
      throw new ForbiddenException('Une appartenance active à l’équipe est requise pour répondre à cette affectation.');
    }
  }

  private async createAssignmentRecord(
    tx: Transaction,
    input: {
      idDossier: string;
      idTypeDechet: string;
      idEquipe: string;
      idCompetenceEquipe: string;
      actorId: string;
      referenceOperationUnique: string;
      motif: string | null;
      observation: string | null;
    },
  ) {
    const now = new Date();
    return tx.affectation.create({
      data: {
        idDossier: input.idDossier,
        idTypeDechet: input.idTypeDechet,
        idEquipe: input.idEquipe,
        idCompetenceEquipe: input.idCompetenceEquipe,
        dateHeureAffectation: now,
        idDecideur: input.actorId,
        etatAffectation: 'ACTIVE',
        motif: input.motif,
        observation: input.observation,
        dateFinAffectation: null,
        decisionEquipe: 'EN_ATTENTE',
        reponduPar: null,
        dateReponseEquipe: null,
        motifRefusEquipe: null,
        referenceOperationUnique: input.referenceOperationUnique,
      },
      select: { idAffectation: true },
    });
  }

  private async writeEvent(
    tx: Transaction,
    payload: {
      type: string;
      actorId: string;
      assignmentId: string;
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
        idAffectationCible: payload.assignmentId,
        ...(payload.before ? { donneesAvant: payload.before as Prisma.InputJsonObject } : {}),
        ...(payload.after ? { donneesApres: payload.after as Prisma.InputJsonObject } : {}),
        ...(payload.reason ? { motif: payload.reason } : {}),
        versionSchema: 1,
      },
    });
  }

  private validateIdempotencyKey(key: string): void {
    if (!key || key.trim().length < 8 || key.trim().length > 128) {
      throw new BadRequestException('L’en-tête Idempotency-Key doit contenir entre 8 et 128 caractères.');
    }
  }

  private operationReference(
    actorId: string,
    key: string,
    payload: Record<string, unknown>,
  ): string {
    return createHash('sha256')
      .update(JSON.stringify({ actorId, key: key.trim(), payload }))
      .digest('hex');
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
