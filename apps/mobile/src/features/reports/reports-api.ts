import { api } from '../../lib/api';

export interface ReportContent {
  idTypeDechet: string;
  quantiteEstimee: string | null;
  volumeEstime: string | null;
  remarque: string | null;
  typeDechet: { codeType: string; libelle: string };
}

export interface ReportPhoto {
  idPhotoSignalement: string;
  description: string | null;
  dateAjout: string;
  etatPublication: string;
}

export interface Report {
  idSignalement: string;
  dateConstat: string | null;
  dateSoumission: string | null;
  description: string | null;
  idCommune: string | null;
  latitude: string | null;
  longitude: string | null;
  precisionLocalisation: string | null;
  descriptionLocalisation: string | null;
  statutSignalement: string;
  dateDecision: string | null;
  motifDecision: string | null;
  contenus: ReportContent[];
  photos: ReportPhoto[];
}

export interface ReportPage {
  items: Report[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Supplement {
  idDemande: string;
  dateDemande: string;
  motif: string;
  etatDemande: 'OUVERTE' | 'REPONDUE' | 'CLOTUREE';
  reponse: { idReponse: string; dateReponse: string; contenu: string } | null;
}

export interface SupplementList {
  idSignalement: string;
  demandes: Supplement[];
}

export interface CreateReportPayload {
  description: string;
  dateConstat?: string;
  latitude?: number;
  longitude?: number;
  precisionLocalisation?: number;
  descriptionLocalisation?: string;
}

export async function listMyReports(page = 1, pageSize = 20): Promise<ReportPage> {
  return api.request<ReportPage>('/reports?page=' + page + '&pageSize=' + pageSize);
}

export async function getMyReport(id: string): Promise<Report> {
  return api.request<Report>('/reports/' + encodeURIComponent(id));
}

export async function listReportSupplements(id: string): Promise<SupplementList> {
  return api.request<SupplementList>('/reports/' + encodeURIComponent(id) + '/supplements');
}

export async function submitReport(payload: CreateReportPayload, idempotencyKey: string): Promise<Report> {
  return api.request<Report>('/reports', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export async function answerSupplement(id: string, demandId: string, contenu: string) {
  return api.request<{ idReponse: string; idDemande: string; dateReponse: string; contenu: string }>(
    '/reports/' + encodeURIComponent(id) + '/supplements/' + encodeURIComponent(demandId) + '/responses',
    { method: 'POST', body: JSON.stringify({ contenu }) },
  );
}

export function createReportIdempotencyKey(): string {
  return 'report-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
}

export interface ReportPhotoUploadResponse {
  idPhoto: string;
  description: string | null;
  dateAjout: string;
  etatPublication: string;
}

export interface SignedReportPhotoUrl {
  signedUrl: string;
  expiresInSeconds: number;
}

export async function uploadReportPhoto(
  reportId: string,
  photo: { uri: string; name: string; type: string },
  description?: string,
): Promise<ReportPhotoUploadResponse> {
  const body = new FormData();
  body.append('file', photo as unknown as Blob);
  if (description?.trim()) body.append('description', description.trim());
  return api.request<ReportPhotoUploadResponse>(
    '/reports/' + encodeURIComponent(reportId) + '/photos',
    { method: 'POST', body },
  );
}

export async function getReportPhotoUrl(
  reportId: string,
  photoId: string,
): Promise<SignedReportPhotoUrl> {
  return api.request<SignedReportPhotoUrl>(
    '/reports/' + encodeURIComponent(reportId) + '/photos/' + encodeURIComponent(photoId) + '/url',
  );
}
