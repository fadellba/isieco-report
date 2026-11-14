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

type VerificationFilter = 'ALL' | 'TERMINEE' | 'EXCEPTION';

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('fr-FR').trim();
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VerificationFilter>('ALL');

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
  const pageItems = useMemo(() => result?.items ?? [], [result]);
  const orderedItems = useMemo(() => {
    const query = normalizeSearch(search);
    return pageItems.filter((item) => {
      const matchesSearch = !query || normalizeSearch([
        item.affectation.contenuDossier.referenceDossier,
        item.intervention.compteRendu,
        item.intervention.motifException ?? '',
        item.intervention.resultatIntervention,
        item.intervention.renseignePar,
        item.affectation.idAffectation,
      ].join(' ')).includes(query);
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'TERMINEE' && item.intervention.resultatIntervention === 'TERMINEE') ||
        (filter === 'EXCEPTION' && item.intervention.resultatIntervention !== 'TERMINEE');
      return matchesSearch && matchesFilter;
    });
  }, [filter, pageItems, search]);

  const completedCount = pageItems.filter((item) => item.intervention.resultatIntervention === 'TERMINEE').length;
  const exceptionCount = pageItems.length - completedCount;

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
      <header className="overflow-hidden rounded-3xl border border-line-subtle bg-white">
        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-forest">Opérations · Contrôle indépendant</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Vérification des interventions</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-500">
              Examinez le compte rendu et les preuves de la dernière intervention. Validez la résolution ou demandez une reprise motivée. Une intervention ne peut jamais être vérifiée par son propre auteur.
            </p>
          </div>
          <button type="button" onClick={() => void loadQueue()} disabled={loading} className={secondaryClass}>
            {loading ? 'Actualisation…' : 'Actualiser la file'}
          </button>
        </div>
        <div className="grid grid-cols-2 border-t border-line-subtle bg-surface-base sm:grid-cols-3">
          <div className="border-b border-r border-line-subtle p-4 sm:border-b-0">
            <p className="text-xs font-semibold text-ink-500">En attente au total</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{result ? result.total : '—'}</p>
          </div>
          <div className="border-b border-line-subtle p-4 sm:border-b-0 sm:border-r">
            <p className="text-xs font-semibold text-ink-500">Résultats terminés · page</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{result ? completedCount : '—'}</p>
          </div>
          <div className="col-span-2 p-4 sm:col-span-1">
            <p className="text-xs font-semibold text-ink-500">Résultats partiels ou impossibles · page</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{result ? exceptionCount : '—'}</p>
          </div>
        </div>
      </header>

      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}
      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <section className="verification-queue overflow-hidden rounded-2xl border border-line-strong bg-white">
        <div className="border-b border-line-subtle p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink-900">Comptes rendus à examiner</h2>
              <p className="mt-1 text-xs text-ink-500">La recherche et le filtre portent uniquement sur les résultats de la page chargée.</p>
            </div>
            <span className="rounded-full bg-surface-base px-3 py-1.5 text-xs font-bold text-ink-600">{orderedItems.length} résultat(s)</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-ink-600">Rechercher dans les comptes rendus</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Référence, compte rendu, motif ou identifiant…" className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-forest focus:ring-2 focus:ring-brand-mist" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-ink-600">Filtrer le résultat terrain</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as VerificationFilter)} className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm text-ink-800 outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-mist">
                <option value="ALL">Tous les résultats</option>
                <option value="TERMINEE">Terminées</option>
                <option value="EXCEPTION">Partielles ou impossibles</option>
              </select>
            </label>
          </div>
        </div>

        {loading && !result ? <p className="p-5 text-sm text-ink-500">Chargement de la file…</p> : null}
        {!loading && result?.items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-ink-800">Aucun compte rendu en attente</p>
            <p className="mt-1 text-sm text-ink-500">La file est à jour. Les nouvelles interventions soumises apparaîtront ici.</p>
          </div>
        ) : null}
        {!loading && pageItems.length > 0 && orderedItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-bold text-ink-800">Aucun résultat correspondant</p>
            <p className="mt-1 text-sm text-ink-500">Modifiez la recherche ou le filtre appliqué à cette page.</p>
            <button type="button" onClick={() => { setSearch(''); setFilter('ALL'); }} className="mt-3 text-sm font-bold text-brand-forest underline">Effacer les filtres</button>
          </div>
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
          <p className="text-xs text-ink-500">Page {page} sur {totalPages} · {result?.total ?? 0} élément(s) en attente au total</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className={secondaryClass}>Précédent</button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading} className={secondaryClass}>Suivant</button>
          </div>
        </div>
      </section>
    </div>
  );
}
