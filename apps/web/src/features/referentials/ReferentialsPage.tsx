import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge } from '../../components/StatusBadge';

interface WasteType {
  idTypeDechet: string;
  codeType: string;
  libelle: string;
  description: string | null;
  actif: boolean;
}

interface TeamMember {
  idUtilisateur: string;
  idEquipe: string;
  dateDebut: string;
  dateFin: string | null;
  fonction: string;
  utilisateur: {
    idUtilisateur: string;
    nom: string;
    prenom: string | null;
    email: string;
    etatCompte: string;
  };
}

interface TeamSkill {
  idCompetenceEquipe: string;
  idTypeDechet: string;
  actif: boolean;
  dateAttribution: string;
  commentaire: string | null;
  typeDechet: { idTypeDechet: string; codeType: string; libelle: string };
}

interface Team {
  idEquipe: string;
  nomEquipe: string;
  description: string | null;
  etatEquipe: string;
  appartenances: TeamMember[];
  competences: TeamSkill[];
}

type PageTab = 'types' | 'teams';

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Une erreur inattendue est survenue.';
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .trim();
}

const inputClass =
  'mt-1 w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-forest focus:ring-2 focus:ring-brand-mist';
const labelClass = 'block text-xs font-semibold text-ink-600';
const buttonClass =
  'inline-flex items-center justify-center rounded-xl bg-brand-forest px-4 py-2.5 text-sm font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass =
  'inline-flex items-center justify-center rounded-xl border border-line-strong bg-white px-3 py-2 text-xs font-bold text-ink-600 transition hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-50';

export function ReferentialsPage() {
  const [tab, setTab] = useState<PageTab>('types');
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [typeCode, setTypeCode] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [typeDescription, setTypeDescription] = useState('');

  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [memberIds, setMemberIds] = useState<Record<string, string>>({});
  const [memberFunctions, setMemberFunctions] = useState<Record<string, string>>({});
  const [skillTypes, setSkillTypes] = useState<Record<string, string>>({});
  const [skillComments, setSkillComments] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [types, teamRows] = await Promise.all([
        api.request<WasteType[]>(
          '/referentials/waste-types?includeInactive=' + String(includeInactive),
        ),
        api.request<Team[]>('/referentials/teams'),
      ]);
      setWasteTypes(types);
      setTeams(teamRows);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  async function execute(
    key: string,
    operation: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await operation();
      setNotice(success);
      await load();
      return true;
    } catch (reason) {
      setError(errorMessage(reason));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function createWasteType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await execute(
      'type-create',
      () =>
        api.request('/referentials/waste-types', {
          method: 'POST',
          body: JSON.stringify({
            codeType: typeCode.trim(),
            libelle: typeLabel.trim(),
            ...(typeDescription.trim() ? { description: typeDescription.trim() } : {}),
          }),
        }),
      'Type de déchet créé.',
    );
    if (created) {
      setTypeCode('');
      setTypeLabel('');
      setTypeDescription('');
      setShowTypeForm(false);
    }
  }

  async function toggleWasteType(item: WasteType) {
    if (
      item.actif &&
      !window.confirm(
        'Désactiver le type « ' +
          item.libelle +
          ' » ? Il ne sera plus proposé pour les nouvelles opérations.',
      )
    )
      return;
    await execute(
      'type-' + item.idTypeDechet,
      () =>
        api.request('/referentials/waste-types/' + item.idTypeDechet, {
          method: 'PATCH',
          body: JSON.stringify({ actif: !item.actif }),
        }),
      item.actif ? 'Type de déchet désactivé.' : 'Type de déchet réactivé.',
    );
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await execute(
      'team-create',
      () =>
        api.request('/referentials/teams', {
          method: 'POST',
          body: JSON.stringify({
            nomEquipe: teamName.trim(),
            ...(teamDescription.trim() ? { description: teamDescription.trim() } : {}),
            etatEquipe: 'ACTIVE',
          }),
        }),
      'Équipe créée.',
    );
    if (created) {
      setTeamName('');
      setTeamDescription('');
      setShowTeamForm(false);
    }
  }

  async function toggleTeam(team: Team) {
    const next = team.etatEquipe === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (
      next === 'INACTIVE' &&
      !window.confirm(
        'Désactiver l’équipe « ' +
          team.nomEquipe +
          ' » ? Elle ne sera plus proposée pour les nouvelles affectations.',
      )
    )
      return;
    await execute(
      'team-' + team.idEquipe,
      () =>
        api.request('/referentials/teams/' + team.idEquipe, {
          method: 'PATCH',
          body: JSON.stringify({ etatEquipe: next }),
        }),
      next === 'ACTIVE' ? 'Équipe réactivée.' : 'Équipe désactivée.',
    );
  }

  async function addMember(teamId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idUtilisateur = memberIds[teamId]?.trim() ?? '';
    const fonction = memberFunctions[teamId]?.trim() ?? '';
    if (!idUtilisateur || !fonction) {
      setError('Identifiant utilisateur et fonction sont obligatoires.');
      return;
    }
    const added = await execute(
      'member-' + teamId,
      () =>
        api.request('/referentials/teams/' + teamId + '/memberships', {
          method: 'POST',
          body: JSON.stringify({ idUtilisateur, dateDebut: new Date().toISOString(), fonction }),
        }),
      'Membre ajouté à l’équipe.',
    );
    if (added) {
      setMemberIds((current) => ({ ...current, [teamId]: '' }));
      setMemberFunctions((current) => ({ ...current, [teamId]: '' }));
    }
  }

  async function removeMember(teamId: string, member: TeamMember) {
    const label =
      (member.utilisateur.prenom ? member.utilisateur.prenom + ' ' : '') + member.utilisateur.nom;
    if (!window.confirm('Clôturer l’appartenance de ' + label + ' à cette équipe ?')) return;
    await execute(
      'member-remove-' + teamId + member.idUtilisateur,
      () =>
        api.request('/referentials/teams/' + teamId + '/memberships/close', {
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

  async function addSkill(teamId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idTypeDechet = skillTypes[teamId] ?? '';
    if (!idTypeDechet) {
      setError('Sélectionnez un type de déchet.');
      return;
    }
    const added = await execute(
      'skill-add-' + teamId,
      () =>
        api.request('/referentials/teams/' + teamId + '/skills', {
          method: 'POST',
          body: JSON.stringify({
            idTypeDechet,
            ...(skillComments[teamId]?.trim() ? { commentaire: skillComments[teamId].trim() } : {}),
          }),
        }),
      'Compétence ajoutée.',
    );
    if (added) {
      setSkillTypes((current) => ({ ...current, [teamId]: '' }));
      setSkillComments((current) => ({ ...current, [teamId]: '' }));
    }
  }

  async function removeSkill(teamId: string, skill: TeamSkill) {
    if (
      !window.confirm(
        'Désactiver la compétence « ' + skill.typeDechet.libelle + ' » pour cette équipe ?',
      )
    )
      return;
    await execute(
      'skill-remove-' + skill.idCompetenceEquipe,
      () =>
        api.request('/referentials/teams/' + teamId + '/skills/close', {
          method: 'POST',
          body: JSON.stringify({ idCompetenceEquipe: skill.idCompetenceEquipe }),
        }),
      'Compétence désactivée.',
    );
  }

  const activeTypes = wasteTypes.filter((item) => item.actif);
  const inactiveTypesCount = wasteTypes.filter((item) => !item.actif).length;
  const activeTeams = teams.filter((team) => team.etatEquipe === 'ACTIVE').length;
  const currentMembers = teams.reduce(
    (total, team) => total + team.appartenances.filter((member) => !member.dateFin).length,
    0,
  );
  const activeSkills = teams.reduce(
    (total, team) => total + team.competences.filter((skill) => skill.actif).length,
    0,
  );

  const filteredTypes = useMemo(() => {
    const query = normalize(search);
    return wasteTypes.filter(
      (item) =>
        !query ||
        normalize([item.libelle, item.codeType, item.description ?? ''].join(' ')).includes(query),
    );
  }, [search, wasteTypes]);

  const filteredTeams = useMemo(() => {
    const query = normalize(search);
    return teams.filter(
      (team) =>
        !query ||
        normalize(
          [
            team.nomEquipe,
            team.description ?? '',
            ...team.appartenances.map((member) =>
              [
                member.utilisateur.prenom ?? '',
                member.utilisateur.nom,
                member.utilisateur.email,
                member.fonction,
              ].join(' '),
            ),
            ...team.competences.map(
              (skill) => skill.typeDechet.libelle + ' ' + skill.typeDechet.codeType,
            ),
          ].join(' '),
        ).includes(query),
    );
  }, [search, teams]);

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-line-subtle bg-white">
        <div className="p-6 lg:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-forest">
            Administration · Configuration
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
                Référentiels
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-500">
                Organisez les types de déchets, les équipes et leurs compétences pour fiabiliser les
                affectations opérationnelles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className={secondaryClass}
            >
              {loading ? 'Actualisation…' : 'Actualiser les données'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-line-subtle bg-surface-base sm:grid-cols-4">
          <div className="border-b border-r border-line-subtle p-4 sm:border-b-0">
            <p className="text-xs font-semibold text-ink-500">Types actifs</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{activeTypes.length}</p>
            <p className="mt-1 text-[11px] text-ink-400">{inactiveTypesCount} inactif(s) chargés</p>
          </div>
          <div className="border-b border-line-subtle p-4 sm:border-b-0 sm:border-r">
            <p className="text-xs font-semibold text-ink-500">Équipes actives</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{activeTeams}</p>
            <p className="mt-1 text-[11px] text-ink-400">{teams.length} équipe(s) au total</p>
          </div>
          <div className="border-r border-line-subtle p-4">
            <p className="text-xs font-semibold text-ink-500">Membres actuels</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{currentMembers}</p>
            <p className="mt-1 text-[11px] text-ink-400">Appartenances non clôturées</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-ink-500">Compétences actives</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{activeSkills}</p>
            <p className="mt-1 text-[11px] text-ink-400">Sur toutes les équipes</p>
          </div>
        </div>
      </header>

      {error ? (
        <FeedbackBanner tone="error">
          {error}
          <button type="button" onClick={() => void load()} className="ml-2 font-bold underline">
            Réessayer
          </button>
        </FeedbackBanner>
      ) : null}
      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-xl border border-line-subtle bg-surface-base p-1"
          role="tablist"
          aria-label="Sections des référentiels"
        >
          <button
            id="referentials-tab-types"
            type="button"
            role="tab"
            aria-selected={tab === 'types'}
            aria-controls="referentials-panel-types"
            onClick={() => {
              setTab('types');
              setSearch('');
            }}
            className={
              tab === 'types'
                ? 'rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-forest shadow-sm'
                : 'rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800'
            }
          >
            Types de déchets
          </button>
          <button
            id="referentials-tab-teams"
            type="button"
            role="tab"
            aria-selected={tab === 'teams'}
            aria-controls="referentials-panel-teams"
            onClick={() => {
              setTab('teams');
              setSearch('');
            }}
            className={
              tab === 'teams'
                ? 'rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-forest shadow-sm'
                : 'rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800'
            }
          >
            Équipes et compétences
          </button>
        </div>
        <label className="min-w-[min(100%,280px)] flex-1 sm:max-w-md">
          <span className="mb-1.5 block text-xs font-bold text-ink-600">
            Rechercher dans {tab === 'types' ? 'les types' : 'les équipes'}
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              tab === 'types' ? 'Libellé, code ou description…' : 'Équipe, membre ou compétence…'
            }
            className={inputClass}
          />
        </label>
      </div>

      {loading && !wasteTypes.length && !teams.length ? (
        <div className="space-y-3" aria-live="polite" aria-label="Chargement des référentiels">
          <div className="h-24 animate-pulse rounded-2xl bg-surface-base" />
          <div className="h-40 animate-pulse rounded-2xl bg-surface-base" />
        </div>
      ) : null}

      {tab === 'types' ? (
        <section
          id="referentials-panel-types"
          role="tabpanel"
          aria-labelledby="referentials-tab-types"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink-900">Catalogue des déchets</h2>
              <p className="mt-1 text-xs text-ink-500">
                {filteredTypes.length} résultat(s) sur {wasteTypes.length} type(s) chargé(s).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTypeForm((value) => !value)}
              className={buttonClass}
            >
              {showTypeForm ? 'Fermer le formulaire' : 'Ajouter un type'}
            </button>
          </div>

          {showTypeForm ? (
            <form
              onSubmit={(event) => void createWasteType(event)}
              className="rounded-2xl border border-brand-mist bg-white p-5 shadow-sm"
            >
              <div className="mb-4">
                <h3 className="font-extrabold text-ink-900">Nouveau type de déchet</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Le code doit rester stable, car il identifie le type dans les opérations.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className={labelClass}>
                  Code du type
                  <input
                    required
                    maxLength={80}
                    value={typeCode}
                    onChange={(event) => setTypeCode(event.target.value)}
                    className={inputClass}
                    placeholder="PLASTIQUE"
                  />
                </label>
                <label className={labelClass}>
                  Libellé
                  <input
                    required
                    maxLength={255}
                    value={typeLabel}
                    onChange={(event) => setTypeLabel(event.target.value)}
                    className={inputClass}
                    placeholder="Déchets plastiques"
                  />
                </label>
                <label className={labelClass}>
                  Description <span className="font-normal text-ink-400">(facultative)</span>
                  <input
                    maxLength={2000}
                    value={typeDescription}
                    onChange={(event) => setTypeDescription(event.target.value)}
                    className={inputClass}
                    placeholder="Précisions utiles"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-ink-500">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(event) => setIncludeInactive(event.target.checked)}
                    className="rounded border-line-strong"
                  />
                  Afficher également les types inactifs
                </label>
                <button type="submit" disabled={busy === 'type-create'} className={buttonClass}>
                  {busy === 'type-create' ? 'Création…' : 'Créer le type'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-surface-base px-4 py-3">
              <p className="text-xs text-ink-500">
                Ajoutez un type uniquement lorsqu’il correspond à une catégorie métier validée.
              </p>
              <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-ink-600">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
                Inactifs
              </label>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-line-strong bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
              <h3 className="font-bold text-ink-900">Types enregistrés</h3>
              <span className="rounded-full bg-surface-base px-3 py-1 text-xs font-bold text-ink-600">
                {filteredTypes.length}
              </span>
            </div>
            <div className="divide-y divide-line-subtle">
              {filteredTypes.map((item) => (
                <article
                  key={item.idTypeDechet}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface-base/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-ink-900">{item.libelle}</h3>
                      <StatusBadge
                        label={item.actif ? 'Actif' : 'Inactif'}
                        tone={item.actif ? 'success' : 'neutral'}
                      />
                    </div>
                    <p className="mt-1 break-words text-xs text-ink-500">
                      <span className="font-bold tracking-wide">{item.codeType}</span>
                      {item.description ? ' · ' + item.description : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleWasteType(item)}
                    disabled={busy === 'type-' + item.idTypeDechet}
                    className={secondaryClass}
                  >
                    {busy === 'type-' + item.idTypeDechet
                      ? 'Mise à jour…'
                      : item.actif
                        ? 'Désactiver'
                        : 'Réactiver'}
                  </button>
                </article>
              ))}
              {!loading && !filteredTypes.length ? (
                <div className="p-8 text-center">
                  <p className="font-bold text-ink-800">
                    {wasteTypes.length ? 'Aucun résultat' : 'Aucun type enregistré'}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {wasteTypes.length
                      ? 'Modifiez votre recherche ou affichez les types inactifs.'
                      : 'Créez le premier type de déchet pour alimenter le référentiel.'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section
          id="referentials-panel-teams"
          role="tabpanel"
          aria-labelledby="referentials-tab-teams"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink-900">Équipes opérationnelles</h2>
              <p className="mt-1 text-xs text-ink-500">
                {filteredTeams.length} résultat(s) sur {teams.length} équipe(s) chargée(s).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTeamForm((value) => !value)}
              className={buttonClass}
            >
              {showTeamForm ? 'Fermer le formulaire' : 'Créer une équipe'}
            </button>
          </div>

          {showTeamForm ? (
            <form
              onSubmit={(event) => void createTeam(event)}
              className="rounded-2xl border border-brand-mist bg-white p-5 shadow-sm"
            >
              <h3 className="font-extrabold text-ink-900">Nouvelle équipe</h3>
              <p className="mt-1 text-xs text-ink-500">
                L’équipe sera créée avec l’état actif. Vous pourrez ensuite lui associer des membres
                et des compétences.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.3fr_auto] md:items-end">
                <label className={labelClass}>
                  Nom de l’équipe
                  <input
                    required
                    maxLength={150}
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    className={inputClass}
                    placeholder="Équipe Nord"
                  />
                </label>
                <label className={labelClass}>
                  Description <span className="font-normal text-ink-400">(facultative)</span>
                  <input
                    maxLength={2000}
                    value={teamDescription}
                    onChange={(event) => setTeamDescription(event.target.value)}
                    className={inputClass}
                    placeholder="Zone ou spécialité principale"
                  />
                </label>
                <button type="submit" disabled={busy === 'team-create'} className={buttonClass}>
                  {busy === 'team-create' ? 'Création…' : 'Créer l’équipe'}
                </button>
              </div>
            </form>
          ) : null}

          <div className="space-y-3">
            {filteredTeams.map((team) => {
              const currentTeamMembers = team.appartenances.filter((member) => !member.dateFin);
              const pastTeamMembers = team.appartenances.filter((member) =>
                Boolean(member.dateFin),
              );
              const currentSkills = team.competences.filter((skill) => skill.actif);
              const inactiveSkills = team.competences.filter((skill) => !skill.actif);
              const statusActive = team.etatEquipe === 'ACTIVE';

              return (
                <article
                  key={team.idEquipe}
                  className="overflow-hidden rounded-2xl border border-line-strong bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-ink-900">{team.nomEquipe}</h3>
                        <StatusBadge
                          label={statusActive ? 'Équipe active' : 'Équipe inactive'}
                          tone={statusActive ? 'success' : 'neutral'}
                        />
                      </div>
                      <p className="mt-1 text-sm text-ink-500">
                        {team.description || 'Aucune description renseignée.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-surface-base px-3 py-1 text-xs font-semibold text-ink-600">
                          {currentTeamMembers.length} membre(s) actuel(s)
                        </span>
                        <span className="rounded-full bg-surface-base px-3 py-1 text-xs font-semibold text-ink-600">
                          {currentSkills.length} compétence(s) active(s)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleTeam(team)}
                      disabled={busy === 'team-' + team.idEquipe}
                      className={secondaryClass}
                    >
                      {busy === 'team-' + team.idEquipe
                        ? 'Mise à jour…'
                        : statusActive
                          ? 'Désactiver l’équipe'
                          : 'Réactiver l’équipe'}
                    </button>
                  </div>

                  <div className="grid border-t border-line-subtle bg-surface-base sm:grid-cols-2">
                    <div className="border-b border-line-subtle p-4 sm:border-b-0 sm:border-r">
                      <p className="text-xs font-bold text-ink-600">Responsabilités membres</p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        L’appartenance détermine l’équipe à laquelle l’agent est rattaché.
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold text-ink-600">Compétences de l’équipe</p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        Elles décrivent les types de déchets que l’équipe peut traiter.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-2">
                    <section className="min-w-0 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-extrabold text-ink-900">Membres actuels</h4>
                        <span className="text-xs font-semibold text-ink-400">
                          {currentTeamMembers.length}
                        </span>
                      </div>
                      {currentTeamMembers.map((member) => (
                        <div
                          key={member.idUtilisateur + member.dateDebut}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-subtle bg-white p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink-800">
                              {member.utilisateur.prenom ? member.utilisateur.prenom + ' ' : ''}
                              {member.utilisateur.nom}
                            </p>
                            <p className="mt-0.5 break-all text-xs text-ink-500">
                              {member.utilisateur.email}
                            </p>
                            <p className="mt-1 text-[11px] text-ink-400">
                              {member.fonction} · depuis le {dateLabel(member.dateDebut)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeMember(team.idEquipe, member)}
                            disabled={
                              busy === 'member-remove-' + team.idEquipe + member.idUtilisateur
                            }
                            className={secondaryClass}
                          >
                            Clôturer
                          </button>
                        </div>
                      ))}
                      {!currentTeamMembers.length ? (
                        <p className="rounded-xl bg-surface-base p-4 text-sm text-ink-500">
                          Aucun membre actuellement rattaché à cette équipe.
                        </p>
                      ) : null}

                      {pastTeamMembers.length ? (
                        <details className="rounded-xl border border-line-subtle px-3 py-2">
                          <summary className="cursor-pointer text-xs font-bold text-ink-600">
                            Historique des appartenances ({pastTeamMembers.length})
                          </summary>
                          <div className="mt-3 space-y-2">
                            {pastTeamMembers.map((member) => (
                              <div
                                key={member.idUtilisateur + member.dateDebut}
                                className="rounded-lg bg-surface-base p-3"
                              >
                                <p className="text-sm font-semibold text-ink-700">
                                  {member.utilisateur.prenom ? member.utilisateur.prenom + ' ' : ''}
                                  {member.utilisateur.nom}
                                </p>
                                <p className="mt-1 text-xs text-ink-500">
                                  {member.fonction} · du {dateLabel(member.dateDebut)} au{' '}
                                  {member.dateFin ? dateLabel(member.dateFin) : '—'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}

                      <form
                        onSubmit={(event) => void addMember(team.idEquipe, event)}
                        className="space-y-3 rounded-xl border border-dashed border-line-strong bg-surface-base p-4"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-ink-800">Ajouter un membre</p>
                          <p className="mt-1 text-[11px] leading-5 text-ink-500">
                            Utilisez l’identifiant utilisateur UUID du compte existant.
                          </p>
                        </div>
                        <label className={labelClass}>
                          Identifiant du compte
                          <input
                            required
                            value={memberIds[team.idEquipe] ?? ''}
                            onChange={(event) =>
                              setMemberIds((current) => ({
                                ...current,
                                [team.idEquipe]: event.target.value,
                              }))
                            }
                            className={inputClass}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          />
                        </label>
                        <label className={labelClass}>
                          Fonction dans l’équipe
                          <input
                            required
                            maxLength={150}
                            value={memberFunctions[team.idEquipe] ?? ''}
                            onChange={(event) =>
                              setMemberFunctions((current) => ({
                                ...current,
                                [team.idEquipe]: event.target.value,
                              }))
                            }
                            className={inputClass}
                            placeholder="Agent de terrain"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={busy === 'member-' + team.idEquipe || !statusActive}
                          className={buttonClass}
                        >
                          {busy === 'member-' + team.idEquipe ? 'Ajout…' : 'Ajouter le membre'}
                        </button>
                        {!statusActive ? (
                          <p className="text-[11px] text-amber-800">
                            Réactivez l’équipe pour gérer ses membres.
                          </p>
                        ) : null}
                      </form>
                    </section>

                    <section className="min-w-0 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-extrabold text-ink-900">Compétences actives</h4>
                        <span className="text-xs font-semibold text-ink-400">
                          {currentSkills.length}
                        </span>
                      </div>
                      {currentSkills.map((skill) => (
                        <div
                          key={skill.idCompetenceEquipe}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-subtle bg-white p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink-800">
                              {skill.typeDechet.libelle}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {skill.typeDechet.codeType} · ajoutée le{' '}
                              {dateLabel(skill.dateAttribution)}
                            </p>
                            {skill.commentaire ? (
                              <p className="mt-1 text-xs text-ink-400">{skill.commentaire}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeSkill(team.idEquipe, skill)}
                            disabled={busy === 'skill-remove-' + skill.idCompetenceEquipe}
                            className={secondaryClass}
                          >
                            Désactiver
                          </button>
                        </div>
                      ))}
                      {!currentSkills.length ? (
                        <p className="rounded-xl bg-surface-base p-4 text-sm text-ink-500">
                          Aucune compétence active pour cette équipe.
                        </p>
                      ) : null}

                      {inactiveSkills.length ? (
                        <details className="rounded-xl border border-line-subtle px-3 py-2">
                          <summary className="cursor-pointer text-xs font-bold text-ink-600">
                            Compétences désactivées ({inactiveSkills.length})
                          </summary>
                          <div className="mt-3 space-y-2">
                            {inactiveSkills.map((skill) => (
                              <div
                                key={skill.idCompetenceEquipe}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-base p-3"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-ink-700">
                                    {skill.typeDechet.libelle}
                                  </p>
                                  <p className="text-xs text-ink-500">
                                    {skill.typeDechet.codeType}
                                  </p>
                                </div>
                                <StatusBadge label="Inactive" tone="neutral" />
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}

                      <form
                        onSubmit={(event) => void addSkill(team.idEquipe, event)}
                        className="space-y-3 rounded-xl border border-dashed border-line-strong bg-surface-base p-4"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-ink-800">
                            Ajouter une compétence
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-ink-500">
                            Choisissez un type de déchet actif du référentiel.
                          </p>
                        </div>
                        <label className={labelClass}>
                          Type de déchet
                          <select
                            required
                            value={skillTypes[team.idEquipe] ?? ''}
                            onChange={(event) =>
                              setSkillTypes((current) => ({
                                ...current,
                                [team.idEquipe]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          >
                            <option value="">Sélectionner un type</option>
                            {activeTypes.map((type) => (
                              <option key={type.idTypeDechet} value={type.idTypeDechet}>
                                {type.libelle}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={labelClass}>
                          Commentaire <span className="font-normal text-ink-400">(facultatif)</span>
                          <input
                            maxLength={1000}
                            value={skillComments[team.idEquipe] ?? ''}
                            onChange={(event) =>
                              setSkillComments((current) => ({
                                ...current,
                                [team.idEquipe]: event.target.value,
                              }))
                            }
                            className={inputClass}
                            placeholder="Précision sur le savoir-faire"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={
                            busy === 'skill-add-' + team.idEquipe ||
                            !activeTypes.length ||
                            !statusActive
                          }
                          className={buttonClass}
                        >
                          {busy === 'skill-add-' + team.idEquipe
                            ? 'Ajout…'
                            : 'Ajouter la compétence'}
                        </button>
                        {!activeTypes.length ? (
                          <p className="text-[11px] text-amber-800">
                            Créez ou réactivez un type de déchet avant d’ajouter une compétence.
                          </p>
                        ) : null}
                        {!statusActive ? (
                          <p className="text-[11px] text-amber-800">
                            Réactivez l’équipe pour gérer ses compétences.
                          </p>
                        ) : null}
                      </form>
                    </section>
                  </div>
                </article>
              );
            })}
            {!loading && !filteredTeams.length ? (
              <div className="rounded-2xl border border-line-strong bg-white p-8 text-center">
                <p className="font-bold text-ink-800">
                  {teams.length ? 'Aucune équipe ne correspond' : 'Aucune équipe enregistrée'}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {teams.length
                    ? 'Modifiez la recherche pour retrouver une équipe.'
                    : 'Créez une équipe pour commencer à organiser les interventions.'}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
