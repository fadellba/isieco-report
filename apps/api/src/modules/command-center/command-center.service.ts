import { Buffer } from 'node:buffer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { CommandCenterQueryDto } from './dto/command-center-query.dto.js';

const OPEN_REPORT_STATUSES = ['SOUMIS', 'EN_ATTENTE_COMPLEMENT', 'COMPLEMENT_REPONDU'] as const;

type MapViewport = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

type SpatialCursor = {
  version: 1;
  occurredAt: string;
  kind: 'DOSSIER' | 'SIGNALEMENT';
  id: string;
  viewport: MapViewport | null;
};

function parseSpatialCursor(value: string | undefined, viewport: MapViewport | null): SpatialCursor | null {
  if (!value) return null;
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new BadRequestException('Le curseur cartographique est invalide.');
  }

  try {
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.toString('base64url') !== value) {
      throw new Error('Non canonical base64url cursor.');
    }
    const parsed = JSON.parse(decoded.toString('utf8')) as Partial<SpatialCursor>;
    const occurredAt = typeof parsed.occurredAt === 'string' ? new Date(parsed.occurredAt) : null;
    const validId = typeof parsed.id === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id);
    const sameViewport = viewport === null
      ? parsed.viewport === null
      : parsed.viewport !== null
        && parsed.viewport?.minLat === viewport.minLat
        && parsed.viewport?.maxLat === viewport.maxLat
        && parsed.viewport?.minLon === viewport.minLon
        && parsed.viewport?.maxLon === viewport.maxLon;

    if (
      parsed.version !== 1
      || !occurredAt
      || Number.isNaN(occurredAt.getTime())
      || (parsed.kind !== 'DOSSIER' && parsed.kind !== 'SIGNALEMENT')
      || !validId
      || !sameViewport
    ) {
      throw new Error('Invalid cursor payload.');
    }

    return {
      version: 1,
      occurredAt: occurredAt.toISOString(),
      kind: parsed.kind,
      id: parsed.id,
      viewport,
    };
  } catch {
    throw new BadRequestException('Le curseur cartographique est invalide ou ne correspond pas au viewport courant.');
  }
}

function encodeSpatialCursor(
  feature: { occurredAt: Date | null; kind: 'DOSSIER' | 'SIGNALEMENT'; id: string },
  viewport: MapViewport | null,
): string {
  if (!feature.occurredAt) {
    throw new Error('A map feature must have an occurrence timestamp to create a cursor.');
  }
  const payload: SpatialCursor = {
    version: 1,
    occurredAt: feature.occurredAt.toISOString(),
    kind: feature.kind,
    id: feature.id,
    viewport,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function buildDossierCursorWhere(cursor: SpatialCursor) {
  const occurredAt = new Date(cursor.occurredAt);
  if (cursor.kind === 'SIGNALEMENT') {
    return { dateCreationDossier: { lt: occurredAt } };
  }
  return {
    OR: [
      { dateCreationDossier: { lt: occurredAt } },
      { dateCreationDossier: occurredAt, idDossier: { lt: cursor.id } },
    ],
  };
}

function buildSignalementCursorWhere(cursor: SpatialCursor) {
  const occurredAt = new Date(cursor.occurredAt);
  if (cursor.kind === 'DOSSIER') {
    return { dateSoumission: { lte: occurredAt } };
  }
  return {
    OR: [
      { dateSoumission: { lt: occurredAt } },
      { dateSoumission: occurredAt, idSignalement: { lt: cursor.id } },
    ],
  };
}

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

    const viewport: MapViewport | null = hasViewport
      ? {
          minLat: query.minLat!,
          maxLat: query.maxLat!,
          minLon: query.minLon!,
          maxLon: query.maxLon!,
        }
      : null;
    const cursor = parseSpatialCursor(query.cursor, viewport);
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
    const mapCaseBaseWhere = { ...locatedCaseWhere, ...viewportWhere };
    const mapReportBaseWhere = { ...locatedReportWhere, ...viewportWhere };
    const mapCaseWhere = cursor
      ? { AND: [locatedCaseWhere, viewportWhere, buildDossierCursorWhere(cursor)] }
      : mapCaseBaseWhere;
    const mapReportWhere = cursor
      ? { AND: [locatedReportWhere, viewportWhere, buildSignalementCursorWhere(cursor)] }
      : mapReportBaseWhere;

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
        take: limit + 1,
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

    const [remainingCasesCount, remainingReportsCount] = cursor
      ? await Promise.all([
          this.prisma.dossierTraitement.count({ where: mapCaseWhere }),
          this.prisma.signalement.count({ where: mapReportWhere }),
        ])
      : [mapLocatedCasesCount, mapLocatedReportsCount];
    const totalLocated = mapLocatedCasesCount + mapLocatedReportsCount;
    const remainingCount = remainingCasesCount + remainingReportsCount;
    const mapItems = [...caseFeatures, ...reportFeatures].sort((left, right) => {
      const occurredAtDifference =
        (right.occurredAt?.getTime() ?? 0) - (left.occurredAt?.getTime() ?? 0);
      if (occurredAtDifference !== 0) return occurredAtDifference;
      if (left.kind !== right.kind) return left.kind === 'DOSSIER' ? -1 : 1;
      return right.id.localeCompare(left.id);
    });
    const pageItems = mapItems.slice(0, limit);
    const hasMore = pageItems.length > 0 && remainingCount > pageItems.length;
    const lastFeature = pageItems.at(-1);
    const nextCursor = hasMore && lastFeature
      ? encodeSpatialCursor(lastFeature, viewport)
      : null;

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
        items: pageItems,
        totalLocated,
        truncated: hasMore,
        hasMore,
        nextCursor,
        limit,
      },
      generatedAt: new Date(),
    };
  }
}
