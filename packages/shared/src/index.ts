export type Identifier = string;

export const FUNCTIONAL_ROLE_CODES = [
  'CITOYEN',
  'AGENT_QUALIFICATION',
  'RESPONSABLE_TRAITEMENT',
  'RESPONSABLE_AFFECTATION',
  'AGENT_TERRAIN',
  'VERIFICATEUR_CLOTURE',
  'GESTIONNAIRE_REFERENTIEL',
  'ADMINISTRATEUR_COMPTES',
] as const;

export type FunctionalRole = (typeof FUNCTIONAL_ROLE_CODES)[number];

export interface AccountRole {
  code: FunctionalRole;
  libelle: string;
}

export interface AuthenticatedProfile {
  utilisateurId: Identifier;
  authUserId: Identifier;
  nom: string;
  prenom: string | null;
  email: string;
  telephone: string | null;
  referenceAvatar: string | null;
  dateInscription: string;
  etatCompte: string;
  roles: AccountRole[];
}

export interface AccountListResponse {
  items: AuthenticatedProfile[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

/**
 * Public lifecycle codes for citizen reports.
 * These strings are persisted in the relational model; changing one requires
 * a backward-compatible data migration and updates to all clients.
 */
export const REPORT_STATUS_CODES = [
  'SOUMIS',
  'EN_ATTENTE_COMPLEMENT',
  'COMPLEMENT_REPONDU',
  'QUALIFIE',
  'REJETE',
] as const;

export type ReportStatus = (typeof REPORT_STATUS_CODES)[number];

export const SUPPLEMENT_REQUEST_STATUS_CODES = ['OUVERTE', 'REPONDUE', 'CLOTUREE'] as const;

export type SupplementRequestStatus = (typeof SUPPLEMENT_REQUEST_STATUS_CODES)[number];

export const QUALIFICATION_STATE_CODES = ['RETENU', 'RETIRE'] as const;

export type QualificationState = (typeof QUALIFICATION_STATE_CODES)[number];

/** Persisted case lifecycle codes used by the first case-management slice. */
export const CASE_STATUS_CODES = ['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE'] as const;
export type CaseStatus = (typeof CASE_STATUS_CODES)[number];

export const CASE_PRIORITY_CODES = ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'] as const;
export type CasePriority = (typeof CASE_PRIORITY_CODES)[number];

export const CASE_CONTENT_STATUS_CODES = ['ACTIF', 'RETIRE'] as const;
export type CaseContentStatus = (typeof CASE_CONTENT_STATUS_CODES)[number];

export const CASE_CONTENT_HANDLING_STATUS_CODES = ['EN_ATTENTE', 'EN_COURS', 'TERMINE'] as const;
export type CaseContentHandlingStatus = (typeof CASE_CONTENT_HANDLING_STATUS_CODES)[number];

export const REPORT_ATTACHMENT_TYPE_CODES = ['INITIAL', 'ASSOCIATION'] as const;
export type ReportAttachmentType = (typeof REPORT_ATTACHMENT_TYPE_CODES)[number];

export const CASE_CONTENT_ORIGIN_CODES = ['QUALIFICATION'] as const;
export type CaseContentOrigin = (typeof CASE_CONTENT_ORIGIN_CODES)[number];

/** Persisted lifecycle and team response codes for operational assignments. */
export const ASSIGNMENT_STATUS_CODES = ['ACTIVE', 'TERMINEE', 'ANNULEE'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUS_CODES)[number];

export const ASSIGNMENT_TEAM_DECISION_CODES = ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'] as const;
export type AssignmentTeamDecision = (typeof ASSIGNMENT_TEAM_DECISION_CODES)[number];

/** Persisted intervention lifecycle and field-result codes. */
export const INTERVENTION_STATUS_CODES = ['EN_COURS', 'SOUMISE'] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUS_CODES)[number];

export const INTERVENTION_RESULT_CODES = ['TERMINEE', 'PARTIELLE', 'IMPOSSIBLE'] as const;
export type InterventionResult = (typeof INTERVENTION_RESULT_CODES)[number];

/** Verification uses REPRISE to explicitly authorize another field intervention. */
export const VERIFICATION_STATE_CODES = ['VALIDEE', 'REPRISE'] as const;
export type VerificationState = (typeof VERIFICATION_STATE_CODES)[number];

export const VERIFICATION_RESULT_CODES = ['CONFORME', 'A_REPRENDRE'] as const;
export type VerificationResult = (typeof VERIFICATION_RESULT_CODES)[number];
