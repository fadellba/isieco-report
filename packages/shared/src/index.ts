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
