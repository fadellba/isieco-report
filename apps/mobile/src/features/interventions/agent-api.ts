import { api } from '../../lib/api';

export interface AgentTeam {
  idEquipe: string;
  nomEquipe: string;
  etatEquipe: string;
  dateDebut: string;
  fonction: string;
}

export interface TeamAssignment {
  idAffectation: string;
  idDossier: string;
  idTypeDechet: string;
  idEquipe: string;
  dateHeureAffectation: string;
  etatAffectation: string;
  decisionEquipe: string;
  motif: string | null;
  motifRefusEquipe: string | null;
  observation: string | null;
  equipe: { idEquipe: string; nomEquipe: string; etatEquipe: string };
  contenuDossier: {
    idDossier: string;
    idTypeDechet: string;
    etatContenuDossier: string;
    etatPriseEnCharge: string;
    dossier: { referenceDossier: string; statutDossier: string };
    typeDechet: { codeType: string; libelle: string };
  };
}

export interface TeamIntervention {
  idIntervention: string;
  idAffectation: string;
  dateHeureDebut: string | null;
  dateHeureFin: string | null;
  dateSoumissionCompteRendu: string | null;
  statutIntervention: 'EN_COURS' | 'SOUMISE';
  resultatIntervention: 'TERMINEE' | 'PARTIELLE' | 'IMPOSSIBLE' | null;
  compteRendu: string | null;
  motifException: string | null;
  renseignePar: string;
  affectation: {
    idAffectation: string;
    idEquipe: string;
    etatAffectation: string;
    decisionEquipe: string;
    contenuDossier: {
      idDossier: string;
      idTypeDechet: string;
      etatContenuDossier: string;
      etatPriseEnCharge: string;
      dossier: { referenceDossier: string; statutDossier: string };
      typeDechet: { codeType: string; libelle: string };
    };
    verifications: Array<{ dateVerification: string; etatVerification: 'VALIDEE' | 'REPRISE' }>;
  };
}

export interface MobileAgentProfile {
  utilisateurId: string;
  roles: Array<{ code: string; libelle?: string }>;
}

export async function getAgentProfile(): Promise<MobileAgentProfile> {
  return api.request<MobileAgentProfile>('/accounts/me');
}

export async function listMyTeams(): Promise<AgentTeam[]> {
  return api.request<AgentTeam[]>('/interventions/my-teams');
}

export async function listTeamAssignments(teamId: string): Promise<TeamAssignment[]> {
  return api.request<TeamAssignment[]>('/assignments/team/' + encodeURIComponent(teamId));
}

export async function listTeamInterventions(teamId: string): Promise<TeamIntervention[]> {
  return api.request<TeamIntervention[]>('/interventions/team/' + encodeURIComponent(teamId));
}

export async function respondToAssignment(
  assignmentId: string,
  decisionEquipe: 'ACCEPTEE' | 'REFUSEE',
  motifRefusEquipe?: string,
  observation?: string,
) {
  return api.request('/assignments/' + encodeURIComponent(assignmentId) + '/response', {
    method: 'POST',
    body: JSON.stringify({
      decisionEquipe,
      ...(motifRefusEquipe ? { motifRefusEquipe } : {}),
      ...(observation ? { observation } : {}),
    }),
  });
}

export async function startIntervention(assignmentId: string) {
  return api.request('/interventions/assignments/' + encodeURIComponent(assignmentId) + '/start', {
    method: 'POST',
  });
}

export async function submitIntervention(
  interventionId: string,
  payload: { resultatIntervention: 'TERMINEE' | 'PARTIELLE' | 'IMPOSSIBLE'; compteRendu: string; motifException?: string },
) {
  return api.request('/interventions/' + encodeURIComponent(interventionId) + '/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface InterventionPhotoUploadResponse {
  idPhoto: string;
  description: string | null;
  contextePhoto: string;
  dateAjout: string;
}

export async function uploadInterventionPhoto(
  interventionId: string,
  photo: { uri: string; name: string; type: string },
  contextePhoto: string,
  description?: string,
): Promise<InterventionPhotoUploadResponse> {
  const body = new FormData();
  body.append('file', photo as unknown as Blob);
  body.append('contextePhoto', contextePhoto.trim());
  if (description?.trim()) body.append('description', description.trim());
  return api.request<InterventionPhotoUploadResponse>(
    '/interventions/' + encodeURIComponent(interventionId) + '/photos',
    { method: 'POST', body },
  );
}


export interface InterventionPhotoUploadResponse {
  idPhoto: string;
  description: string | null;
  contextePhoto: string;
  dateAjout: string;
}

export async function uploadInterventionPhoto(
  interventionId: string,
  photo: { uri: string; name: string; type: string },
  contextePhoto: string,
  description?: string,
): Promise<InterventionPhotoUploadResponse> {
  const body = new FormData();
  body.append('file', photo as unknown as Blob);
  body.append('contextePhoto', contextePhoto.trim());
  if (description?.trim()) body.append('description', description.trim());
  return api.request<InterventionPhotoUploadResponse>(
    '/interventions/' + encodeURIComponent(interventionId) + '/photos',
    { method: 'POST', body },
  );
}
