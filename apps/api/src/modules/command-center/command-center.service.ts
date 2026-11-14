import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { CommandCenterQueryDto } from './dto/command-center-query.dto.js';
import { pendingVerificationWhere } from '../verification/pending-verification.query.js';

const OPEN_REPORT_STATUSES = ['SOUMIS', 'EN_ATTENTE_COMPLEMENT', 'COMPLEMENT_REPONDU'] as const;

type MapCursor = {
  occurredAt: string | null;
  kind: 'DOSSIER' | 'SIGNALEMENT';
  id: string;
  viewport: [number, number, number, number] | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeMapCursor(value?: string): MapCursor | null {
  if (value === undefined) return null;
  try {
    if (!/^[A-Za-z0-9_-]{1,512}$/.test(value)) throw new Error('invalid encoding');
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== value) throw new Error('non-canonical encoding');
    const payload: unknown = JSON.parse(decoded);
    if (typeof payload !== 'object' || payload === null) throw new Error('invalid payload');
    const candidate = payload as Record<string, unknown>;
    if (
      (candidate.kind !== 'DOSSIER' && candidate.kind !== 'SIGNALEMENT') ||
      typeof candidate.id !== 'string' ||
      !UUID_PATTERN.test(candidate.id) ||
      (candidate.occurredAt !== null && typeof candidate.occurredAt !== 'string') ||
      (candidate.kind === 'DOSSIER' && candidate.occurredAt === null) ||
      (candidate.viewport !== null &&
        (!Array.isArray(candidate.viewport) ||
          candidate.viewport.length !== 4 ||
          candidate.viewport.some((value) => typeof value !== 'number' || !Number.isFinite(value))))
    ) {
      throw new Error('invalid cursor fields');
    }
    if (candidate.occurredAt === null) {
      return {
        occurredAt: null,
        kind: candidate.kind,
        id: candidate.id,
        viewport: candidate.viewport as [number, number, number, number] | null,
      };
    }
    const date = new Date(candidate.occurredAt);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== candidate.occurredAt) {
      throw new Error('invalid cursor timestamp');
    }
    return {
      occurredAt: date.toISOString(),
      kind: candidate.kind,
      id: candidate.id,
      viewport: candidate.viewport as [number, number, number, number] | null,
    };
  } catch {
    throw new BadRequestException('Le curseur cartographique est invalide. Rechargez la carte pour recommencer.');
  }
}

function encodeMapCursor(
  feature: {
    occurredAt: Date | null;
    kind: 'DOSSIER' | 'SIGNALEMENT';
    id: string;
  },
  viewport: [number, number, number, number] | null,
): string {
  const payload: MapCursor = {
    occurredAt: feature.occurredAt?.toISOString() ?? null,
    kind: feature.kind,
    id: feature.id,
    viewport,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function compareMapFeatures(
  left: { occurredAt: Date | null; kind: 'DOSSIER' | 'SIGNALEMENT'; id: string },
  right: { occurredAt: Date | null; kind: 'DOSSIER' | 'SIGNALEMENT'; id: string },
): number {
  if (left.occurredAt === null && right.occurredAt !== null) return 1;
  if (right.occurredAt === null && left.occurredAt !== null) return -1;
  const leftTime = left.occurredAt?.getTime() ?? 0;
  const rightTime = right.occurredAt?.getTime() ?? 0;
  if (leftTime !== rightTime) return rightTime - leftTime;
  if (left.kind !== right.kind) return left.kind === 'DOSSIER' ? -1 : 1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
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

    const limit = Math.min(250, Math.max(1, query.limit ?? 150));
    const cursor = decodeMapCursor(query.cursor);
    const viewportSignature: [number, number, number, number] | null = hasViewport
      ? [query.minLat!, query.maxLat!, query.minLon!, query.maxLon!]
      : null;
    if (cursor && JSON.stringify(cursor.viewport) !== JSON.stringify(viewportSignature)) {
      throw new BadRequestException('Le curseur cartographique ne correspond pas au viewport courant. Rechargez la carte.');
    }
    const minLat = query.minLat!;
    const maxLat = query.maxLat!;
    const minLon = query.minLon!;
    const maxLon = query.maxLon!;
    const cursorDate = cursor?.occurredAt ? new Date(cursor.occurredAt) : null;
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
    const viewportCaseWhere: Prisma.DossierTraitementWhereInput | undefined = hasViewport
      ? {
          latitude: { gte: minLat, lte: maxLat },
          ...(minLon <= maxLon
            ? { longitude: { gte: minLon, lte: maxLon } }
            : {
                OR: [
                  { longitude: { gte: minLon } },
                  { longitude: { lte: maxLon } },
                ],
              }),
        }
      : undefined;
    const viewportReportWhere: Prisma.SignalementWhereInput | undefined = hasViewport
      ? {
          latitude: { gte: minLat, lte: maxLat },
          ...(minLon <= maxLon
            ? { longitude: { gte: minLon, lte: maxLon } }
            : {
                OR: [
                  { longitude: { gte: minLon } },
                  { longitude: { lte: maxLon } },
                ],
              }),
        }
      : undefined;

    const cursorCaseWhere: Prisma.DossierTraitementWhereInput | undefined = cursor
      ? cursor.kind === 'DOSSIER' && cursorDate
        ? {
            OR: [
              { dateCreationDossier: { lt: cursorDate } },
              {
                AND: [
                  { dateCreationDossier: { equals: cursorDate } },
                  { idDossier: { lt: cursor.id } },
                ],
              },
            ],
          }
        : cursorDate
          ? { dateCreationDossier: { lt: cursorDate } }
          : { idDossier: { in: [] } }
      : undefined;
    const cursorReportWhere: Prisma.SignalementWhereInput | undefined = cursor
      ? cursor.kind === 'DOSSIER' && cursorDate
        ? {
            OR: [
              { dateSoumission: { lte: cursorDate } },
              { dateSoumission: null },
            ],
          }
        : cursor.kind === 'SIGNALEMENT' && cursorDate
          ? {
              OR: [
                { dateSoumission: { lt: cursorDate } },
                {
                  AND: [
                    { dateSoumission: { equals: cursorDate } },
                    { idSignalement: { lt: cursor.id } },
                  ],
                },
                { dateSoumission: null },
              ],
            }
          : cursor.kind === 'SIGNALEMENT'
            ? {
                AND: [
                  { dateSoumission: null },
                  { idSignalement: { lt: cursor.id } },
                ],
              }
            : { dateSoumission: null }
      : undefined;

    const mapCaseWhere: Prisma.DossierTraitementWhereInput = {
      ...locatedCaseWhere,
      ...(viewportCaseWhere ? { AND: [viewportCaseWhere] } : {}),
    };
    const mapReportWhere: Prisma.SignalementWhereInput = {
      ...locatedReportWhere,
      ...(viewportReportWhere ? { AND: [viewportReportWhere] } : {}),
    };
    const mapCasePageFilters = [viewportCaseWhere, cursorCaseWhere].filter(
      (filter): filter is Prisma.DossierTraitementWhereInput => filter !== undefined,
    );
    const mapReportPageFilters = [viewportReportWhere, cursorReportWhere].filter(
      (filter): filter is Prisma.SignalementWhereInput => filter !== undefined,
    );
    const mapCasePageWhere: Prisma.DossierTraitementWhereInput = {
      ...locatedCaseWhere,
      ...(mapCasePageFilters.length ? { AND: mapCasePageFilters } : {}),
    };
    const mapReportPageWhere: Prisma.SignalementWhereInput = {
      ...locatedReportWhere,
      ...(mapReportPageFilters.length ? { AND: mapReportPageFilters } : {}),
    };

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
        where: pendingVerificationWhere(),
      }),
      this.prisma.dossierTraitement.count({ where: locatedCaseWhere }),
      this.prisma.signalement.count({ where: locatedReportWhere }),
      this.prisma.dossierTraitement.count({ where: missingCaseLocationWhere }),
      this.prisma.signalement.count({ where: missingReportLocationWhere }),
      this.prisma.dossierTraitement.count({ where: mapCaseWhere }),
      this.prisma.signalement.count({ where: mapReportWhere }),
      this.prisma.dossierTraitement.findMany({
        where: mapCasePageWhere,
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
        where: mapReportPageWhere,
        orderBy: [{ dateSoumission: { sort: 'desc', nulls: 'last' } }, { idSignalement: 'desc' }],
        take: limit + 1,
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
    const orderedItems = [...caseFeatures, ...reportFeatures]
      .sort(compareMapFeatures)
      .slice(0, limit + 1);
    const hasMore = orderedItems.length > limit;
    const mapItems = orderedItems.slice(0, limit);
    const lastItem = mapItems[mapItems.length - 1];
    const nextCursor = hasMore && lastItem ? encodeMapCursor(lastItem, viewportSignature) : null;

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
        truncated: hasMore,
        limit,
        hasMore,
        nextCursor,
      },
      generatedAt: new Date(),
    };
  }
}
