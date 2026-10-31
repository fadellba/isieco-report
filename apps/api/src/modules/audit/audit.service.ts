import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuditListQueryDto } from './dto/audit-list-query.dto.js';

const auditTargetFields = {
  idSignalementCible: true,
  idDossierCible: true,
  idRattachementCible: true,
  idAffectationCible: true,
  idInterventionCible: true,
  idVerificationCible: true,
  idUtilisateurCible: true,
  idEquipeCible: true,
  idRegionCible: true,
  idDepartementCible: true,
  idCommuneCible: true,
  idTypeDechetCible: true,
  idCompetenceEquipeCible: true,
  idDossierContenuCible: true,
  idTypeDechetContenuCible: true,
} satisfies Prisma.EvenementMetierSelect;

const auditEventSelect = {
  idEvenement: true,
  typeEvenement: true,
  dateEvenement: true,
  dateEnregistrement: true,
  origine: true,
  idActeur: true,
  ...auditTargetFields,
} satisfies Prisma.EvenementMetierSelect;

type AuditEventRow = Prisma.EvenementMetierGetPayload<{
  select: typeof auditEventSelect;
}>;

type AuditTarget =
  | { type: 'SIGNALEMENT'; id: string }
  | { type: 'DOSSIER'; id: string }
  | { type: 'RATTACHEMENT'; id: string }
  | { type: 'AFFECTATION'; id: string }
  | { type: 'INTERVENTION'; id: string }
  | { type: 'VERIFICATION'; id: string }
  | { type: 'UTILISATEUR'; id: string }
  | { type: 'EQUIPE'; id: string }
  | { type: 'REGION'; id: string }
  | { type: 'DEPARTEMENT'; id: string }
  | { type: 'COMMUNE'; id: string }
  | { type: 'TYPE_DECHET'; id: string }
  | { type: 'COMPETENCE_EQUIPE'; id: string }
  | { type: 'CONTENU_DOSSIER'; id: string };

function targetOf(event: AuditEventRow): AuditTarget | null {
  if (event.idSignalementCible) return { type: 'SIGNALEMENT', id: event.idSignalementCible };
  if (event.idDossierCible) return { type: 'DOSSIER', id: event.idDossierCible };
  if (event.idRattachementCible) return { type: 'RATTACHEMENT', id: event.idRattachementCible };
  if (event.idAffectationCible) return { type: 'AFFECTATION', id: event.idAffectationCible };
  if (event.idInterventionCible) return { type: 'INTERVENTION', id: event.idInterventionCible };
  if (event.idVerificationCible) return { type: 'VERIFICATION', id: event.idVerificationCible };
  if (event.idUtilisateurCible) return { type: 'UTILISATEUR', id: event.idUtilisateurCible };
  if (event.idEquipeCible) return { type: 'EQUIPE', id: event.idEquipeCible };
  if (event.idRegionCible) return { type: 'REGION', id: event.idRegionCible };
  if (event.idDepartementCible) return { type: 'DEPARTEMENT', id: event.idDepartementCible };
  if (event.idCommuneCible) return { type: 'COMMUNE', id: event.idCommuneCible };
  if (event.idTypeDechetCible) return { type: 'TYPE_DECHET', id: event.idTypeDechetCible };
  if (event.idCompetenceEquipeCible) return { type: 'COMPETENCE_EQUIPE', id: event.idCompetenceEquipeCible };
  if (event.idDossierContenuCible) {
    return {
      type: 'CONTENU_DOSSIER',
      id: `${event.idDossierContenuCible}:${event.idTypeDechetContenuCible ?? ''}`,
    };
  }
  return null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireActiveActor(authUserId: string): Promise<string> {
    const actor = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: { idUtilisateur: true, etatCompte: true },
    });

    if (!actor || actor.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un compte métier actif est requis pour consulter son historique.');
    }

    return actor.idUtilisateur;
  }

  private buildWhere(query: AuditListQueryDto): Prisma.EvenementMetierWhereInput {
    const dateDebut = query.dateDebut ? new Date(query.dateDebut) : undefined;
    const dateFin = query.dateFin ? new Date(query.dateFin) : undefined;

    if (dateDebut && dateFin && dateDebut.getTime() > dateFin.getTime()) {
      throw new BadRequestException('dateDebut doit être antérieure ou égale à dateFin.');
    }

    return {
      ...(query.typeEvenement ? { typeEvenement: query.typeEvenement } : {}),
      ...(dateDebut || dateFin
        ? {
            dateEnregistrement: {
              ...(dateDebut ? { gte: dateDebut } : {}),
              ...(dateFin ? { lte: dateFin } : {}),
            },
          }
        : {}),
    };
  }

  private async list(where: Prisma.EvenementMetierWhereInput, query: AuditListQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const filters: Prisma.EvenementMetierWhereInput = {
      AND: [where, this.buildWhere(query)],
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.evenementMetier.count({ where: filters }),
      this.prisma.evenementMetier.findMany({
        where: filters,
        orderBy: [{ dateEnregistrement: 'desc' }, { idEvenement: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: auditEventSelect,
      }),
    ]);

    return {
      items: rows.map((event) => ({
        idEvenement: event.idEvenement,
        typeEvenement: event.typeEvenement,
        dateEvenement: event.dateEvenement,
        dateEnregistrement: event.dateEnregistrement,
        origine: event.origine,
        idActeur: event.idActeur,
        cible: targetOf(event),
      })),
      page,
      pageSize,
      total,
    };
  }

  async listMyEvents(authUserId: string, query: AuditListQueryDto) {
    const actorId = await this.requireActiveActor(authUserId);
    return this.list(
      {
        OR: [{ idActeur: actorId }, { idUtilisateurCible: actorId }],
      },
      query,
    );
  }

  async listAccountRoleEvents(
    idUtilisateur: string,
    authUserId: string,
    query: AuditListQueryDto,
  ) {
    await this.requireActiveActor(authUserId);
    const target = await this.prisma.utilisateur.findUnique({
      where: { idUtilisateur },
      select: { idUtilisateur: true },
    });
    if (!target) throw new NotFoundException('Compte cible introuvable.');

    return this.list(
      {
        idUtilisateurCible: idUtilisateur,
        typeEvenement: { in: ['ROLE_ATTRIBUE', 'ROLE_REVOQUE'] },
      },
      query,
    );
  }
}
