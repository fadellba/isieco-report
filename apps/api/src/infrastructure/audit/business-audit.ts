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
  | 'ROLE_REVOQUE';

export type BusinessAuditEntity =
  | 'DOSSIER'
  | 'SIGNALEMENT'
  | 'AFFECTATION'
  | 'INTERVENTION'
  | 'VERIFICATION'
  | 'UTILISATEUR';

type AuditMetadataValue = string | number | boolean | null;
export type BusinessAuditMetadata = Readonly<Record<string, AuditMetadataValue>>;

export interface BusinessAuditEvent {
  actorId: string | null;
  actionCode: BusinessAuditAction;
  entityType: BusinessAuditEntity;
  entityId: string;
  dossierId?: string | null;
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
  await tx.$executeRaw`
    INSERT INTO audit.evenement_metier (
      actor_id, action_code, entity_type, entity_id, dossier_id,
      metadata
    )
    VALUES (
      ${event.actorId}::uuid,
      ${event.actionCode},
      ${event.entityType},
      ${event.entityId}::uuid,
      ${event.dossierId ?? null}::uuid,
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}
