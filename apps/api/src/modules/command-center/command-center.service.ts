import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { CommandCenterQueryDto } from './dto/command-center-query.dto.js';
import type { StatisticsPeriod } from './dto/statistics-query.dto.js';
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

  async getStatistics(period: StatisticsPeriod) {
    const now = new Date();
    const start = new Date(now);
    let bucket: 'hour' | 'day' | 'month';
    let interval: '1 hour' | '1 day' | '1 month';

    if (period === 'DAILY') {
      start.setUTCHours(0, 0, 0, 0);
      bucket = 'hour';
      interval = '1 hour';
    } else if (period === 'WEEKLY') {
      start.setUTCHours(0, 0, 0, 0);
      const daysSinceMonday = (start.getUTCDay() + 6) % 7;
      start.setUTCDate(start.getUTCDate() - daysSinceMonday);
      bucket = 'day';
      interval = '1 day';
    } else if (period === 'MONTHLY') {
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(1);
      bucket = 'day';
      interval = '1 day';
    } else if (period === 'SEMIANNUAL') {
      start.setUTCMinutes(0, 0, 0);
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCMonth(start.getUTCMonth() < 6 ? 0 : 6, 1);
      bucket = 'month';
      interval = '1 month';
    } else {
      start.setUTCMinutes(0, 0, 0);
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCMonth(0, 1);
      bucket = 'month';
      interval = '1 month';
    }

    const rows = await this.prisma.$queryRaw<Array<{
      bucketStart: Date;
      signalements: number;
      dossiers: number;
      affectations: number;
      interventions: number;
    }>>(Prisma.sql`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${bucket}, ${start}::timestamptz),
          date_trunc(${bucket}, ${now}::timestamptz),
          ${interval}::interval
        ) AS bucket_start
      ),
      reports AS (
        SELECT date_trunc(${bucket}, date_soumission) AS bucket_start, COUNT(*)::int AS total
        FROM public.signalement
        WHERE date_soumission >= ${start} AND date_soumission <= ${now}
        GROUP BY 1
      ),
      cases AS (
        SELECT date_trunc(${bucket}, date_creation_dossier) AS bucket_start, COUNT(*)::int AS total
        FROM public.dossier_traitement
        WHERE date_creation_dossier >= ${start} AND date_creation_dossier <= ${now}
        GROUP BY 1
      ),
      assignments AS (
        SELECT date_trunc(${bucket}, date_heure_affectation) AS bucket_start, COUNT(*)::int AS total
        FROM public.affectation
        WHERE date_heure_affectation >= ${start} AND date_heure_affectation <= ${now}
        GROUP BY 1
      ),
      interventions AS (
        SELECT date_trunc(${bucket}, date_heure_debut) AS bucket_start, COUNT(*)::int AS total
        FROM public.intervention
        WHERE date_heure_debut >= ${start} AND date_heure_debut <= ${now}
        GROUP BY 1
      )
      SELECT
        buckets.bucket_start AS "bucketStart",
        COALESCE(reports.total, 0)::int AS signalements,
        COALESCE(cases.total, 0)::int AS dossiers,
        COALESCE(assignments.total, 0)::int AS affectations,
        COALESCE(interventions.total, 0)::int AS interventions
      FROM buckets
      LEFT JOIN reports ON reports.bucket_start = buckets.bucket_start
      LEFT JOIN cases ON cases.bucket_start = buckets.bucket_start
      LEFT JOIN assignments ON assignments.bucket_start = buckets.bucket_start
      LEFT JOIN interventions ON interventions.bucket_start = buckets.bucket_start
      ORDER BY buckets.bucket_start ASC
    `);

    const totals = rows.reduce(
      (acc, row) => ({
        signalements: acc.signalements + row.signalements,
        dossiers: acc.dossiers + row.dossiers,
        affectations: acc.affectations + row.affectations,
        interventions: acc.interventions + row.interventions,
      }),
      { signalements: 0, dossiers: 0, affectations: 0, interventions: 0 },
    );
    const verificationsConformes = await this.prisma.verification.count({
      where: {
        resultatVerification: 'CONFORME',
        dateVerification: { gte: start, lte: now },
      },
    });

    return {
      period,
      from: start,
      to: now,
      totals: { ...totals, verificationsConformes },
      series: rows,
    };
  }

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

    type InterventionMapRow = {
      id: string;
      occurredAt: Date | null;
      referenceDossier: string;
      latitude: string;
      longitude: string;
      locationLabel: string | null;
      teamName: string;
      wasteType: string;
    };
    let interventionRows: InterventionMapRow[] = [];
    let locatedInterventionsCount = 0;

    // Unit-test doubles may omit raw-query support. Production Prisma always provides it.
    if (typeof this.prisma.$queryRaw === 'function') {
      const interventionMapFrom = Prisma.sql`
        FROM public.intervention AS intervention
        JOIN public.affectation AS assignment
          ON assignment.id_affectation = intervention.id_affectation
        JOIN public.contenu_dossier AS content
          ON content.id_contenu_dossier = assignment.id_contenu_dossier
        JOIN public.dossier_traitement AS dossier
          ON dossier.id_dossier = content.id_dossier
        JOIN public.equipe AS team
          ON team.id_equipe = assignment.id_equipe
        JOIN public.type_dechet AS waste_type
          ON waste_type.id_type_dechet = content.id_type_dechet
        WHERE intervention.statut_intervention = 'EN_COURS'
          AND assignment.etat_affectation = 'ACTIVE'
          AND assignment.date_fin_affectation IS NULL
          AND assignment.decision_equipe = 'ACCEPTEE'
          AND content.etat_contenu_dossier = 'ACTIF'
          AND content.etat_prise_en_charge = 'EN_COURS'
          AND dossier.statut_dossier <> 'CLOTURE'
          AND dossier.latitude IS NOT NULL
          AND dossier.longitude IS NOT NULL
          ${hasViewport ? Prisma.sql`
            AND dossier.latitude BETWEEN ${minLat} AND ${maxLat}
            AND (
              (${minLon} <= ${maxLon} AND dossier.longitude BETWEEN ${minLon} AND ${maxLon})
              OR
              (${minLon} > ${maxLon} AND (dossier.longitude >= ${minLon} OR dossier.longitude <= ${maxLon}))
            )
          ` : Prisma.empty}
      `;

      const [rows, countRows] = await Promise.all([
        this.prisma.$queryRaw<InterventionMapRow[]>(Prisma.sql`
          SELECT
            intervention.id_intervention AS id,
            intervention.date_heure_debut AS "occurredAt",
            dossier.reference_dossier AS "referenceDossier",
            dossier.latitude::text AS latitude,
            dossier.longitude::text AS longitude,
            dossier.description_localisation AS "locationLabel",
            team.nom_equipe AS "teamName",
            waste_type.libelle AS "wasteType"
          ${interventionMapFrom}
          ORDER BY intervention.date_heure_debut DESC NULLS LAST,
                   intervention.id_intervention DESC
          LIMIT ${limit}
        `),
        this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS total
          ${interventionMapFrom}
        `),
      ]);
      interventionRows = rows;
      locatedInterventionsCount = countRows[0]?.total ?? 0;
    }

    const interventionFeatures = interventionRows.map((item) => ({
      kind: 'INTERVENTION' as const,
      id: item.id,
      title: 'Intervention • ' + item.referenceDossier,
      status: 'EN_COURS',
      priority: null,
      latitude: item.latitude,
      longitude: item.longitude,
      locationLabel: item.locationLabel,
      occurredAt: item.occurredAt,
      teamNames: [item.teamName],
      activeInterventions: 1,
      wasteTypes: [item.wasteType],
    }));
        const totalLocated = mapLocatedReportsCount + locatedInterventionsCount;
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
        interventions: interventionFeatures,
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
