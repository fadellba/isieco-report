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
