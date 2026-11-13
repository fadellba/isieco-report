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
import { recordBusinessEvent } from '../../infrastructure/audit/business-audit.js';
import type { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import type { ListAssignmentsQueryDto } from './dto/list-assignments-query.dto.js';
import type { ReassignAssignmentDto } from './dto/reassign-assignment.dto.js';
import type { RespondAssignmentDto } from './dto/respond-assignment.dto.js';

type Transaction = Prisma.TransactionClient;

const assignmentDetailSelect = {
  idAffectation: true,
  idContenuDossier: true,
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
  referenceOperationUnique: true,
  equipe: { select: { idEquipe: true, nomEquipe: true, etatEquipe: true } },
  competence: { select: { idCompetenceEquipe: true, actif: true, dateAttribution: true } },
  contenuDossier: {
    select: {
      idContenuDossier: true,
      idDossier: true,
      idTypeDechet: true,
      etatContenuDossier: true,
      etatPriseEnCharge: true,
      dossier: {
        select: {
          referenceDossier: true,
          statutDossier: true,
          priorite: true,
          latitude: true,
          longitude: true,
          precisionLocalisation: true,
          descriptionLocalisation: true,
        },
      },
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

  private shapeAssignment(row: Prisma.AffectationGetPayload<{ select: typeof assignmentDetailSelect }>) {
    return {
      ...row,
      idDossier: row.contenuDossier.idDossier,
      idTypeDechet: row.contenuDossier.idTypeDechet,
      competence: row.competence,
      contenuDossier: {
        ...row.contenuDossier,
        dossier: {
          ...row.contenuDossier.dossier,
          latitude: row.contenuDossier.dossier.latitude?.toString() ?? null,
          longitude: row.contenuDossier.dossier.longitude?.toString() ?? null,
          precisionLocalisation: row.contenuDossier.dossier.precisionLocalisation?.toString() ?? null,
        },
      },
    };
  }

  async listAssignments(query: ListAssignmentsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.AffectationWhereInput = {
      ...(query.idDossier ? { contenuDossier: { idDossier: query.idDossier } } : {}),
      ...(query.idEquipe ? { idEquipe: query.idEquipe } : {}),
      ...(query.etatAffectation ? { etatAffectation: query.etatAffectation } : {}),
      ...(query.decisionEquipe ? { decisionEquipe: query.decisionEquipe } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.affectation.count({ where }),
      this.prisma.affectation.findMany({
        where,
        orderBy: [{ dateHeureAffectation: 'desc' }, { idAffectation: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: assignmentDetailSelect,
      }),
    ]);
    return { items: rows.map((row) => this.shapeAssignment(row)), page, pageSize, total };
  }

  async listPendingContents(query: ListAssignmentsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.ContenuDossierWhereInput = {
      ...(query.idDossier ? { idDossier: query.idDossier } : {}),
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
          idContenuDossier: true,
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
    const teams = await this.prisma.equipe.findMany({
      where: {
        etatEquipe: 'ACTIVE',
        competences: { some: { idTypeDechet, actif: true } },
      },
      orderBy: { nomEquipe: 'asc' },
      select: {
        idEquipe: true,
        nomEquipe: true,
        etatEquipe: true,
        competences: {
          where: { idTypeDechet, actif: true },
          orderBy: { dateAttribution: 'desc' },
          take: 1,
          select: { idCompetenceEquipe: true, actif: true, dateAttribution: true },
        },
      },
    });
    return teams
      .filter((team) => team.competences.length > 0)
      .map((team) => ({
        idEquipe: team.idEquipe,
        nomEquipe: team.nomEquipe,
        etatEquipe: team.etatEquipe,
      }));
  }

  async listTeamAssignments(idEquipe: string, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const now = new Date();
    const [team, membership] = await Promise.all([
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
    ]);
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de cette équipe pendant la période courante.');
    const rows = await this.prisma.affectation.findMany({
      where: { idEquipe, dateFinAffectation: null },
      orderBy: [{ dateHeureAffectation: 'asc' }, { idAffectation: 'asc' }],
      select: assignmentDetailSelect,
    });
    return rows.map((row) => this.shapeAssignment(row));
  }

  async createAssignment(dto: CreateAssignmentDto, authUserId: string, idempotencyKey: string) {
    const actorId = await this.actorId(authUserId);
    this.validateIdempotencyKey(idempotencyKey);
    const referenceOperationUnique = this.operationReference(actorId, idempotencyKey, {
      operation: 'CREATE',
      idContenuDossier: dto.idContenuDossier,
      idEquipe: dto.idEquipe,
      motif: dto.motif?.trim() ?? null,
      observation: dto.observation?.trim() ?? null,
    });

    return this.serializableWrite(async (tx) => {
      const replay = await tx.affectation.findUnique({
        where: { referenceOperationUnique },
        select: assignmentDetailSelect,
      });
      if (replay) return this.shapeAssignment(replay);

      const target = await this.validateAssignmentTarget(tx, dto.idContenuDossier, dto.idEquipe);
      const active = await tx.affectation.findFirst({
        where: { idContenuDossier: target.idContenuDossier, dateFinAffectation: null },
        select: { idAffectation: true },
      });
      if (active) throw new ConflictException('Cette catégorie possède déjà une affectation active.');

      const created = await this.createAssignmentRecord(tx, {
        idContenuDossier: target.idContenuDossier,
        idEquipe: dto.idEquipe,
        idCompetenceEquipe: target.idCompetenceEquipe,
        actorId,
        referenceOperationUnique,
        motif: dto.motif?.trim() || null,
        observation: dto.observation?.trim() || null,
      });
      const row = await tx.affectation.findUniqueOrThrow({
        where: { idAffectation: created.idAffectation },
        select: assignmentDetailSelect,
      });
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'AFFECTATION_CREEE',
        entityType: 'AFFECTATION',
        entityId: created.idAffectation,
        dossierId: row.contenuDossier.idDossier,
        metadata: { teamId: dto.idEquipe },
      });
      return this.shapeAssignment(row);
    }, 'Une affectation concurrente existe déjà pour cette catégorie ou l’opération a été modifiée.');
  }

  async respondToAssignment(idAffectation: string, dto: RespondAssignmentDto, authUserId: string) {
    const actorId = await this.actorId(authUserId);
    const refusalReason = dto.motifRefusEquipe?.trim();
    if (dto.decisionEquipe === 'REFUSEE' && (!refusalReason || refusalReason.length < 5)) {
      throw new BadRequestException('Un motif de refus d’au moins 5 caractères est obligatoire.');
    }
    return this.serializableWrite(async (tx) => {
      const current = await tx.affectation.findUnique({
        where: { idAffectation },
        select: {
          idAffectation: true,
          idEquipe: true,
          idContenuDossier: true,
          dateFinAffectation: true,
          etatAffectation: true,
          decisionEquipe: true,
          observation: true,
          contenuDossier: {
            select: {
              idDossier: true,
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
      const updated = await tx.affectation.updateMany({
        where: { idAffectation, dateFinAffectation: null, etatAffectation: 'ACTIVE', decisionEquipe: 'EN_ATTENTE' },
        data: {
          decisionEquipe: dto.decisionEquipe,
          ...(!accepted ? { etatAffectation: 'TERMINEE', dateFinAffectation: now } : {}),
          reponduPar: actorId,
          dateReponseEquipe: now,
          motifRefusEquipe: accepted ? null : (refusalReason ?? null),
          observation: dto.observation?.trim() || current.observation,
        },
      });
      if (updated.count !== 1) throw new ConflictException('L’affectation a reçu une réponse simultanée.');

      await recordBusinessEvent(tx, {
        actorId,
        actionCode: accepted ? 'AFFECTATION_ACCEPTEE' : 'AFFECTATION_REFUSEE',
        entityType: 'AFFECTATION',
        entityId: idAffectation,
        dossierId: current.contenuDossier.idDossier,
        metadata: { decision: dto.decisionEquipe },
      });

      if (accepted) {
        const contentUpdate = await tx.contenuDossier.updateMany({
          where: {
            idContenuDossier: current.idContenuDossier,
            etatContenuDossier: 'ACTIF',
            etatPriseEnCharge: 'EN_ATTENTE',
          },
          data: { etatPriseEnCharge: 'EN_COURS' },
        });
        if (contentUpdate.count !== 1) {
          throw new ConflictException('Le contenu du dossier n’est plus en attente de prise en charge.');
        }
      }
      const row = await tx.affectation.findUniqueOrThrow({
        where: { idAffectation },
        select: assignmentDetailSelect,
      });
      return this.shapeAssignment(row);
    }, 'La réponse à l’affectation a été enregistrée ou modifiée simultanément.');
  }

  async reassign(idAffectation: string, dto: ReassignAssignmentDto, authUserId: string, idempotencyKey: string) {
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

    return this.serializableWrite(async (tx) => {
      const replay = await tx.affectation.findUnique({
        where: { referenceOperationUnique },
        select: assignmentDetailSelect,
      });
      if (replay) return this.shapeAssignment(replay);

      const current = await tx.affectation.findUnique({
        where: { idAffectation },
        select: {
          idAffectation: true,
          idContenuDossier: true,
          idEquipe: true,
          dateFinAffectation: true,
          etatAffectation: true,
          decisionEquipe: true,
          contenuDossier: {
            select: {
              idDossier: true,
              idTypeDechet: true,
              etatContenuDossier: true,
              etatPriseEnCharge: true,
              dossier: { select: { statutDossier: true } },
            },
          },
        },
      });
      if (!current) throw new NotFoundException('Affectation introuvable.');
      if (current.idEquipe === dto.idEquipe) throw new BadRequestException('La nouvelle équipe doit être différente.');
      if (current.contenuDossier.etatContenuDossier !== 'ACTIF' || current.contenuDossier.etatPriseEnCharge === 'TERMINE' ||
          current.contenuDossier.dossier.statutDossier === 'CLOTURE') {
        throw new ConflictException('Le contenu ou le dossier n’est plus réaffectable.');
      }
      const interventions = await tx.intervention.count({ where: { idAffectation } });
      if (interventions > 0) throw new ConflictException('Une affectation ayant une intervention ne peut pas être réaffectée.');

      const target = await this.validateAssignmentTarget(
        tx,
        current.idContenuDossier,
        dto.idEquipe,
      );
      const now = new Date();
      if (!current.dateFinAffectation) {
        if (current.etatAffectation !== 'ACTIVE' || current.decisionEquipe !== 'EN_ATTENTE') {
          throw new ConflictException('Seule une affectation en attente peut être annulée.');
        }
        const closed = await tx.affectation.updateMany({
          where: { idAffectation, dateFinAffectation: null, etatAffectation: 'ACTIVE', decisionEquipe: 'EN_ATTENTE' },
          data: { etatAffectation: 'ANNULEE', dateFinAffectation: now },
        });
        if (closed.count !== 1) throw new ConflictException('L’ancienne affectation a été modifiée simultanément.');
      } else if (current.decisionEquipe !== 'REFUSEE' || current.etatAffectation !== 'TERMINEE') {
        throw new ConflictException('Seule une affectation refusée ou encore en attente peut être réaffectée.');
      }

      const active = await tx.affectation.findFirst({
        where: { idContenuDossier: current.idContenuDossier, dateFinAffectation: null },
        select: { idAffectation: true },
      });
      if (active) throw new ConflictException('Une autre affectation active existe déjà pour ce contenu.');

      const created = await this.createAssignmentRecord(tx, {
        idContenuDossier: current.idContenuDossier,
        idEquipe: dto.idEquipe,
        idCompetenceEquipe: target.idCompetenceEquipe,
        actorId,
        referenceOperationUnique,
        motif,
        observation: dto.observation?.trim() || null,
      });
      const row = await tx.affectation.findUniqueOrThrow({
        where: { idAffectation: created.idAffectation },
        select: assignmentDetailSelect,
      });
      await recordBusinessEvent(tx, {
        actorId,
        actionCode: 'AFFECTATION_REAFFECTEE',
        entityType: 'AFFECTATION',
        entityId: created.idAffectation,
        dossierId: current.contenuDossier.idDossier,
        metadata: { assignmentId: idAffectation, teamId: dto.idEquipe },
      });
      return this.shapeAssignment(row);
    }, 'La réaffectation a rencontré un conflit concurrent ou une affectation active existe déjà.');
  }

  private async validateAssignmentTarget(tx: Transaction, idContenuDossier: string, idEquipe: string) {
    const content = await tx.contenuDossier.findUnique({
      where: { idContenuDossier },
      select: {
        idContenuDossier: true,
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
    if (content.dossier.statutDossier === 'CLOTURE') throw new ConflictException('Un dossier clôturé ne peut pas recevoir d’affectation.');

    const team = await tx.equipe.findUnique({
      where: { idEquipe },
      select: { idEquipe: true, etatEquipe: true },
    });
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (team.etatEquipe !== 'ACTIVE') throw new ConflictException('Une équipe inactive ne peut recevoir de nouvelle affectation.');

    const competence = await tx.competenceEquipe.findFirst({
      where: { idEquipe, idTypeDechet: content.idTypeDechet, actif: true },
      select: { idCompetenceEquipe: true },
    });
    if (!competence) throw new ConflictException('L’équipe ne possède pas de compétence active pour ce type de déchet.');
    return { idContenuDossier: content.idContenuDossier, idCompetenceEquipe: competence.idCompetenceEquipe };
  }

  private async requireCurrentTeamMembership(tx: Transaction, actorId: string, idEquipe: string): Promise<void> {
    const now = new Date();
    const membership = await tx.appartenanceEquipe.findFirst({
      where: {
        idUtilisateur: actorId,
        idEquipe,
        dateDebut: { lte: now },
        OR: [{ dateFin: null }, { dateFin: { gte: now } }],
      },
      select: { idEquipe: true },
    });
    if (!membership) throw new ForbiddenException('Une appartenance active à l’équipe est requise.');
  }

  private async createAssignmentRecord(
    tx: Transaction,
    input: {
      idContenuDossier: string;
      idEquipe: string;
      idCompetenceEquipe: string;
      actorId: string;
      referenceOperationUnique: string;
      motif: string | null;
      observation: string | null;
    },
  ) {
    return tx.affectation.create({
      data: {
        idContenuDossier: input.idContenuDossier,
        idEquipe: input.idEquipe,
        idCompetenceEquipe: input.idCompetenceEquipe,
        dateHeureAffectation: new Date(),
        idDecideur: input.actorId,
        etatAffectation: 'ACTIVE',
        motif: input.motif,
        observation: input.observation,
        dateFinAffectation: null,
        decisionEquipe: 'EN_ATTENTE',
        referenceOperationUnique: input.referenceOperationUnique,
      },
      select: { idAffectation: true },
    });
  }

  private validateIdempotencyKey(key: string): void {
    if (!key || key.trim().length < 8 || key.trim().length > 128) {
      throw new BadRequestException('L’en-tête Idempotency-Key doit contenir entre 8 et 128 caractères.');
    }
  }

  private operationReference(actorId: string, key: string, payload: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify({ actorId, key: key.trim(), payload })).digest('hex');
  }

  private async serializableWrite<T>(operation: (tx: Transaction) => Promise<T>, conflictMessage: string): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException || error instanceof ForbiddenException) {
        throw error;
      }
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException(conflictMessage);
      }
      throw error;
    }
  }
}
