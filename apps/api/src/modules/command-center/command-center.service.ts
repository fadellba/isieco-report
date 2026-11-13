import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { CommandCenterQueryDto } from './dto/command-center-query.dto.js';

const OPEN_REPORT_STATUSES = ['SOUMIS', 'EN_ATTENTE_COMPLEMENT', 'COMPLEMENT_REPONDU'] as const;

@Injectable()
export class CommandCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: CommandCenterQueryDto) {
    const bounds = [query.minLat, query.maxLat, query.minLon, query.maxLon];
    const hasViewport = bounds.some((value) => value !== undefined);
    if (hasViewport && bounds.some((value) => value === undefined)) {
      throw new BadRequestException('Les quatre bornes du viewport (minLat, maxLat, minLon, maxLon) sont requises ensemble.');
    }
    if (hasViewport && query.minLat! > query.maxLat!) {
      throw new BadRequestException('La latitude minimale du viewport doit être inférieure ou égale à la latitude maximale.');
    }

    const limit = Math.min(250, Math.max(1, query.limit ?? 150));
    const activeReportWhere = {
      idDossier: null,
      statutSignalement: { in: [...OPEN_REPORT_STATUSES] },
    };
    const openCaseWhere = { statutDossier: { not: 'CLOTURE' } };
    const locatedCaseWhere = {
      ...openCaseWhere,
      latitude: { not: null },
      longitude: { not: null },
    };
    const locatedReportWhere = {
      ...activeReportWhere,
      latitude: { not: null },
      longitude: { not: null },
    };
    const viewportWhere = hasViewport
      ? {
          latitude: { gte: query.minLat, lte: query.maxLat },
          ...(query.minLon! <= query.maxLon!
            ? { longitude: { gte: query.minLon, lte: query.maxLon } }
            : {
                OR: [
                  { longitude: { gte: query.minLon } },
                  { longitude: { lte: query.maxLon } },
                ],
              }),
        }
      : {};
    const mapCaseWhere = { ...locatedCaseWhere, ...viewportWhere };
    const mapReportWhere = { ...locatedReportWhere, ...viewportWhere };

    const missingCaseLocationWhere = {
      ...openCaseWhere,
      OR: [{ latitude: null }, { longitude: null }],
    };
    const missingReportLocationWhere = {
      ...activeReportWhere,
      OR: [{ latitude: null }, { longitude: null }],
    };

    const [
      reportsAwaitingQualification,
      reportsAwaitingCitizen,
      openCases,
      urgentCases,
      activeAssignments,
      activeInterventions,
      pendingVerifications,
      locatedCasesCount,
      locatedReportsCount,
      missingCasesCount,
      missingReportsCount,
      mapLocatedCasesCount,
      mapLocatedReportsCount,
      cases,
      reports,
    ] = await Promise.all([
      this.prisma.signalement.count({
        where: { statutSignalement: { in: ['SOUMIS', 'COMPLEMENT_REPONDU'] } },
      }),
      this.prisma.signalement.count({
        where: { statutSignalement: 'EN_ATTENTE_COMPLEMENT' },
      }),
      this.prisma.dossierTraitement.count({ where: openCaseWhere }),
      this.prisma.dossierTraitement.count({
        where: { ...openCaseWhere, priorite: { in: ['HAUTE', 'CRITIQUE'] } },
      }),
      this.prisma.affectation.count({
        where: { etatAffectation: 'ACTIVE', dateFinAffectation: null },
      }),
      this.prisma.intervention.count({ where: { statutIntervention: 'EN_COURS' } }),
      this.prisma.intervention.count({
        where: { statutIntervention: 'SOUMISE', verification: null },
      }),
      this.prisma.dossierTraitement.count({ where: locatedCaseWhere }),
      this.prisma.signalement.count({ where: locatedReportWhere }),
      this.prisma.dossierTraitement.count({ where: missingCaseLocationWhere }),
      this.prisma.signalement.count({ where: missingReportLocationWhere }),
      this.prisma.dossierTraitement.count({ where: mapCaseWhere }),
      this.prisma.signalement.count({ where: mapReportWhere }),
      this.prisma.dossierTraitement.findMany({
        where: mapCaseWhere,
        orderBy: [{ dateCreationDossier: 'desc' }, { idDossier: 'desc' }],
        take: limit,
        select: {
          idDossier: true,
          referenceDossier: true,
          descriptionSynthese: true,
          dateCreationDossier: true,
          statutDossier: true,
          priorite: true,
          latitude: true,
          longitude: true,
          descriptionLocalisation: true,
          contenus: {
            where: { etatContenuDossier: 'ACTIF' },
            select: {
              typeDechet: { select: { libelle: true } },
              affectations: {
                where: { dateFinAffectation: null, etatAffectation: 'ACTIVE' },
                select: {
                  equipe: { select: { nomEquipe: true } },
                  interventions: {
                    where: { statutIntervention: 'EN_COURS' },
                    select: { idIntervention: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.signalement.findMany({
        where: mapReportWhere,
        orderBy: [{ dateSoumission: 'desc' }, { idSignalement: 'desc' }],
        take: limit,
        select: {
          idSignalement: true,
          dateSoumission: true,
          description: true,
          localisation: true,
          latitude: true,
          longitude: true,
          statutSignalement: true,
        },
      }),
    ]);

    const caseFeatures = cases.map((item) => {
      const assignments = item.contenus.flatMap((content) => content.affectations);
      return {
        kind: 'DOSSIER' as const,
        id: item.idDossier,
        title: item.referenceDossier,
        status: item.statutDossier,
        priority: item.priorite,
        latitude: item.latitude?.toString() ?? null,
        longitude: item.longitude?.toString() ?? null,
        locationLabel: item.descriptionLocalisation,
        occurredAt: item.dateCreationDossier,
        teamNames: [...new Set(assignments.map((assignment) => assignment.equipe.nomEquipe))],
        activeInterventions: assignments.reduce(
          (total, assignment) => total + assignment.interventions.length,
          0,
        ),
        wasteTypes: [...new Set(item.contenus.map((content) => content.typeDechet.libelle))],
      };
    });

    const reportFeatures = reports.map((item) => ({
      kind: 'SIGNALEMENT' as const,
      id: item.idSignalement,
      title: item.description?.trim().slice(0, 76) || 'Signalement non qualifié',
      status: item.statutSignalement,
      priority: null,
      latitude: item.latitude?.toString() ?? null,
      longitude: item.longitude?.toString() ?? null,
      locationLabel: item.localisation,
      occurredAt: item.dateSoumission,
      teamNames: [],
      activeInterventions: 0,
      wasteTypes: [],
    }));

    const totalLocated = mapLocatedCasesCount + mapLocatedReportsCount;
    const mapItems = [...caseFeatures, ...reportFeatures]
      .sort((left, right) =>
        (right.occurredAt?.getTime() ?? 0) - (left.occurredAt?.getTime() ?? 0),
      )
      .slice(0, limit);

    return {
      summary: {
        reportsAwaitingQualification,
        reportsAwaitingCitizen,
        openCases,
        urgentCases,
        activeAssignments,
        activeInterventions,
        pendingVerifications,
        locatedItems: locatedCasesCount + locatedReportsCount,
        withoutLocation: missingCasesCount + missingReportsCount,
      },
      map: {
        items: mapItems,
        totalLocated,
        truncated: totalLocated > mapItems.length,
        limit,
      },
      generatedAt: new Date(),
    };
  }
}
