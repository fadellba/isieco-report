import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../app/auth-context';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge, type StatusTone } from '../../components/StatusBadge';

interface VerificationPhoto {
  idPhotoIntervention: string;
  description: string | null;
  dateAjout: string;
  etatPublication: string;
}

interface VerificationItem {
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
      referenceDossier: string;
      statutDossier: string;
    };
  };
  intervention: {
    idIntervention: string;
    dateHeureDebut: string;
    dateSoumissionCompteRendu: string;
    statutIntervention: 'SOUMISE';
    resultatIntervention: 'TERMINEE' | 'PARTIELLE' | 'IMPOSSIBLE';
    compteRendu: string;
    motifException: string | null;
    renseignePar: string;
    photos: VerificationPhoto[];
  };
  derniereVerification: string | null;
}

interface VerificationPageResponse {
  items: VerificationItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface SignedPhotoUrl {
  signedUrl: string;
  expiresInSeconds: number;
}

interface PhotoLink {
  url: string;
  expiresAt: number;
}

interface DecisionResult {
  verification: {
    idVerification: string;
    resultatVerification: 'CONFORME' | 'A_REPRENDRE';
    etatVerification: 'VALIDEE' | 'REPRISE';
    dateVerification: string;
  };
  dossierCloture: boolean;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Une erreur inattendue est survenue.';
}

function dateLabel(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const labelClass = 'block text-xs font-semibold text-ink-500';
const inputClass = 'mt-1 w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink-800 outline-none transition focus:border-eco-500 focus:ring-2 focus:ring-eco-100';
const buttonClass = 'rounded-lg bg-brand-forest px-4 py-2.5 text-xs font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass = 'rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-ink-500 transition hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-50';
const dangerClass = 'rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50';

function interventionResultLabel(result: VerificationItem['intervention']['resultatIntervention']): string {
  if (result === 'TERMINEE') return 'Terminée';
  if (result === 'PARTIELLE') return 'Partielle';
  return 'Impossible';
}

function interventionResultTone(result: VerificationItem['intervention']['resultatIntervention']): StatusTone {
  if (result === 'TERMINEE') return 'success';
  if (result === 'PARTIELLE') return 'warning';
  return 'danger';
}

export function VerificationPage() {
  const { profile } = useAuth();
  const [result, setResult] = useState<VerificationPageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, VerificationItem>>({});
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [validationMotifs, setValidationMotifs] = useState<Record<string, string>>({});
  const [photoLinks, setPhotoLinks] = useState<Record<string, PhotoLink>>({});
  const [photoLoading, setPhotoLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request<VerificationPageResponse>(
        '/verification/pending?page=' + page + '&pageSize=20',
      );
      setResult(data);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const orderedItems = useMemo(() => result?.items ?? [], [result]);

  async function openDetails(item: VerificationItem) {
    const id = item.affectation.idAffectation;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setError(null);
    try {
      const detail = await api.request<VerificationItem>('/verification/assignments/' + id);
      setDetails((current) => ({ ...current, [id]: detail }));
    } catch (reason) {
      setError(errorMessage(reason));
      setExpandedId(null);
    }
  }

  async function loadPhoto(item: VerificationItem, photo: VerificationPhoto) {
    const assignmentId = item.affectation.idAffectation;
    const key = photo.idPhotoIntervention;
    const cached = photoLinks[key];
    if (cached && cached.expiresAt > Date.now() + 5000) return;

    setPhotoLoading(key);
    setError(null);
    try {
      const response = await api.request<SignedPhotoUrl>(
        '/verification/assignments/' + assignmentId + '/photos/' + key + '/url',
      );
      const expiresAt = Date.now() + response.expiresInSeconds * 1000;
      setPhotoLinks((current) => ({ ...current, [key]: { url: response.signedUrl, expiresAt } }));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPhotoLoading(null);
    }
  }

  async function decide(item: VerificationItem, resultatVerification: 'CONFORME' | 'A_REPRENDRE') {
    const assignmentId = item.affectation.idAffectation;
    const ownIntervention = item.intervention.renseignePar === profile?.utilisateurId;
    const motif = motifs[assignmentId]?.trim() ?? '';
    const validationMotif = validationMotifs[assignmentId]?.trim() ?? '';

    if (ownIntervention) {
      setError('La séparation des tâches interdit de vérifier sa propre intervention.');
      return;
    }
    if (resultatVerification === 'CONFORME' && item.intervention.resultatIntervention !== 'TERMINEE') {
      setError('Seule une intervention déclarée terminée peut être validée conforme.');
      return;
    }
    if (resultatVerification === 'A_REPRENDRE' && motif.length < 5) {
      setError('Un motif d’au moins 5 caractères est obligatoire pour demander une reprise.');
      return;
    }

    setBusyKey(assignmentId);
    setError(null);
    setNotice(null);
    try {
      const response = await api.request<DecisionResult>(
        '/verification/assignments/' + assignmentId + '/decision',
        {
          method: 'POST',
          body: JSON.stringify({
            resultatVerification,
            ...(resultatVerification === 'A_REPRENDRE' ? { motif } : {}),
            ...(resultatVerification === 'CONFORME' && validationMotif
              ? { motif: validationMotif }
              : {}),
          }),
        },
      );
      setNotice(
        resultatVerification === 'CONFORME'
          ? response.dossierCloture
            ? 'Résolution validée. Tous les contenus actifs sont terminés et le dossier est clôturé.'
            : 'Résolution validée. Le dossier reste ouvert car d’autres contenus actifs sont à traiter.'
          : 'Reprise demandée. L’équipe peut démarrer une nouvelle intervention.',
      );
      setExpandedId(null);
      setDetails((current) => {
        const next = { ...current };
        delete next[assignmentId];
        return next;
      });
      await loadQueue();
    } catch (reason) {
      const message = errorMessage(reason);
      await loadQueue();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-forest">Contrôle indépendant</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">Vérification des interventions</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
          Examinez le compte rendu et les preuves de la dernière intervention. Votre décision valide la résolution ou demande une reprise ; elle ne peut pas porter sur votre propre intervention.
        </p>
      </header>

      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}
      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <section className="verification-queue overflow-hidden rounded-2xl border border-line-strong bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <div>
            <h2 className="font-bold text-ink-900">Comptes rendus à vérifier</h2>
            <p className="mt-1 text-xs text-ink-500">{result ? result.total + ' vérification(s) en attente' : 'Chargement…'}</p>
          </div>
          <button type="button" onClick={() => void loadQueue()} disabled={loading} className={secondaryClass}>
            {loading ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>

        {loading && !result ? <p className="p-5 text-sm text-ink-500">Chargement de la file…</p> : null}
        {!loading && result?.items.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">Aucun compte rendu ne nécessite actuellement de vérification.</p>
        ) : null}

        <div className="divide-y divide-slate-100">
          {orderedItems.map((queueItem) => {
            const id = queueItem.affectation.idAffectation;
            const item = details[id] ?? queueItem;
            const isOpen = expandedId === id;
            const ownIntervention = item.intervention.renseignePar === profile?.utilisateurId;
            const canValidate = item.intervention.resultatIntervention === 'TERMINEE' && !ownIntervention;

            return (
              <article key={id} className="verification-queue-item space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-ink-900">
                      {item.affectation.contenuDossier.referenceDossier}
                    </h3>
                    <p className="mt-1 text-xs text-ink-500">
                      Affectation acceptée · démarrée le {dateLabel(item.intervention.dateHeureDebut)}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Compte rendu soumis le {dateLabel(item.intervention.dateSoumissionCompteRendu)}
                    </p>
                    <p className="mt-2 max-w-3xl line-clamp-2 text-sm text-ink-500">
                      {item.intervention.compteRendu}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={interventionResultLabel(item.intervention.resultatIntervention)}
                      tone={interventionResultTone(item.intervention.resultatIntervention)}
                    />
                    <StatusBadge
                      label={item.affectation.contenuDossier.etatPriseEnCharge.replaceAll('_', ' ').toLowerCase()}
                      tone="neutral"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-500">
                    {item.intervention.photos.length} preuve(s) photo · état du dossier : {item.affectation.contenuDossier.statutDossier}
                  </p>
                  <button type="button" aria-expanded={isOpen} onClick={() => void openDetails(queueItem)} className={secondaryClass}>
                    {isOpen ? 'Masquer le détail' : 'Examiner les preuves et décider'}
                  </button>
                </div>

                {isOpen ? (
                  <div className="space-y-4 rounded-xl border border-line-strong bg-surface-base p-4">
                    {item.intervention.motifException ? (
                      <div>
                        <h4 className="text-xs font-bold text-ink-700">Motif d’exception terrain</h4>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-500">{item.intervention.motifException}</p>
                      </div>
                    ) : null}
                    <div>
                      <h4 className="text-xs font-bold text-ink-700">Compte rendu complet</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-700">{item.intervention.compteRendu}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-ink-700">Preuves photo privées</h4>
                      {ownIntervention ? (
                        <p className="mt-2 text-xs text-amber-800">Les preuves d’une intervention ne sont pas consultables par son propre auteur dans le parcours de vérification.</p>
                      ) : null}
                      {!ownIntervention && !item.intervention.photos.length ? <p className="mt-2 text-xs text-ink-500">Aucune preuve photo jointe.</p> : null}
                      {!ownIntervention ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {item.intervention.photos.map((photo) => {
                          const link = photoLinks[photo.idPhotoIntervention];
                          const activeLink = link && link.expiresAt > Date.now() ? link : null;
                          return (
                            <div key={photo.idPhotoIntervention} className="rounded-lg border border-line-strong bg-white p-3">
                              {activeLink ? (
                                <img
                                  src={activeLink.url}
                                  alt={photo.description || 'Preuve photo de l’intervention'}
                                  referrerPolicy="no-referrer"
                                  className="aspect-video w-full rounded-md bg-surface-soft object-contain"
                                />
                              ) : (
                                <div className="flex aspect-video items-center justify-center rounded-md bg-surface-soft text-xs text-ink-400">
                                  Aperçu non chargé
                                </div>
                              )}
                              <p className="mt-2 text-xs font-semibold text-ink-700">{photo.description || 'Sans description'}</p>
                              <p className="mt-1 text-[10px] text-ink-500">Ajoutée le {dateLabel(photo.dateAjout)}</p>
                              <button
                                type="button"
                                onClick={() => void loadPhoto(item, photo)}
                                disabled={photoLoading === photo.idPhotoIntervention}
                                className="mt-2 text-xs font-bold text-brand-forest disabled:opacity-50"
                              >
                                {photoLoading === photo.idPhotoIntervention ? 'Chargement…' : activeLink ? 'Renouveler le lien' : 'Voir la preuve (60 s)'}
                              </button>
                            </div>
                          );
                        })}
                      </div> : null}
                    </div>

                    {ownIntervention ? (
                      <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                        Séparation des tâches : vous ne pouvez pas vérifier une intervention que vous avez renseignée.
                      </p>
                    ) : (
                      <div className="grid gap-4 border-t border-line-strong pt-4 lg:grid-cols-2">
                        <section className="rounded-lg border border-line-strong bg-white p-3">
                          <h4 className="text-sm font-bold text-ink-800">Valider la résolution</h4>
                          {canValidate ? (
                            <>
                              <label className={labelClass + ' mt-3'}>Motif facultatif
                                <textarea
                                  value={validationMotifs[id] ?? ''}
                                  onChange={(event) => setValidationMotifs((current) => ({ ...current, [id]: event.target.value }))}
                                  maxLength={2000}
                                  rows={3}
                                  className={inputClass}
                                />
                              </label>
                              <button type="button" onClick={() => void decide(item, 'CONFORME')} disabled={busyKey === id} className={buttonClass + ' mt-3'}>
                                {busyKey === id ? 'Enregistrement…' : 'Valider conforme'}
                              </button>
                            </>
                          ) : (
                            <p className="mt-2 text-xs text-amber-800">
                              Une décision conforme n’est autorisée que pour un résultat terrain « TERMINEE ».
                            </p>
                          )}
                        </section>
                        <section className="rounded-lg border border-line-strong bg-white p-3">
                          <h4 className="text-sm font-bold text-ink-800">Demander une reprise</h4>
                          <label className={labelClass + ' mt-3'}>Motif obligatoire (5 caractères minimum)
                            <textarea
                              value={motifs[id] ?? ''}
                              onChange={(event) => setMotifs((current) => ({ ...current, [id]: event.target.value }))}
                              minLength={5}
                              maxLength={2000}
                              rows={3}
                              className={inputClass}
                            />
                          </label>
                          <button type="button" onClick={() => void decide(item, 'A_REPRENDRE')} disabled={busyKey === id} className={dangerClass + ' mt-3'}>
                            {busyKey === id ? 'Enregistrement…' : 'Demander une reprise'}
                          </button>
                        </section>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-line-subtle px-5 py-4">
          <p className="text-xs text-ink-500">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className={secondaryClass}>Précédent</button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading} className={secondaryClass}>Suivant</button>
          </div>
        </div>
      </section>
    </div>
  );
}
