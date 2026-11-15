import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge, type StatusTone } from '../../components/StatusBadge';

interface Team {
  idEquipe: string;
  nomEquipe: string;
  etatEquipe: string;
}

interface PendingContent {
  idContenuDossier: string;
  idDossier: string;
  idTypeDechet: string;
  etatContenuDossier: string;
  etatPriseEnCharge: string;
  dossier: { idDossier: string; referenceDossier: string; statutDossier: string; priorite: string };
  typeDechet: { idTypeDechet: string; codeType: string; libelle: string };
}

interface Assignment {
  idAffectation: string;
  idDossier: string;
  idTypeDechet: string;
  idEquipe: string;
  idCompetenceEquipe: string;
  dateHeureAffectation: string;
  etatAffectation: string;
  motif: string | null;
  observation: string | null;
  dateFinAffectation: string | null;
  decisionEquipe: string;
  dateReponseEquipe: string | null;
  motifRefusEquipe: string | null;
  equipe: { idEquipe: string; nomEquipe: string; etatEquipe: string };
  competence: { idCompetenceEquipe: string; actif: boolean; dateAttribution: string };
  contenuDossier: {
    idDossier: string;
    idTypeDechet: string;
    etatContenuDossier: string;
    etatPriseEnCharge: string;
    dossier: { referenceDossier: string; statutDossier: string };
    typeDechet: { idTypeDechet: string; codeType: string; libelle: string };
  };
}

interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
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

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

const inputClass = 'mt-1 w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink-800 outline-none transition focus:border-eco-500 focus:ring-2 focus:ring-eco-100';
const labelClass = 'block text-xs font-semibold text-ink-500';
const buttonClass = 'rounded-lg bg-brand-forest px-4 py-2.5 text-xs font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass = 'rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-ink-500 transition hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-50';

function assignmentStateTone(status: string): StatusTone {
  if (status === 'TERMINEE') return 'success';
  if (status === 'ANNULEE') return 'danger';
  if (status === 'ACTIVE') return 'info';
  return 'neutral';
}

function teamDecisionTone(decision: string): StatusTone {
  if (decision === 'ACCEPTEE') return 'success';
  if (decision === 'REFUSEE') return 'danger';
  if (decision === 'EN_ATTENTE') return 'warning';
  return 'neutral';
}

function stateLabel(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase();
}

export function AssignmentsPage() {
  const [searchParams] = useSearchParams();
  const dossierFilter = searchParams.get('idDossier')?.trim() ?? '';
  const [result, setResult] = useState<Page<Assignment> | null>(null);
  const [pendingContents, setPendingContents] = useState<PendingContent[]>([]);
  const [selectedContentKey, setSelectedContentKey] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [eligibleByType, setEligibleByType] = useState<Record<string, Team[]>>({});
  const [teamsLoadingFor, setTeamsLoadingFor] = useState<string | null>(null);
  const [createKey, setCreateKey] = useState(newIdempotencyKey);
  const [createReason, setCreateReason] = useState('');
  const [createObservation, setCreateObservation] = useState('');
  const [reassignOpen, setReassignOpen] = useState<Record<string, boolean>>({});
  const [reassignTeam, setReassignTeam] = useState<Record<string, string>>({});
  const [reassignReason, setReassignReason] = useState<Record<string, string>>({});
  const [reassignKeys, setReassignKeys] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [etatAffectation, setEtatAffectation] = useState('');
  const [decisionEquipe, setDecisionEquipe] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedContent = useMemo(
    () => pendingContents.find((item) => item.idContenuDossier === selectedContentKey) ?? null,
    [pendingContents, selectedContentKey],
  );
  const createTeams = selectedContent ? eligibleByType[selectedContent.idTypeDechet] ?? [] : [];
  const visibleAssignments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR');
    if (!query || !result) return result?.items ?? [];
    return result.items.filter((item) => [
      item.contenuDossier.dossier.referenceDossier,
      item.contenuDossier.typeDechet.libelle,
      item.equipe.nomEquipe,
      item.motif ?? '',
      item.observation ?? '',
      item.motifRefusEquipe ?? '',
    ].join(' ').toLocaleLowerCase('fr-FR').includes(query));
  }, [result, search]);
  const waitingCount = result?.items.filter((item) => item.decisionEquipe === 'EN_ATTENTE').length ?? 0;
  const refusedCount = result?.items.filter((item) => item.decisionEquipe === 'REFUSEE').length ?? 0;
  const acceptedCount = result?.items.filter((item) => item.decisionEquipe === 'ACCEPTEE').length ?? 0;

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (etatAffectation) params.set('etatAffectation', etatAffectation);
      if (decisionEquipe) params.set('decisionEquipe', decisionEquipe);
      if (dossierFilter) params.set('idDossier', dossierFilter);
      const [assignments, contents] = await Promise.all([
        api.request<Page<Assignment>>('/assignments?' + params.toString()),
        api.request<Page<PendingContent>>('/assignments/pending-contents?page=1&pageSize=100' +
          (dossierFilter ? '&idDossier=' + encodeURIComponent(dossierFilter) : '')),
      ]);
      setResult(assignments);
      setPendingContents(contents.items);
      setSelectedContentKey((current) =>
        contents.items.some((item) => item.idContenuDossier === current)
          ? current
          : contents.items[0]?.idContenuDossier ?? '',
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [page, etatAffectation, decisionEquipe, dossierFilter]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const loadEligibleTeams = useCallback(async (idTypeDechet: string) => {
    if (eligibleByType[idTypeDechet]) return eligibleByType[idTypeDechet]!;
    setTeamsLoadingFor(idTypeDechet);
    setError(null);
    try {
      const teams = await api.request<Team[]>('/assignments/eligible-teams/' + idTypeDechet);
      setEligibleByType((current) => ({ ...current, [idTypeDechet]: teams }));
      return teams;
    } catch (reason) {
      setError(errorMessage(reason));
      return [];
    } finally {
      setTeamsLoadingFor(null);
    }
  }, [eligibleByType]);

  useEffect(() => {
    if (!selectedContent) return;
    void loadEligibleTeams(selectedContent.idTypeDechet).then((teams) => {
      setSelectedTeamId((current) => teams.some((team) => team.idEquipe === current) ? current : teams[0]?.idEquipe ?? '');
    });
  }, [selectedContent, loadEligibleTeams]);

  async function createAssignment() {
    if (!selectedContent || !selectedTeamId) {
      setError('Sélectionnez un contenu et une équipe éligible.');
      return;
    }
    if (createReason.trim() && createReason.trim().length < 5) {
      setError('Le motif doit contenir au moins 5 caractères.');
      return;
    }
    setBusyKey('create');
    setError(null);
    setNotice(null);
    try {
      await api.request<Assignment>('/assignments', {
        method: 'POST',
        headers: { 'Idempotency-Key': createKey },
        body: JSON.stringify({
          idContenuDossier: selectedContent.idContenuDossier,
          idEquipe: selectedTeamId,
          ...(createReason.trim() ? { motif: createReason.trim() } : {}),
          ...(createObservation.trim() ? { observation: createObservation.trim() } : {}),
        }),
      });
      setNotice('Affectation créée. L’équipe peut maintenant répondre depuis son espace autorisé.');
      setCreateReason('');
      setCreateObservation('');
      setCreateKey(newIdempotencyKey());
      setSelectedContentKey('');
      setSelectedTeamId('');
      await loadAssignments();
    } catch (reason) {
      const message = errorMessage(reason);
      await loadAssignments();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function openReassign(item: Assignment) {
    const nextOpen = !reassignOpen[item.idAffectation];
    setReassignOpen((current) => ({ ...current, [item.idAffectation]: nextOpen }));
    if (nextOpen) {
      const teams = await loadEligibleTeams(item.idTypeDechet);
      setReassignTeam((current) => ({
        ...current,
        [item.idAffectation]: teams.find((team) => team.idEquipe !== item.idEquipe)?.idEquipe ?? '',
      }));
      setReassignKeys((current) => ({
        ...current,
        [item.idAffectation]: current[item.idAffectation] ?? newIdempotencyKey(),
      }));
    }
  }

  async function reassign(item: Assignment) {
    const id = item.idAffectation;
    const teamId = reassignTeam[id];
    const reason = reassignReason[id]?.trim() ?? '';
    if (!teamId || teamId === item.idEquipe) {
      setError('Sélectionnez une autre équipe éligible.');
      return;
    }
    if (reason.length < 5) {
      setError('Le motif de réaffectation doit contenir au moins 5 caractères.');
      return;
    }
    setBusyKey(id);
    setError(null);
    setNotice(null);
    try {
      await api.request('/assignments/' + id + '/reassign', {
        method: 'POST',
        headers: { 'Idempotency-Key': reassignKeys[id] ?? newIdempotencyKey() },
        body: JSON.stringify({ idEquipe: teamId, motif: reason }),
      });
      setNotice('Réaffectation enregistrée et historisée.');
      setReassignOpen((current) => ({ ...current, [id]: false }));
      setReassignReason((current) => ({ ...current, [id]: '' }));
      setReassignKeys((current) => ({ ...current, [id]: newIdempotencyKey() }));
      await loadAssignments();
    } catch (reason) {
      const message = errorMessage(reason);
      await loadAssignments();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="assignment-workspace">
      <header className="assignment-workspace__hero">
        <div>
          <span className="assignment-workspace__eyebrow">PILOTAGE OPÉRATIONNEL</span>
          <h1>{dossierFilter ? 'Affectations du dossier' : 'Affectations des équipes'}</h1>
          <p>
            {dossierFilter
              ? 'Cette vue est limitée au dossier sélectionné : contenus disponibles, équipe responsable et historique des réponses.'
              : 'Associez chaque contenu de dossier à une équipe compétente, puis suivez sa réponse et les éventuelles réaffectations.'}
          </p>
        </div>
        <div className="assignment-workspace__hero-count">
          <strong>{result ? result.total : '—'}</strong>
          <span>Affectation(s)<br />dans la sélection</span>
        </div>
        {dossierFilter ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-surface-base px-3 py-1 text-xs font-bold text-ink-800">
              Filtre dossier actif
            </span>
            <Link to="/affectations" className="text-xs font-semibold text-brand-forest hover:underline">
              Afficher toutes les affectations
            </Link>
          </div>
        ) : null}
      </header>

      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}
      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <section className="assignment-workspace__summary" aria-label="Synthèse des affectations">
        <article><span>À confirmer</span><strong>{result ? waitingCount : '—'}</strong><small>Décision de l’équipe</small></article>
        <article><span>Acceptées</span><strong>{result ? acceptedCount : '—'}</strong><small>Sur la page affichée</small></article>
        <article><span>Refusées</span><strong>{result ? refusedCount : '—'}</strong><small>À réexaminer si nécessaire</small></article>
      </section>

      <section className="assignment-create-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink-900">Nouvelle affectation</h2>
            <p className="mt-1 text-xs leading-5 text-ink-500">Seuls les contenus actifs en attente, non déjà affectés et rattachés à un dossier ouvert sont proposés.</p>
          </div>
          <span className="rounded-full bg-surface-base px-3 py-1 text-xs font-bold text-ink-800">{pendingContents.length} contenu(s) disponible(s)</span>
        </div>
        <div className="assignment-create-steps" aria-label="Étapes de création">
          <span><b>01</b> Contenu du dossier</span><i />
          <span><b>02</b> Équipe éligible</span><i />
          <span><b>03</b> Créer l’affectation</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className={labelClass}>Contenu du dossier
            <select value={selectedContentKey} onChange={(event) => { setSelectedContentKey(event.target.value); setSelectedTeamId(''); }} disabled={!pendingContents.length} className={inputClass}>
              <option value="">Sélectionner un contenu</option>
              {pendingContents.map((item) => (
                <option key={item.idContenuDossier} value={item.idContenuDossier}>
                  {item.dossier.referenceDossier} · {item.typeDechet.libelle} ({item.typeDechet.codeType})
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>Équipe active et compétente
            <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} disabled={!selectedContent || teamsLoadingFor === selectedContent.idTypeDechet || !createTeams.length} className={inputClass}>
              <option value="">Sélectionner une équipe</option>
              {createTeams.map((team) => (
                <option key={team.idEquipe} value={team.idEquipe}>
                  {team.nomEquipe}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>Motif (facultatif, 5 caractères minimum si renseigné)
            <input value={createReason} onChange={(event) => setCreateReason(event.target.value)} maxLength={2000} className={inputClass} />
          </label>
          <label className={labelClass}>Observation (facultative)
            <input value={createObservation} onChange={(event) => setCreateObservation(event.target.value)} maxLength={2000} className={inputClass} />
          </label>
        </div>
        {selectedContent ? (
          <div className="assignment-create-preview">
            <span className="assignment-create-preview__icon" aria-hidden="true">↳</span>
            <div>
              <strong>{selectedContent.dossier.referenceDossier} · {selectedContent.typeDechet.libelle}</strong>
              <p>Priorité du dossier : {stateLabel(selectedContent.dossier.priorite)} · État du contenu : {stateLabel(selectedContent.etatContenuDossier)}</p>
              {selectedTeamId ? <small>Équipe sélectionnée : {createTeams.find((team) => team.idEquipe === selectedTeamId)?.nomEquipe ?? 'Équipe sélectionnée'}</small> : null}
            </div>
          </div>
        ) : null}
        {selectedContent && !createTeams.length && teamsLoadingFor !== selectedContent.idTypeDechet
          ? <p className="assignment-create-warning">Aucune équipe active ne possède de compétence active pour ce type de déchet. La capacité et le calendrier des équipes ne sont pas encore modélisés.</p>
          : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-ink-400">Une clé idempotente est conservée pour éviter les doublons lors d’une nouvelle tentative.</p>
          <button type="button" onClick={() => void createAssignment()} disabled={!selectedContent || !selectedTeamId || busyKey === 'create'} className={buttonClass}>
            {busyKey === 'create' ? 'Enregistrement…' : 'Créer l’affectation'}
          </button>
        </div>
      </section>

      <section className="assignment-history-panel">
        <div className="assignment-history-panel__header">
          <div><span className="assignment-workspace__eyebrow">SUIVI DES ÉQUIPES</span><h2>Historique des affectations</h2><p>{result ? result.total + ' affectation(s) · ' + result.items.length + ' sur cette page' : 'Chargement…'}</p></div>
        </div>
        <div className="assignment-history-panel__toolbar">
          <label className="assignment-history-search">
            <span>Rechercher sur cette page</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Référence, type de déchet, équipe ou motif…" />
          </label>
          <div className="flex flex-wrap gap-2">
            <select value={etatAffectation} onChange={(event) => { setPage(1); setEtatAffectation(event.target.value); }} aria-label="Filtrer par état de l’affectation" className="rounded-lg border border-line-strong bg-white px-3 py-2 text-xs text-ink-500">
              <option value="">Tous les états</option><option value="ACTIVE">Active</option><option value="TERMINEE">Terminée</option><option value="ANNULEE">Annulée</option>
            </select>
            <select value={decisionEquipe} onChange={(event) => { setPage(1); setDecisionEquipe(event.target.value); }} aria-label="Filtrer par décision de l’équipe" className="rounded-lg border border-line-strong bg-white px-3 py-2 text-xs text-ink-500">
              <option value="">Toutes les décisions</option><option value="EN_ATTENTE">En attente</option><option value="ACCEPTEE">Acceptée</option><option value="REFUSEE">Refusée</option>
            </select>
            <button type="button" onClick={() => void loadAssignments()} disabled={loading} className={secondaryClass}>Actualiser</button>
          </div>
        </div>
        {loading && !result ? <p className="p-6 text-sm text-ink-500">Chargement…</p> : null}
        {!loading && result?.items.length === 0 ? <div className="assignment-history-empty"><strong>Aucune affectation pour ces filtres</strong><p>Modifiez les filtres ou créez une nouvelle affectation à partir d’un contenu disponible.</p></div> : null}
        {!loading && (result?.items.length ?? 0) > 0 && visibleAssignments.length === 0 ? <div className="assignment-history-empty"><strong>Aucun résultat pour cette recherche</strong><p>Essayez une autre référence, équipe ou catégorie.</p><button type="button" onClick={() => setSearch('')}>Effacer la recherche</button></div> : null}
        <div className="assignment-history-list">
          {visibleAssignments.map((item) => {
            const canReassign = item.decisionEquipe === 'REFUSEE' || (item.dateFinAffectation === null && item.decisionEquipe === 'EN_ATTENTE');
            const teams = eligibleByType[item.idTypeDechet] ?? [];
            return (
              <article key={item.idAffectation} className="assignment-history-item">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-ink-900">{item.contenuDossier.dossier.referenceDossier} · {item.contenuDossier.typeDechet.libelle}</h3>
                    <p className="mt-1 text-xs text-ink-500">{item.equipe.nomEquipe} · affectée le {dateLabel(item.dateHeureAffectation)}</p>
                    <p className="mt-1 text-xs text-ink-500">{item.motif || 'Aucun motif initial.'}</p>
                    {item.decisionEquipe === 'REFUSEE' && item.motifRefusEquipe ? <p className="mt-1 text-xs text-red-700">Refus : {item.motifRefusEquipe}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={'Affectation ' + stateLabel(item.etatAffectation)} tone={assignmentStateTone(item.etatAffectation)} />
                    <StatusBadge label={'Équipe ' + stateLabel(item.decisionEquipe)} tone={teamDecisionTone(item.decisionEquipe)} />
                  </div>
                </div>
                {canReassign ? (
                  <div>
                    <button type="button" onClick={() => void openReassign(item)} className={secondaryClass}>
                      {reassignOpen[item.idAffectation] ? 'Masquer la réaffectation' : 'Réaffecter à une autre équipe'}
                    </button>
                    {reassignOpen[item.idAffectation] ? (
                      <div className="mt-3 grid gap-3 rounded-xl bg-surface-base p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className={labelClass}>Nouvelle équipe
                          <select value={reassignTeam[item.idAffectation] ?? ''} onChange={(event) => setReassignTeam((current) => ({ ...current, [item.idAffectation]: event.target.value }))} className={inputClass}>
                            <option value="">Sélectionner</option>
                            {teams.filter((team) => team.idEquipe !== item.idEquipe).map((team) => <option key={team.idEquipe} value={team.idEquipe}>{team.nomEquipe}</option>)}
                          </select>
                        </label>
                        <label className={labelClass}>Motif obligatoire
                          <input value={reassignReason[item.idAffectation] ?? ''} onChange={(event) => setReassignReason((current) => ({ ...current, [item.idAffectation]: event.target.value }))} minLength={5} maxLength={2000} className={inputClass} />
                        </label>
                        <button type="button" onClick={() => void reassign(item)} disabled={busyKey === item.idAffectation} className={buttonClass}>{busyKey === item.idAffectation ? 'Réaffectation…' : 'Confirmer'}</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        <div className="assignment-history-panel__pagination">
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
