import { Prisma } from '../../generated/prisma/client.js';

export type BusinessAuditAction =
  | 'STATUT_SIGNALEMENT_TRANSITION'
  | 'DOSSIER_CREE'
  | 'DOSSIER_PRIORITE_MODIFIEE'
  | 'DOSSIER_LOCALISATION_MODIFIEE'
  | 'SIGNALEMENT_RATTACHE'
  | 'SIGNALEMENT_DETACHE'
  | 'DEMANDE_COMPLEMENT_CREEE'
  | 'SIGNALEMENT_QUALIFIE'
  | 'SIGNALEMENT_REJETE'
  | 'SIGNALEMENT_SOUMIS'
  | 'DEMANDE_COMPLEMENT_REPONDUE'
  | 'AFFECTATION_CREEE'
  | 'AFFECTATION_ACCEPTEE'
  | 'AFFECTATION_REFUSEE'
  | 'AFFECTATION_REAFFECTEE'
  | 'INTERVENTION_DEMARREE'
  | 'INTERVENTION_SOUMISE'
  | 'VERIFICATION_CONFORME'
  | 'VERIFICATION_REPRISE'
  | 'DOSSIER_CLOTURE'
  | 'ROLE_ATTRIBUE'
  | 'ROLE_REVOQUE'
  | 'PHOTO_SIGNALEMENT_AJOUTEE'
  | 'PHOTO_INTERVENTION_AJOUTEE'
  | 'PHOTO_SIGNALEMENT_PURGEE'
  | 'PHOTO_INTERVENTION_PURGEE'
  | 'TYPE_DECHET_CREE'
  | 'TYPE_DECHET_MODIFIE'
  | 'EQUIPE_CREEE'
  | 'EQUIPE_MODIFIEE'
  | 'APPARTENANCE_EQUIPE_AJOUTEE'
  | 'APPARTENANCE_EQUIPE_TERMINEE'
  | 'COMPETENCE_EQUIPE_AJOUTEE'
  | 'COMPETENCE_EQUIPE_TERMINEE';

export type BusinessAuditEntity =
  | 'DOSSIER'
  | 'SIGNALEMENT'
  | 'AFFECTATION'
  | 'INTERVENTION'
  | 'VERIFICATION'
  | 'UTILISATEUR'
  | 'REFERENTIEL'
  | 'EQUIPE'
  | 'APPARTENANCE'
  | 'COMPETENCE';

type AuditMetadataValue = string | number | boolean | null;
export type BusinessAuditMetadata = Readonly<Record<string, AuditMetadataValue>>;

export interface BusinessAuditEvent {
  actorId: string | null;
  actionCode: BusinessAuditAction;
  entityType: BusinessAuditEntity;
  entityId: string;
  dossierId?: string | null;
  reason?: string | null;
  metadata?: BusinessAuditMetadata;
}

const ALLOWED_METADATA_KEYS = new Set([
  'previousStatus', 'nextStatus', 'priority', 'reportId', 'teamId',
  'decision', 'result', 'assignmentId', 'interventionId',
]);

function safeMetadata(input: BusinessAuditMetadata | undefined): Record<string, AuditMetadataValue> {
  const output: Record<string, AuditMetadataValue> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      throw new TypeError(`Unsupported business audit metadata key: ${key}`);
    }
    if (
      value !== null &&
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      throw new TypeError(`Unsupported business audit metadata value for key: ${key}`);
    }
    if (typeof value === 'string' && value.length > 128) {
      throw new TypeError(`Business audit metadata value is too long for key: ${key}`);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new TypeError(`Business audit metadata number is not finite for key: ${key}`);
    }
    output[key] = value;
  }
  return output;
}

/** Append an allowlisted event in the same transaction as its business mutation. */
export async function recordBusinessEvent(
  tx: Prisma.TransactionClient,
  event: BusinessAuditEvent,
): Promise<void> {
  const metadata = safeMetadata(event.metadata);
  const reason = event.reason?.trim() || null;
  if (reason && reason.length > 500) {
    throw new TypeError('Business audit reason must not exceed 500 characters.');
  }
  await tx.$executeRaw`
    INSERT INTO audit.evenement_metier (
      actor_id, action_code, entity_type, entity_id, dossier_id, reason,
      metadata
    )
    VALUES (
      ${event.actorId}::uuid,
      ${event.actionCode},
      ${event.entityType},
      ${event.entityId}::uuid,
      ${event.dossierId ?? null}::uuid,
      ${reason},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}


/**
 * Copies pre-dossier report events into the dossier timeline without changing
 * their original immutable rows. A source event can be copied only once per dossier.
 */
export async function associateReportEventsWithCase(
  tx: Prisma.TransactionClient,
  reportId: string,
  dossierId: string,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO audit.evenement_metier (
      occurred_at,
      actor_id,
      action_code,
      entity_type,
      entity_id,
      dossier_id,
      reason,
      correlation_id,
      source_event_id,
      metadata
    )
    SELECT
      source.occurred_at,
      source.actor_id,
      source.action_code,
      source.entity_type,
      source.entity_id,
      ${dossierId}::uuid,
      source.reason,
      source.correlation_id,
      source.id,
      source.metadata
    FROM audit.evenement_metier AS source
    WHERE source.entity_type = 'SIGNALEMENT'
      AND source.entity_id = ${reportId}::uuid
      AND source.dossier_id IS NULL
    ORDER BY source.occurred_at ASC, source.event_sequence ASC
    ON CONFLICT (source_event_id, dossier_id)
      WHERE source_event_id IS NOT NULL
    DO NOTHING
  `;
}
