import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

interface WasteType {
  idTypeDechet: string;
  codeType: string;
  libelle: string;
  description: string | null;
  orientationSpecialisee: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
}

interface Commune {
  idCommune: string;
  codeCommune: string | null;
  nomCommune: string;
  actif: boolean;
}

interface Department {
  idDepartement: string;
  codeDepartement: string | null;
  nomDepartement: string;
  actif: boolean;
  communes: Commune[];
}

interface Region {
  idRegion: string;
  codeRegion: string | null;
  nomRegion: string;
  actif: boolean;
  departements: Department[];
}

interface TeamMember {
  idUtilisateur: string;
  idEquipe: string;
  dateDebut: string;
  dateFin: string | null;
  fonction: string;
  utilisateur: { idUtilisateur: string; nom: string; prenom: string | null; email: string };
}

interface TeamSkill {
  idCompetenceEquipe: string;
  idTypeDechet: string;
  dateDebut: string;
  dateFin: string | null;
  commentaire: string | null;
  typeDechet: { codeType: string; libelle: string };
}

interface TeamDelegation {
  idDelegation: string;
  idUtilisateurDelegue: string;
  dateDebutAppartenance: string;
  typeDecision: string;
  dateDebut: string;
  dateFin: string | null;
  motif: string | null;
  delegue: { idUtilisateur: string; nom: string; prenom: string | null; email: string };
}

interface Availability {
  etatDisponibilite: string;
  dateMiseAJour: string;
  valideJusqua: string;
  commentaire: string | null;
}

interface AvailabilityHistory extends Availability {
  idHistorique?: string;
  auteur?: { idUtilisateur: string; nom: string; prenom: string | null };
}

interface Team {
  idEquipe: string;
  nomEquipe: string;
  description: string | null;
  etatEquipe: string;
  appartenances: TeamMember[];
  competences: TeamSkill[];
  delegations: TeamDelegation[];
  disponibilite: Availability | null;
}

type Section = 'waste-types' | 'geography' | 'teams';

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Une erreur inattendue est survenue.';
}

function isoDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('La date fournie est invalide.');
  return date.toISOString();
}

function localDateTimeNow(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function inputClass(): string {
  return 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-eco-500 focus:ring-2 focus:ring-eco-100';
}

const labelClass = 'block text-xs font-semibold text-slate-600';
const buttonClass = 'rounded-lg bg-eco-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export function ReferentialsPage() {
  const [section, setSection] = useState<Section>('waste-types');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [availabilityHistory, setAvailabilityHistory] = useState<Record<string, AvailabilityHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = includeInactive ? 'true' : 'false';
      const [wasteData, geographyData, teamData] = await Promise.all([
        api.request<WasteType[]>('/referentials/waste-types?includeInactive=' + query),
        api.request<Region[]>('/referentials/regions?includeInactive=' + query),
        api.request<Team[]>('/referentials/teams'),
      ]);
      setWasteTypes(wasteData);
      setRegions(geographyData);
      setTeams(teamData);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const validWasteTypes = useMemo(() => {
    const now = Date.now();
    return wasteTypes.filter((item) => {
      const start = new Date(item.dateDebutValidite).getTime();
      const end = item.dateFinValidite ? new Date(item.dateFinValidite).getTime() : Number.POSITIVE_INFINITY;
      return start <= now && end >= now;
    });
  }, [wasteTypes]);

  async function execute(key: string, action: () => Promise<unknown>, success: string) {
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleRegion(id: string, actif: boolean) {
    await execute(
      'region-' + id,
      () => api.request('/referentials/regions/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !actif }),
      }),
      actif ? 'Région désactivée.' : 'Région réactivée.',
    );
  }

  async function toggleDepartment(id: string, actif: boolean) {
    await execute(
      'department-' + id,
      () => api.request('/referentials/departments/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !actif }),
      }),
      actif ? 'Département désactivé.' : 'Département réactivé.',
    );
  }

  async function toggleCommune(id: string, actif: boolean) {
    await execute(
      'commune-' + id,
      () => api.request('/referentials/communes/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ actif: !actif }),
      }),
      actif ? 'Commune désactivée.' : 'Commune réactivée.',
    );
  }

  async function closeMembership(teamId: string, member: TeamMember) {
    await execute(
      'membership-' + teamId + member.idUtilisateur,
      () => api.request('/referentials/teams/' + teamId + '/memberships/close', {
        method: 'POST',
        body: JSON.stringify({
          idUtilisateur: member.idUtilisateur,
          dateDebut: member.dateDebut,
          dateFin: new Date().toISOString(),
        }),
      }),
      'Appartenance clôturée.',
    );
  }

  async function closeSkill(teamId: string, skill: TeamSkill) {
    await execute(
      'skill-' + skill.idCompetenceEquipe,
      () => api.request('/referentials/teams/' + teamId + '/skills/close', {
        method: 'POST',
        body: JSON.stringify({
          idCompetenceEquipe: skill.idCompetenceEquipe,
          dateFin: new Date().toISOString(),
        }),
      }),
      'Compétence clôturée.',
    );
  }

  async function closeDelegation(teamId: string, delegation: TeamDelegation) {
    await execute(
      'delegation-' + delegation.idDelegation,
      () => api.request('/referentials/teams/' + teamId + '/delegations/' + delegation.idDelegation + '/close', {
        method: 'POST',
        body: JSON.stringify({ dateFin: new Date().toISOString() }),
      }),
      'Délégation clôturée.',
    );
  }

  async function showAvailabilityHistory(teamId: string) {
    setHistoryLoading(teamId);
    setError(null);
    try {
      const result = await api.request<AvailabilityHistory[]>(
        '/referentials/teams/' + teamId + '/availability/history',
      );
      setAvailabilityHistory((current) => ({ ...current, [teamId]: result }));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setHistoryLoading(null);
    }
  }

  async function createWasteType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('create-waste-type', () => api.request('/referentials/waste-types', {
      method: 'POST',
      body: JSON.stringify({
        codeType: String(data.get('codeType')).trim(),
        libelle: String(data.get('libelle')).trim(),
        description: String(data.get('description')).trim() || undefined,
        orientationSpecialisee: data.get('orientationSpecialisee') === 'on',
        dateDebutValidite: isoDateTime(String(data.get('dateDebutValidite'))),
      }),
    }), 'Type de déchet créé.');
    event.currentTarget.reset();
  }

  async function createRegion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('create-region', () => api.request('/referentials/regions', {
      method: 'POST',
      body: JSON.stringify({
        codeRegion: String(data.get('codeRegion')).trim() || undefined,
        nomRegion: String(data.get('nomRegion')).trim(),
        actif: true,
      }),
    }), 'Région créée.');
    event.currentTarget.reset();
  }

  async function createDepartment(event: FormEvent<HTMLFormElement>, regionId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('create-department-' + regionId, () => api.request('/referentials/regions/' + regionId + '/departments', {
      method: 'POST',
      body: JSON.stringify({
        codeDepartement: String(data.get('codeDepartement')).trim() || undefined,
        nomDepartement: String(data.get('nomDepartement')).trim(),
        actif: true,
      }),
    }), 'Département créé.');
    event.currentTarget.reset();
  }

  async function createCommune(event: FormEvent<HTMLFormElement>, departmentId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('create-commune-' + departmentId, () => api.request('/referentials/departments/' + departmentId + '/communes', {
      method: 'POST',
      body: JSON.stringify({
        codeCommune: String(data.get('codeCommune')).trim() || undefined,
        nomCommune: String(data.get('nomCommune')).trim(),
        actif: true,
      }),
    }), 'Commune créée.');
    event.currentTarget.reset();
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('create-team', () => api.request('/referentials/teams', {
      method: 'POST',
      body: JSON.stringify({
        nomEquipe: String(data.get('nomEquipe')).trim(),
        description: String(data.get('description')).trim() || undefined,
        etatEquipe: String(data.get('etatEquipe')).trim(),
      }),
    }), 'Équipe créée.');
    event.currentTarget.reset();
  }

  async function updateTeam(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('update-team-' + teamId, () => api.request('/referentials/teams/' + teamId, {
      method: 'PATCH',
      body: JSON.stringify({
        nomEquipe: String(data.get('nomEquipe')).trim(),
        description: String(data.get('description')).trim(),
        etatEquipe: String(data.get('etatEquipe')).trim(),
      }),
    }), 'Équipe mise à jour.');
  }

  async function addMembership(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('add-membership-' + teamId, () => api.request('/referentials/teams/' + teamId + '/memberships', {
      method: 'POST',
      body: JSON.stringify({
        idUtilisateur: String(data.get('idUtilisateur')).trim(),
        dateDebut: isoDateTime(String(data.get('dateDebut'))),
        fonction: String(data.get('fonction')).trim(),
      }),
    }), 'Membre ajouté à l’équipe.');
    event.currentTarget.reset();
  }

  async function addSkill(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('add-skill-' + teamId, () => api.request('/referentials/teams/' + teamId + '/skills', {
      method: 'POST',
      body: JSON.stringify({
        idTypeDechet: String(data.get('idTypeDechet')),
        dateDebut: isoDateTime(String(data.get('dateDebut'))),
        commentaire: String(data.get('commentaire')).trim() || undefined,
      }),
    }), 'Compétence ajoutée à l’équipe.');
    event.currentTarget.reset();
  }

  async function setAvailability(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('availability-' + teamId, () => api.request('/referentials/teams/' + teamId + '/availability', {
      method: 'PUT',
      body: JSON.stringify({
        etatDisponibilite: String(data.get('etatDisponibilite')),
        valideJusqua: isoDateTime(String(data.get('valideJusqua'))),
        commentaire: String(data.get('commentaire')).trim() || undefined,
      }),
    }), 'Disponibilité de l’équipe mise à jour.');
  }

  async function addDelegation(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const membershipKey = String(data.get('membership'));
    const separator = membershipKey.indexOf('|');
    const idUtilisateurDelegue = membershipKey.slice(0, separator);
    const dateDebutAppartenance = membershipKey.slice(separator + 1);
    await execute('add-delegation-' + teamId, () => api.request('/referentials/teams/' + teamId + '/delegations', {
      method: 'POST',
      body: JSON.stringify({
        idUtilisateurDelegue,
        dateDebutAppartenance,
        typeDecision: String(data.get('typeDecision')).trim(),
        dateDebut: isoDateTime(String(data.get('dateDebut'))),
        dateFin: String(data.get('dateFin')).trim() ? isoDateTime(String(data.get('dateFin'))) : undefined,
        motif: String(data.get('motif')).trim() || undefined,
      }),
    }), 'Délégation créée.');
    event.currentTarget.reset();
  }

  async function updateWasteType(event: FormEvent<HTMLFormElement>, wasteType: WasteType) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('edit-waste-' + wasteType.idTypeDechet, () => api.request('/referentials/waste-types/' + wasteType.idTypeDechet, {
      method: 'PATCH',
      body: JSON.stringify({
        libelle: String(data.get('libelle')).trim(),
        description: String(data.get('description')).trim(),
        orientationSpecialisee: data.get('orientationSpecialisee') === 'on',
      }),
    }), 'Type de déchet mis à jour.');
  }

  async function closeWasteType(event: FormEvent<HTMLFormElement>, wasteType: WasteType) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await execute('close-waste-' + wasteType.idTypeDechet, () => api.request('/referentials/waste-types/' + wasteType.idTypeDechet + '/close', {
      method: 'POST',
      body: JSON.stringify({ dateFinValidite: isoDateTime(String(data.get('dateFinValidite'))) }),
    }), 'Période de validité clôturée.');
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Administration des données de référence</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Référentiels</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Gérez les types de déchets, les subdivisions géographiques et les équipes. Les mutations sont validées et journalisées par l’API.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-eco-700 focus:ring-eco-500"
          />
          Afficher les références inactives / expirées
        </label>
      </header>

      {notice ? <div role="status" className="rounded-xl border border-eco-200 bg-eco-50 px-4 py-3 text-sm text-eco-900">{notice}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <nav className="flex flex-wrap gap-2" aria-label="Sections des référentiels">
        {([
          ['waste-types', 'Types de déchets'],
          ['geography', 'Géographie'],
          ['teams', 'Équipes'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            aria-pressed={section === value}
            className={section === value
              ? 'rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white'
              : 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50'}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={() => void load()} disabled={loading} className={secondaryButtonClass}>
          {loading ? 'Actualisation…' : 'Actualiser'}
        </button>
      </nav>

      {loading ? <p className="text-sm text-slate-500">Chargement des référentiels…</p> : null}

      {section === 'waste-types' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Types de déchets</h2>
                <p className="mt-1 text-xs text-slate-500">{wasteTypes.length} référence(s)</p>
              </div>
            </div>
            {wasteTypes.length === 0 ? <p className="p-5 text-sm text-slate-500">Aucun type de déchet disponible.</p> : (
              <div className="divide-y divide-slate-100">
                {wasteTypes.map((item) => (
                  <article key={item.idTypeDechet} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{item.libelle}</h3>
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">{item.codeType}</span>
                          {item.orientationSpecialisee ? <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">Orientation spécialisée</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.description || 'Aucune description.'}</p>
                        <p className="mt-2 text-xs text-slate-400">Validité : {dateLabel(item.dateDebutValidite)} → {dateLabel(item.dateFinValidite)}</p>
                      </div>
                      {item.dateFinValidite
                        ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Clôturé</span>
                        : <span className="rounded-full bg-eco-50 px-2.5 py-1 text-[10px] font-bold text-eco-800">Sans date de fin</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <details className="min-w-[min(100%,280px)]">
                        <summary className="cursor-pointer text-xs font-semibold text-eco-700">Modifier les attributs</summary>
                        <form onSubmit={(event) => void updateWasteType(event, item)} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3">
                          <label className={labelClass}>Libellé<input name="libelle" required maxLength={255} defaultValue={item.libelle} className={inputClass()} /></label>
                          <label className={labelClass}>Description<textarea name="description" maxLength={2000} defaultValue={item.description || ''} rows={2} className={inputClass()} /></label>
                          <label className="flex items-center gap-2 text-xs text-slate-600"><input name="orientationSpecialisee" type="checkbox" defaultChecked={item.orientationSpecialisee} /> Orientation spécialisée</label>
                          <button type="submit" disabled={busyKey === 'edit-waste-' + item.idTypeDechet} className={buttonClass}>Enregistrer</button>
                        </form>
                      </details>
                      {!item.dateFinValidite ? (
                        <details>
                          <summary className="cursor-pointer rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800">Clôturer la validité</summary>
                          <form onSubmit={(event) => void closeWasteType(event, item)} className="mt-3 grid gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                            <label className={labelClass}>Date de fin<input type="date" name="dateFinValidite" required min={item.dateDebutValidite.slice(0, 10)} className={inputClass()} /></label>
                            <button type="submit" className={buttonClass}>Confirmer la clôture</button>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Nouveau type</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Le code reste stable après création. Seuls le libellé, la description et l’orientation sont modifiables.</p>
            <form onSubmit={(event) => void createWasteType(event)} className="mt-4 space-y-3">
              <label className={labelClass}>Code<input name="codeType" required maxLength={80} className={inputClass()} placeholder="PLASTIQUE" /></label>
              <label className={labelClass}>Libellé<input name="libelle" required maxLength={255} className={inputClass()} /></label>
              <label className={labelClass}>Description<textarea name="description" maxLength={2000} rows={3} className={inputClass()} /></label>
              <label className={labelClass}>Début de validité<input name="dateDebutValidite" required type="datetime-local" defaultValue={localDateTimeNow()} className={inputClass()} /></label>
              <label className="flex items-center gap-2 text-xs text-slate-600"><input name="orientationSpecialisee" type="checkbox" /> Orientation spécialisée</label>
              <button type="submit" disabled={busyKey === 'create-waste-type'} className={buttonClass}>Créer le type</button>
            </form>
          </section>
        </div>
      ) : null}

      {section === 'geography' ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Ajouter une région</h2>
            <form onSubmit={(event) => void createRegion(event)} className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
              <label className={labelClass}>Code (facultatif)<input name="codeRegion" maxLength={30} className={inputClass()} /></label>
              <label className={labelClass}>Nom de la région<input name="nomRegion" required maxLength={150} className={inputClass()} /></label>
              <button type="submit" disabled={busyKey === 'create-region'} className={buttonClass}>Créer</button>
            </form>
          </section>

          <section className="space-y-3">
            {regions.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Aucune région disponible.</p> : regions.map((region) => (
              <article key={region.idRegion} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">{region.nomRegion}</h2>
                    <p className="mt-1 text-xs text-slate-500">{region.codeRegion || 'Sans code'} · {region.departements.length} département(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={region.actif ? 'rounded-full bg-eco-50 px-2.5 py-1 text-[10px] font-bold text-eco-800' : 'rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600'}>{region.actif ? 'Active' : 'Inactive'}</span>
                    <button type="button" onClick={() => void toggleRegion(region.idRegion, region.actif)} disabled={busyKey === 'region-' + region.idRegion} className={secondaryButtonClass}>{region.actif ? 'Désactiver' : 'Réactiver'}</button>
                  </div>
                </div>
                {region.actif ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-semibold text-eco-700">Ajouter un département</summary>
                    <form onSubmit={(event) => void createDepartment(event, region.idRegion)} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                      <label className={labelClass}>Code<input name="codeDepartement" maxLength={30} className={inputClass()} /></label>
                      <label className={labelClass}>Nom du département<input name="nomDepartement" required maxLength={150} className={inputClass()} /></label>
                      <button type="submit" className={buttonClass}>Ajouter</button>
                    </form>
                  </details>
                ) : null}
                <div className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
                  {region.departements.map((department) => (
                    <div key={department.idDepartement} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{department.nomDepartement}</h3>
                          <p className="mt-0.5 text-[11px] text-slate-500">{department.codeDepartement || 'Sans code'} · {department.communes.length} commune(s)</p>
                        </div>
                        <button type="button" onClick={() => void toggleDepartment(department.idDepartement, department.actif)} disabled={busyKey === 'department-' + department.idDepartement} className={secondaryButtonClass}>{department.actif ? 'Désactiver' : 'Réactiver'}</button>
                      </div>
                      {department.actif && region.actif ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-semibold text-eco-700">Ajouter une commune</summary>
                          <form onSubmit={(event) => void createCommune(event, department.idDepartement)} className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                            <label className={labelClass}>Code<input name="codeCommune" maxLength={30} className={inputClass()} /></label>
                            <label className={labelClass}>Nom de la commune<input name="nomCommune" required maxLength={150} className={inputClass()} /></label>
                            <button type="submit" className={buttonClass}>Ajouter</button>
                          </form>
                        </details>
                      ) : null}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {department.communes.map((commune) => (
                          <div key={commune.idCommune} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-700">{commune.nomCommune}</p>
                              <p className="text-[10px] text-slate-400">{commune.codeCommune || 'Sans code'}</p>
                            </div>
                            <button type="button" onClick={() => void toggleCommune(commune.idCommune, commune.actif)} disabled={busyKey === 'commune-' + commune.idCommune} className="shrink-0 text-[10px] font-bold text-eco-700">{commune.actif ? 'Désactiver' : 'Réactiver'}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>
      ) : null}

      {section === 'teams' ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Créer une équipe</h2>
            <form onSubmit={(event) => void createTeam(event)} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className={labelClass}>Nom<input name="nomEquipe" required maxLength={150} className={inputClass()} /></label>
              <label className={labelClass}>État métier<input name="etatEquipe" required maxLength={50} defaultValue="ACTIVE" className={inputClass()} /></label>
              <label className={labelClass + ' sm:col-span-2'}>Description<input name="description" maxLength={2000} className={inputClass()} /></label>
              <div className="sm:col-span-2 lg:col-span-4"><button type="submit" className={buttonClass}>Créer l’équipe</button></div>
            </form>
          </section>

          {teams.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Aucune équipe enregistrée.</p> : teams.map((team) => {
            const memberOptions = team.appartenances.map((member) => ({
              key: member.idUtilisateur + '|' + member.dateDebut,
              label: (member.utilisateur.prenom ? member.utilisateur.prenom + ' ' : '') + member.utilisateur.nom,
            }));
            return (
              <article key={team.idEquipe} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">{team.nomEquipe}</h2>
                    <p className="mt-1 text-xs text-slate-500">{team.etatEquipe} · {team.appartenances.length} membre(s) actif(s) · {team.competences.length} compétence(s) active(s)</p>
                    <p className="mt-1 text-sm text-slate-600">{team.description || 'Aucune description.'}</p>
                  </div>
                  <span className="break-all rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">{team.idEquipe}</span>
                </header>

                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-eco-700">Modifier l’équipe</summary>
                  <form onSubmit={(event) => void updateTeam(event, team.idEquipe)} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
                    <label className={labelClass}>Nom<input name="nomEquipe" required maxLength={150} defaultValue={team.nomEquipe} className={inputClass()} /></label>
                    <label className={labelClass}>État<input name="etatEquipe" required maxLength={50} defaultValue={team.etatEquipe} className={inputClass()} /></label>
                    <label className={labelClass}>Description<input name="description" maxLength={2000} defaultValue={team.description || ''} className={inputClass()} /></label>
                    <div className="sm:col-span-3"><button type="submit" disabled={busyKey === 'update-team-' + team.idEquipe} className={buttonClass}>Enregistrer</button></div>
                  </form>
                </details>

                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Membres</h3>
                      <span className="text-xs text-slate-400">{team.appartenances.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {team.appartenances.map((member) => (
                        <div key={member.idUtilisateur + member.dateDebut} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{member.utilisateur.prenom ? member.utilisateur.prenom + ' ' : ''}{member.utilisateur.nom}</p>
                            <p className="text-[10px] text-slate-500">{member.fonction} · depuis {dateLabel(member.dateDebut)}</p>
                            <p className="text-[10px] text-slate-400">{member.utilisateur.email}</p>
                          </div>
                          <button type="button" onClick={() => void closeMembership(team.idEquipe, member)} disabled={busyKey === 'membership-' + team.idEquipe + member.idUtilisateur} className="text-[10px] font-bold text-red-700">Clôturer</button>
                        </div>
                      ))}
                      {!team.appartenances.length ? <p className="text-xs text-slate-500">Aucun membre actif.</p> : null}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-eco-700">Ajouter un membre</summary>
                      <form onSubmit={(event) => void addMembership(event, team.idEquipe)} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                        <label className={labelClass}>UUID du compte métier<input name="idUtilisateur" required pattern="[0-9a-fA-F-]{36}" title="Saisir un UUID de compte valide." className={inputClass()} /></label>
                        <p className="text-[10px] leading-4 text-slate-500">L'API vérifie l'existence et l'état actif du compte. Le rôle du navigateur ne donne aucun droit supplémentaire.</p>
                        <label className={labelClass}>Fonction<input name="fonction" required maxLength={100} className={inputClass()} placeholder="Agent terrain" /></label>
                        <label className={labelClass}>Début<input name="dateDebut" required type="datetime-local" defaultValue={localDateTimeNow()} className={inputClass()} /></label>
                        <button type="submit" disabled={busyKey === 'add-membership-' + team.idEquipe} className={buttonClass}>Ajouter le membre</button>
                      </form>
                    </details>
                  </section>

                  <section className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Compétences</h3>
                      <span className="text-xs text-slate-400">{team.competences.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {team.competences.map((skill) => (
                        <div key={skill.idCompetenceEquipe} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{skill.typeDechet.libelle} <span className="font-mono text-[10px] text-slate-400">({skill.typeDechet.codeType})</span></p>
                            <p className="text-[10px] text-slate-500">Depuis {dateLabel(skill.dateDebut)}{skill.commentaire ? ' · ' + skill.commentaire : ''}</p>
                          </div>
                          <button type="button" onClick={() => void closeSkill(team.idEquipe, skill)} disabled={busyKey === 'skill-' + skill.idCompetenceEquipe} className="text-[10px] font-bold text-red-700">Clôturer</button>
                        </div>
                      ))}
                      {!team.competences.length ? <p className="text-xs text-slate-500">Aucune compétence active.</p> : null}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-eco-700">Ajouter une compétence</summary>
                      <form onSubmit={(event) => void addSkill(event, team.idEquipe)} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                        <label className={labelClass}>Type de déchet
                          <select name="idTypeDechet" required className={inputClass()} defaultValue="">
                            <option value="" disabled>Sélectionner une référence active</option>
                            {validWasteTypes.map((item) => <option key={item.idTypeDechet} value={item.idTypeDechet}>{item.libelle} ({item.codeType})</option>)}
                          </select>
                        </label>
                        <label className={labelClass}>Début<input name="dateDebut" required type="datetime-local" defaultValue={localDateTimeNow()} className={inputClass()} /></label>
                        <label className={labelClass}>Commentaire<input name="commentaire" maxLength={1000} className={inputClass()} /></label>
                        <button type="submit" disabled={!validWasteTypes.length || busyKey === 'add-skill-' + team.idEquipe} className={buttonClass}>Ajouter la compétence</button>
                      </form>
                    </details>
                  </section>

                  <section className="rounded-xl border border-slate-100 p-4">
                    <h3 className="text-sm font-bold text-slate-800">Disponibilité</h3>
                    {team.disponibilite ? (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3">
                        <p className="text-sm font-bold text-slate-800">{team.disponibilite.etatDisponibilite}</p>
                        <p className="mt-1 text-[10px] text-slate-500">Valide jusqu’au {dateLabel(team.disponibilite.valideJusqua)}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{team.disponibilite.commentaire || 'Aucun commentaire.'}</p>
                      </div>
                    ) : <p className="mt-3 text-xs text-slate-500">Disponibilité non renseignée.</p>}
                    <form onSubmit={(event) => void setAvailability(event, team.idEquipe)} className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className={labelClass}>État
                        <select name="etatDisponibilite" defaultValue={team.disponibilite?.etatDisponibilite || 'DISPONIBLE'} className={inputClass()}>
                          <option value="DISPONIBLE">DISPONIBLE</option>
                          <option value="INDISPONIBLE">INDISPONIBLE</option>
                        </select>
                      </label>
                      <label className={labelClass}>Valide jusqu'au<input name="valideJusqua" type="datetime-local" required defaultValue={localDateTimeNow()} className={inputClass()} /></label>
                      <label className={labelClass + ' sm:col-span-2'}>Commentaire<input name="commentaire" maxLength={1000} defaultValue={team.disponibilite?.commentaire || ''} className={inputClass()} /></label>
                      <div className="sm:col-span-2"><button type="submit" disabled={busyKey === 'availability-' + team.idEquipe} className={buttonClass}>Enregistrer la disponibilité</button></div>
                    </form>
                    <button type="button" onClick={() => void showAvailabilityHistory(team.idEquipe)} disabled={historyLoading === team.idEquipe} className="mt-3 text-xs font-semibold text-eco-700">
                      {historyLoading === team.idEquipe ? 'Chargement…' : 'Voir l’historique des disponibilités'}
                    </button>
                    {availabilityHistory[team.idEquipe] ? (
                      <div className="mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                        {availabilityHistory[team.idEquipe].map((entry, index) => (
                          <div key={entry.idHistorique || entry.dateMiseAJour + index} className="text-[10px] text-slate-500">
                            <span className="font-bold text-slate-700">{entry.etatDisponibilite}</span> · {dateLabel(entry.dateMiseAJour)} · valable jusqu'au {dateLabel(entry.valideJusqua)}
                          </div>
                        ))}
                        {!availabilityHistory[team.idEquipe].length ? <p className="text-xs text-slate-500">Aucun historique.</p> : null}
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Délégations actives</h3>
                      <span className="text-xs text-slate-400">{team.delegations.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {team.delegations.map((delegation) => (
                        <div key={delegation.idDelegation} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{delegation.delegue.prenom ? delegation.delegue.prenom + ' ' : ''}{delegation.delegue.nom}</p>
                            <p className="text-[10px] text-slate-500">{delegation.typeDecision} · depuis {dateLabel(delegation.dateDebut)}</p>
                            <p className="text-[10px] text-slate-400">{delegation.motif || 'Sans motif renseigné'}</p>
                          </div>
                          <button type="button" onClick={() => void closeDelegation(team.idEquipe, delegation)} disabled={busyKey === 'delegation-' + delegation.idDelegation} className="text-[10px] font-bold text-red-700">Clôturer</button>
                        </div>
                      ))}
                      {!team.delegations.length ? <p className="text-xs text-slate-500">Aucune délégation active.</p> : null}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-eco-700">Créer une délégation</summary>
                      {memberOptions.length ? (
                        <form onSubmit={(event) => void addDelegation(event, team.idEquipe)} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                          <label className={labelClass}>Membre bénéficiaire
                            <select name="membership" required defaultValue="" className={inputClass()}>
                              <option value="" disabled>Sélectionner un membre actif</option>
                              {team.appartenances.map((member) => (
                                <option key={member.idUtilisateur + member.dateDebut} value={member.idUtilisateur + '|' + member.dateDebut}>
                                  {(member.utilisateur.prenom ? member.utilisateur.prenom + ' ' : '') + member.utilisateur.nom}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className={labelClass}>Type de décision<input name="typeDecision" required maxLength={50} className={inputClass()} placeholder="Code métier défini par l’organisation" /></label>
                          <label className={labelClass}>Début de délégation<input name="dateDebut" required type="datetime-local" defaultValue={localDateTimeNow()} className={inputClass()} /></label>
                          <label className={labelClass}>Fin (facultative)<input name="dateFin" type="datetime-local" className={inputClass()} /></label>
                          <label className={labelClass}>Motif<input name="motif" maxLength={1000} className={inputClass()} /></label>
                          <button type="submit" disabled={busyKey === 'add-delegation-' + team.idEquipe} className={buttonClass}>Créer la délégation</button>
                        </form>
                      ) : <p className="mt-3 text-xs text-slate-500">Ajoutez d’abord un membre actif à cette équipe.</p>}
                    </details>
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
