import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

interface Team {
  idEquipe: string;
  nomEquipe: string;
  etatEquipe: string;
  competence: { idCompetenceEquipe: string; dateDebut: string; dateFin: string | null };
  disponibilite: { etatDisponibilite: string; valideJusqua: string } | null;
}

interface PendingContent {
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
  competence: { idCompetenceEquipe: string; dateDebut: string; dateFin: string | null };
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

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-eco-500 focus:ring-2 focus:ring-eco-100';
const labelClass = 'block text-xs font-semibold text-slate-600';
const buttonClass = 'rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export function AssignmentsPage() {
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
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedContent = useMemo(
    () => pendingContents.find((item) => item.idDossier + '|' + item.idTypeDechet === selectedContentKey) ?? null,
    [pendingContents, selectedContentKey],
  );
  const createTeams = selectedContent ? eligibleByType[selectedContent.idTypeDechet] ?? [] : [];

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (etatAffectation) params.set('etatAffectation', etatAffectation);
      if (decisionEquipe) params.set('decisionEquipe', decisionEquipe);
      const [assignments, contents] = await Promise.all([
        api.request<Page<Assignment>>('/assignments?' + params.toString()),
        api.request<Page<PendingContent>>('/assignments/pending-contents?page=1&pageSize=100'),
      ]);
      setResult(assignments);
      setPendingContents(contents.items);
      setSelectedContentKey((current) =>
        current || (contents.items[0] ? contents.items[0].idDossier + '|' + contents.items[0].idTypeDechet : ''),
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [page, etatAffectation, decisionEquipe]);

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
          idDossier: selectedContent.idDossier,
          idTypeDechet: selectedContent.idTypeDechet,
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
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Pilotage opérationnel</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Affectations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Affectez chaque catégorie d’un dossier à une équipe compétente. L’API revalide l’éligibilité et protège les opérations contre les doublons et les décisions concurrentes.
        </p>
      </header>

      {notice ? <div role="status" className="rounded-xl border border-eco-200 bg-eco-50 px-4 py-3 text-sm text-eco-900">{notice}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">Nouvelle affectation</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Seuls les contenus actifs en attente, non déjà affectés et rattachés à un dossier ouvert sont proposés.</p>
          </div>
          <span className="rounded-full bg-eco-50 px-3 py-1 text-xs font-bold text-eco-800">{pendingContents.length} contenu(s) disponible(s)</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className={labelClass}>Contenu du dossier
            <select value={selectedContentKey} onChange={(event) => { setSelectedContentKey(event.target.value); setSelectedTeamId(''); }} disabled={!pendingContents.length} className={inputClass}>
              <option value="">Sélectionner un contenu</option>
              {pendingContents.map((item) => (
                <option key={item.idDossier + item.idTypeDechet} value={item.idDossier + '|' + item.idTypeDechet}>
                  {item.dossier.referenceDossier} · {item.typeDechet.libelle} ({item.typeDechet.codeType})
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>Équipe éligible
            <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} disabled={!selectedContent || teamsLoadingFor === selectedContent.idTypeDechet || !createTeams.length} className={inputClass}>
              <option value="">Sélectionner une équipe</option>
              {createTeams.map((team) => (
                <option key={team.idEquipe} value={team.idEquipe}>
                  {team.nomEquipe} · {team.disponibilite && new Date(team.disponibilite.valideJusqua).getTime() < Date.now() ? 'Disponibilité expirée' : team.disponibilite?.etatDisponibilite ?? 'Disponibilité non renseignée'}
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
        {selectedContent && !createTeams.length && teamsLoadingFor !== selectedContent.idTypeDechet
          ? <p className="mt-3 text-xs text-amber-700">Aucune équipe active ne possède une compétence valide et une disponibilité compatible pour ce type.</p>
          : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">Une clé idempotente est conservée pour éviter les doublons lors d’une nouvelle tentative.</p>
          <button type="button" onClick={() => void createAssignment()} disabled={!selectedContent || !selectedTeamId || busyKey === 'create'} className={buttonClass}>
            {busyKey === 'create' ? 'Enregistrement…' : 'Créer l’affectation'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-bold text-slate-900">Historique des affectations</h2><p className="mt-1 text-xs text-slate-500">{result ? result.total + ' affectation(s)' : 'Chargement…'}</p></div>
          <div className="flex flex-wrap gap-2">
            <select value={etatAffectation} onChange={(event) => { setPage(1); setEtatAffectation(event.target.value); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <option value="">Tous les états</option><option value="ACTIVE">ACTIVE</option><option value="TERMINEE">TERMINEE</option><option value="ANNULEE">ANNULEE</option>
            </select>
            <select value={decisionEquipe} onChange={(event) => { setPage(1); setDecisionEquipe(event.target.value); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <option value="">Toutes les décisions</option><option value="EN_ATTENTE">EN_ATTENTE</option><option value="ACCEPTEE">ACCEPTEE</option><option value="REFUSEE">REFUSEE</option>
            </select>
            <button type="button" onClick={() => void loadAssignments()} disabled={loading} className={secondaryClass}>Actualiser</button>
          </div>
        </div>
        {loading && !result ? <p className="p-6 text-sm text-slate-500">Chargement…</p> : null}
        {!loading && result?.items.length === 0 ? <p className="p-6 text-sm text-slate-500">Aucune affectation pour ces filtres.</p> : null}
        <div className="divide-y divide-slate-100">
          {result?.items.map((item) => {
            const canReassign = item.decisionEquipe === 'REFUSEE' || (item.dateFinAffectation === null && item.decisionEquipe === 'EN_ATTENTE');
            const teams = eligibleByType[item.idTypeDechet] ?? [];
            return (
              <article key={item.idAffectation} className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{item.contenuDossier.dossier.referenceDossier} · {item.contenuDossier.typeDechet.libelle}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.equipe.nomEquipe} · affectée le {dateLabel(item.dateHeureAffectation)}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.motif || 'Aucun motif initial.'}</p>
                    {item.decisionEquipe === 'REFUSEE' && item.motifRefusEquipe ? <p className="mt-1 text-xs text-red-700">Refus : {item.motifRefusEquipe}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">{item.etatAffectation}</span>
                    <span className={item.decisionEquipe === 'REFUSEE' ? 'rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-800' : 'rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800'}>{item.decisionEquipe}</span>
                  </div>
                </div>
                {canReassign ? (
                  <div>
                    <button type="button" onClick={() => void openReassign(item)} className={secondaryClass}>
                      {reassignOpen[item.idAffectation] ? 'Masquer la réaffectation' : 'Réaffecter à une autre équipe'}
                    </button>
                    {reassignOpen[item.idAffectation] ? (
                      <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className={secondaryClass}>Précédent</button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading} className={secondaryClass}>Suivant</button>
          </div>
        </div>
      </section>
    </div>
  );
}
