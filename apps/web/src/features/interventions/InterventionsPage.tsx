import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../app/auth-context';
import { api } from '../../lib/api';

interface AgentTeam {
  idEquipe: string;
  nomEquipe: string;
  etatEquipe: string;
  dateDebut: string;
  fonction: string;
}

interface Assignment {
  idAffectation: string;
  idDossier: string;
  idTypeDechet: string;
  idEquipe: string;
  dateHeureAffectation: string;
  etatAffectation: string;
  decisionEquipe: string;
  motif: string | null;
  motifRefusEquipe: string | null;
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

interface Intervention {
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

const labelClass = 'block text-xs font-semibold text-slate-600';
const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-eco-500 focus:ring-2 focus:ring-eco-100';
const buttonClass = 'rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export function InterventionsPage() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [refusalReasons, setRefusalReasons] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingWork, setLoadingWork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const latestByAssignment = useMemo(() => {
    const map = new Map<string, Intervention>();
    for (const intervention of interventions) {
      const current = map.get(intervention.idAffectation);
      if (
        !current ||
        new Date(intervention.dateHeureDebut ?? 0).getTime() >
          new Date(current.dateHeureDebut ?? 0).getTime()
      ) {
        map.set(intervention.idAffectation, intervention);
      }
    }
    return map;
  }, [interventions]);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true);
    setError(null);
    try {
      const result = await api.request<AgentTeam[]>('/interventions/my-teams');
      setTeams(result);
      setSelectedTeamId((current) => result.some((team) => team.idEquipe === current)
        ? current
        : result[0]?.idEquipe ?? '');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const loadWork = useCallback(async () => {
    if (!selectedTeamId) {
      setAssignments([]);
      setInterventions([]);
      return;
    }
    setLoadingWork(true);
    setError(null);
    try {
      const [teamAssignments, teamInterventions] = await Promise.all([
        api.request<Assignment[]>('/assignments/team/' + selectedTeamId),
        api.request<Intervention[]>('/interventions/team/' + selectedTeamId),
      ]);
      setAssignments(teamAssignments);
      setInterventions(teamInterventions);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingWork(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    void loadWork();
  }, [loadWork]);

  async function refreshAfterMutation(message: string) {
    setNotice(message);
    await loadWork();
  }

  async function respond(assignment: Assignment, decisionEquipe: 'ACCEPTEE' | 'REFUSEE') {
    const reason = refusalReasons[assignment.idAffectation]?.trim() ?? '';
    if (decisionEquipe === 'REFUSEE' && reason.length < 5) {
      setError('Le motif de refus doit contenir au moins 5 caractères.');
      return;
    }
    setBusyKey(assignment.idAffectation);
    setError(null);
    setNotice(null);
    try {
      await api.request('/assignments/' + assignment.idAffectation + '/response', {
        method: 'POST',
        body: JSON.stringify({
          decisionEquipe,
          ...(decisionEquipe === 'REFUSEE' ? { motifRefusEquipe: reason } : {}),
          ...(observations[assignment.idAffectation]?.trim()
            ? { observation: observations[assignment.idAffectation].trim() }
            : {}),
        }),
      });
      await refreshAfterMutation(
        decisionEquipe === 'ACCEPTEE' ? 'Mission acceptée par votre équipe.' : 'Mission refusée avec motif.',
      );
    } catch (reason) {
      const message = errorMessage(reason);
      await loadWork();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function start(assignment: Assignment) {
    setBusyKey(assignment.idAffectation);
    setError(null);
    setNotice(null);
    try {
      await api.request('/interventions/assignments/' + assignment.idAffectation + '/start', {
        method: 'POST',
      });
      await refreshAfterMutation('Intervention démarrée. Vous pouvez joindre des preuves et préparer le compte rendu.');
    } catch (reason) {
      const message = errorMessage(reason);
      await loadWork();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function addPhoto(event: FormEvent<HTMLFormElement>, intervention: Intervention) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const selectedFile = data.get('file');
    if (!(selectedFile instanceof File) || selectedFile.size === 0) {
      setError('Sélectionnez une photo valide.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      setError('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    const context = String(data.get('contextePhoto') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    if (context.length < 3 || context.length > 100) {
      setError('Le contexte doit contenir entre 3 et 100 caractères.');
      return;
    }
    setBusyKey('photo-' + intervention.idIntervention);
    setError(null);
    setNotice(null);
    const body = new FormData();
    body.append('file', selectedFile);
    body.append('contextePhoto', context);
    if (description) body.append('description', description);
    try {
      await api.request('/interventions/' + intervention.idIntervention + '/photos', {
        method: 'POST',
        body,
      });
      form.reset();
      await refreshAfterMutation('Preuve photo ajoutée au dossier de l’intervention.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyKey(null);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>, intervention: Intervention) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const resultatIntervention = String(data.get('resultatIntervention'));
    const compteRendu = String(data.get('compteRendu') ?? '').trim();
    const motifException = String(data.get('motifException') ?? '').trim();
    if (compteRendu.length < 20) {
      setError('Le compte rendu doit contenir au moins 20 caractères.');
      return;
    }
    if (resultatIntervention !== 'TERMINEE' && motifException.length < 5) {
      setError('Un motif d’exception d’au moins 5 caractères est obligatoire.');
      return;
    }
    setBusyKey('submit-' + intervention.idIntervention);
    setError(null);
    setNotice(null);
    try {
      await api.request('/interventions/' + intervention.idIntervention + '/submit', {
        method: 'POST',
        body: JSON.stringify({
          resultatIntervention,
          compteRendu,
          ...(motifException ? { motifException } : {}),
        }),
      });
      form.reset();
      await refreshAfterMutation('Compte rendu soumis pour vérification.');
    } catch (reason) {
      const message = errorMessage(reason);
      await loadWork();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  const selectedTeam = teams.find((team) => team.idEquipe === selectedTeamId) ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Opérations de terrain</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Interventions</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Consultez les missions de vos équipes, répondez aux affectations et renseignez les interventions que vous avez démarrées. Les autorisations sont revérifiées par l’API à chaque action.
        </p>
      </header>

      {notice ? <div role="status" className="rounded-xl border border-eco-200 bg-eco-50 px-4 py-3 text-sm text-eco-900">{notice}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className={labelClass}>Équipe active
            <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} disabled={loadingTeams || teams.length === 0} className={inputClass}>
              <option value="">Sélectionner une équipe</option>
              {teams.map((team) => (
                <option key={team.idEquipe} value={team.idEquipe}>
                  {team.nomEquipe} · {team.fonction}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void loadTeams()} disabled={loadingTeams} className={secondaryClass}>
            {loadingTeams ? 'Actualisation…' : 'Actualiser mes équipes'}
          </button>
        </div>
        {selectedTeam ? <p className="mt-3 text-xs text-slate-500">Membre depuis le {dateLabel(selectedTeam.dateDebut)} · {selectedTeam.fonction}</p> : null}
      </section>

      {!loadingTeams && teams.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Aucune appartenance active à une équipe. Contactez le gestionnaire des référentiels si cela ne correspond pas à votre affectation.
        </p>
      ) : null}

      {selectedTeam ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">Missions de {selectedTeam.nomEquipe}</h2>
              <p className="mt-1 text-xs text-slate-500">{assignments.length} affectation(s) active(s)</p>
            </div>
            <button type="button" onClick={() => void loadWork()} disabled={loadingWork} className={secondaryClass}>
              {loadingWork ? 'Actualisation…' : 'Actualiser les missions'}
            </button>
          </div>
          {loadingWork && !assignments.length ? <p className="p-5 text-sm text-slate-500">Chargement des missions…</p> : null}
          {!loadingWork && assignments.length === 0 ? <p className="p-5 text-sm text-slate-500">Aucune affectation active pour cette équipe.</p> : null}
          <div className="divide-y divide-slate-100">
            {assignments.map((assignment) => {
              const latest = latestByAssignment.get(assignment.idAffectation);
              const latestVerification = latest?.affectation.verifications[0] ?? null;
              const isAuthor = latest?.renseignePar === profile?.utilisateurId;
              const canStart = assignment.decisionEquipe === 'ACCEPTEE' && (
                !latest ||
                (latest.statutIntervention === 'SOUMISE' &&
                  latestVerification?.etatVerification === 'REPRISE' &&
                  new Date(latestVerification.dateVerification).getTime() >=
                    new Date(latest.dateSoumissionCompteRendu ?? 0).getTime())
              );
              return (
                <article key={assignment.idAffectation} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{assignment.contenuDossier.dossier.referenceDossier} · {assignment.contenuDossier.typeDechet.libelle}</h3>
                      <p className="mt-1 text-xs text-slate-500">{assignment.equipe.nomEquipe} · affectée le {dateLabel(assignment.dateHeureAffectation)}</p>
                      <p className="mt-1 text-xs text-slate-500">{assignment.motif || 'Aucun motif renseigné.'}</p>
                      {assignment.contenuDossier.dossier.statutDossier ? <p className="mt-1 text-[11px] text-slate-400">Dossier : {assignment.contenuDossier.dossier.statutDossier} · contenu : {assignment.contenuDossier.etatPriseEnCharge}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">{assignment.etatAffectation}</span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">{assignment.decisionEquipe}</span>
                    </div>
                  </div>

                  {assignment.decisionEquipe === 'EN_ATTENTE' ? (
                    <div className="grid gap-3 rounded-xl bg-slate-50 p-4">
                      <label className={labelClass}>Observation (facultative)
                        <input value={observations[assignment.idAffectation] ?? ''} onChange={(event) => setObservations((current) => ({ ...current, [assignment.idAffectation]: event.target.value }))} maxLength={2000} className={inputClass} />
                      </label>
                      <label className={labelClass}>Motif du refus (obligatoire en cas de refus)
                        <textarea value={refusalReasons[assignment.idAffectation] ?? ''} onChange={(event) => setRefusalReasons((current) => ({ ...current, [assignment.idAffectation]: event.target.value }))} minLength={5} maxLength={2000} rows={2} className={inputClass} />
                      </label>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => void respond(assignment, 'REFUSEE')} disabled={busyKey === assignment.idAffectation} className={secondaryClass}>Refuser</button>
                        <button type="button" onClick={() => void respond(assignment, 'ACCEPTEE')} disabled={busyKey === assignment.idAffectation} className={buttonClass}>Accepter la mission</button>
                      </div>
                    </div>
                  ) : null}

                  {latest ? (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Dernière intervention</h4>
                          <p className="mt-1 text-xs text-slate-500">Démarrée le {dateLabel(latest.dateHeureDebut)} · {latest.statutIntervention}</p>
                        </div>
                        {latest.resultatIntervention ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{latest.resultatIntervention}</span> : null}
                      </div>
                      {latest.statutIntervention === 'SOUMISE' ? (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                          <p>Compte rendu soumis le {dateLabel(latest.dateSoumissionCompteRendu)}.</p>
                          {latestVerification?.etatVerification === 'REPRISE'
                            ? <p className="mt-1 font-semibold text-amber-800">Le vérificateur a demandé une reprise. Une nouvelle intervention peut être démarrée.</p>
                            : latestVerification?.etatVerification === 'VALIDEE'
                              ? <p className="mt-1 font-semibold text-eco-800">L’intervention a été validée.</p>
                              : <p className="mt-1">En attente d’une décision de vérification.</p>}
                          {latest.compteRendu ? <p className="mt-2 whitespace-pre-wrap">{latest.compteRendu}</p> : null}
                          {latest.motifException ? <p className="mt-1">Motif : {latest.motifException}</p> : null}
                        </div>
                      ) : null}
                      {latest.statutIntervention === 'EN_COURS' && isAuthor ? (
                        <div className="mt-4 space-y-4">
                          <form onSubmit={(event) => void addPhoto(event, latest)} className="grid gap-3 rounded-lg bg-slate-50 p-3">
                            <h5 className="text-xs font-bold text-slate-700">Ajouter une preuve photo</h5>
                            <label className={labelClass}>Photo (JPEG, PNG ou WebP, 10 MiB maximum)
                              <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className={inputClass} />
                            </label>
                            <label className={labelClass}>Contexte de la photo
                              <input name="contextePhoto" required minLength={3} maxLength={100} className={inputClass} placeholder="Avant collecte, après intervention…" />
                            </label>
                            <label className={labelClass}>Description (facultative)
                              <input name="description" maxLength={500} className={inputClass} />
                            </label>
                            <div className="flex justify-end"><button type="submit" disabled={busyKey === 'photo-' + latest.idIntervention} className={buttonClass}>{busyKey === 'photo-' + latest.idIntervention ? 'Envoi…' : 'Ajouter la preuve'}</button></div>
                          </form>

                          <form onSubmit={(event) => void submitReport(event, latest)} className="grid gap-3 rounded-lg border border-slate-200 p-3">
                            <h5 className="text-xs font-bold text-slate-700">Soumettre le compte rendu</h5>
                            <label className={labelClass}>Résultat
                              <select name="resultatIntervention" defaultValue="TERMINEE" className={inputClass}>
                                <option value="TERMINEE">Terminée</option>
                                <option value="PARTIELLE">Partielle</option>
                                <option value="IMPOSSIBLE">Impossible</option>
                              </select>
                            </label>
                            <label className={labelClass}>Compte rendu (20 caractères minimum)
                              <textarea name="compteRendu" required minLength={20} maxLength={10000} rows={4} className={inputClass} />
                            </label>
                            <label className={labelClass}>Motif d’exception (obligatoire si résultat partiel ou impossible)
                              <textarea name="motifException" minLength={5} maxLength={2000} rows={2} className={inputClass} />
                            </label>
                            <div className="flex justify-end"><button type="submit" disabled={busyKey === 'submit-' + latest.idIntervention} className={buttonClass}>{busyKey === 'submit-' + latest.idIntervention ? 'Soumission…' : 'Soumettre le compte rendu'}</button></div>
                          </form>
                        </div>
                      ) : null}
                      {latest.statutIntervention === 'EN_COURS' && !isAuthor ? (
                        <p className="mt-3 text-xs text-slate-500">Cette intervention a été démarrée par un autre agent de l’équipe. Seul son auteur peut ajouter des preuves ou soumettre le compte rendu.</p>
                      ) : null}
                    </div>
                  ) : null}

                  {canStart && !latest || canStart ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{latest ? 'Une reprise a été demandée par le vérificateur.' : 'L’équipe a accepté cette mission.'}</p>
                      <button type="button" onClick={() => void start(assignment)} disabled={busyKey === assignment.idAffectation} className={buttonClass}>
                        {busyKey === assignment.idAffectation ? 'Démarrage…' : latest ? 'Démarrer la reprise' : 'Démarrer l’intervention'}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
