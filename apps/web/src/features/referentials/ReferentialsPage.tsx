import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

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

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-eco-500 focus:ring-2 focus:ring-eco-100';
const labelClass = 'block text-xs font-semibold text-slate-600';
const buttonClass = 'rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50';

export function ReferentialsPage() {
  const [tab, setTab] = useState<PageTab>('types');
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
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
        api.request<WasteType[]>('/referentials/waste-types?includeInactive=' + String(includeInactive)),
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

  useEffect(() => { void load(); }, [load]);

  async function execute(key: string, operation: () => Promise<unknown>, success: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await operation();
      setNotice(success);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  async function createWasteType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await execute('type-create', () => api.request('/referentials/waste-types', {
      method: 'POST',
      body: JSON.stringify({
        codeType: typeCode.trim(),
        libelle: typeLabel.trim(),
        ...(typeDescription.trim() ? { description: typeDescription.trim() } : {}),
      }),
    }), 'Type de déchet créé.');
    setTypeCode('');
    setTypeLabel('');
    setTypeDescription('');
  }

  async function toggleWasteType(item: WasteType) {
    await execute('type-' + item.idTypeDechet, () => api.request('/referentials/waste-types/' + item.idTypeDechet, {
      method: 'PATCH',
      body: JSON.stringify({ actif: !item.actif }),
    }), item.actif ? 'Type de déchet désactivé.' : 'Type de déchet réactivé.');
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await execute('team-create', () => api.request('/referentials/teams', {
      method: 'POST',
      body: JSON.stringify({
        nomEquipe: teamName.trim(),
        ...(teamDescription.trim() ? { description: teamDescription.trim() } : {}),
        etatEquipe: 'ACTIVE',
      }),
    }), 'Équipe créée.');
    setTeamName('');
    setTeamDescription('');
  }

  async function toggleTeam(team: Team) {
    const next = team.etatEquipe === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await execute('team-' + team.idEquipe, () => api.request('/referentials/teams/' + team.idEquipe, {
      method: 'PATCH',
      body: JSON.stringify({ etatEquipe: next }),
    }), next === 'ACTIVE' ? 'Équipe réactivée.' : 'Équipe désactivée.');
  }

  async function addMember(teamId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idUtilisateur = memberIds[teamId]?.trim() ?? '';
    const fonction = memberFunctions[teamId]?.trim() ?? '';
    if (!idUtilisateur || !fonction) {
      setError('Identifiant utilisateur et fonction sont obligatoires.');
      return;
    }
    await execute('member-' + teamId, () => api.request('/referentials/teams/' + teamId + '/memberships', {
      method: 'POST',
      body: JSON.stringify({ idUtilisateur, dateDebut: new Date().toISOString(), fonction }),
    }), 'Membre ajouté à l’équipe.');
    setMemberIds((current) => ({ ...current, [teamId]: '' }));
    setMemberFunctions((current) => ({ ...current, [teamId]: '' }));
  }

  async function removeMember(teamId: string, member: TeamMember) {
    await execute('member-remove-' + teamId + member.idUtilisateur, () => api.request('/referentials/teams/' + teamId + '/memberships/close', {
      method: 'POST',
      body: JSON.stringify({
        idUtilisateur: member.idUtilisateur,
        dateDebut: member.dateDebut,
        dateFin: new Date().toISOString(),
      }),
    }), 'Appartenance clôturée.');
  }

  async function addSkill(teamId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idTypeDechet = skillTypes[teamId] ?? '';
    if (!idTypeDechet) {
      setError('Sélectionnez un type de déchet.');
      return;
    }
    await execute('skill-add-' + teamId, () => api.request('/referentials/teams/' + teamId + '/skills', {
      method: 'POST',
      body: JSON.stringify({
        idTypeDechet,
        ...(skillComments[teamId]?.trim() ? { commentaire: skillComments[teamId].trim() } : {}),
      }),
    }), 'Compétence ajoutée.');
    setSkillTypes((current) => ({ ...current, [teamId]: '' }));
    setSkillComments((current) => ({ ...current, [teamId]: '' }));
  }

  async function removeSkill(teamId: string, skill: TeamSkill) {
    await execute('skill-remove-' + skill.idCompetenceEquipe, () => api.request('/referentials/teams/' + teamId + '/skills/close', {
      method: 'POST',
      body: JSON.stringify({ idCompetenceEquipe: skill.idCompetenceEquipe }),
    }), 'Compétence désactivée.');
  }

  const activeTypes = wasteTypes.filter((item) => item.actif);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Administration</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Référentiels</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Gérez les types de déchets, les équipes, leurs membres et leurs compétences.
        </p>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-eco-200 bg-eco-50 px-4 py-3 text-sm text-eco-900">{notice}</div> : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab('types')} className={tab === 'types' ? buttonClass : secondaryClass}>Types de déchets</button>
        <button type="button" onClick={() => setTab('teams')} className={tab === 'teams' ? buttonClass : secondaryClass}>Équipes et compétences</button>
        <button type="button" onClick={() => void load()} disabled={loading} className={secondaryClass}>Actualiser</button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Chargement des référentiels…</p> : null}

      {tab === 'types' ? (
        <div className="space-y-4">
          <form onSubmit={(event) => void createWasteType(event)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">
            <label className={labelClass}>Code du type<input required maxLength={80} value={typeCode} onChange={(event) => setTypeCode(event.target.value)} className={inputClass} placeholder="PLASTIQUE" /></label>
            <label className={labelClass}>Libellé<input required maxLength={255} value={typeLabel} onChange={(event) => setTypeLabel(event.target.value)} className={inputClass} placeholder="Déchets plastiques" /></label>
            <label className={labelClass}>Description<input maxLength={2000} value={typeDescription} onChange={(event) => setTypeDescription(event.target.value)} className={inputClass} placeholder="Description facultative" /></label>
            <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />Afficher les types inactifs</label>
              <button type="submit" disabled={busy === 'type-create'} className={buttonClass}>{busy === 'type-create' ? 'Création…' : 'Ajouter le type'}</button>
            </div>
          </form>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">{wasteTypes.length} type(s) de déchets</h2></div>
            <div className="divide-y divide-slate-100">
              {wasteTypes.map((item) => (
                <article key={item.idTypeDechet} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div><p className="font-bold text-slate-900">{item.libelle}</p><p className="mt-1 text-xs text-slate-500">{item.codeType}{item.description ? ' · ' + item.description : ''}</p></div>
                  <div className="flex items-center gap-3"><span className={item.actif ? 'rounded-full bg-eco-50 px-2.5 py-1 text-xs font-bold text-eco-800' : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'}>{item.actif ? 'Actif' : 'Inactif'}</span><button type="button" onClick={() => void toggleWasteType(item)} disabled={busy === 'type-' + item.idTypeDechet} className={secondaryClass}>{item.actif ? 'Désactiver' : 'Réactiver'}</button></div>
                </article>
              ))}
              {!wasteTypes.length ? <p className="p-6 text-sm text-slate-500">Aucun type de déchet enregistré.</p> : null}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={(event) => void createTeam(event)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className={labelClass}>Nom de l’équipe<input required maxLength={150} value={teamName} onChange={(event) => setTeamName(event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Description<input maxLength={2000} value={teamDescription} onChange={(event) => setTeamDescription(event.target.value)} className={inputClass} /></label>
            <button type="submit" disabled={busy === 'team-create'} className={buttonClass}>Créer l’équipe</button>
          </form>

          {teams.map((team) => (
            <section key={team.idEquipe} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-lg font-bold text-slate-900">{team.nomEquipe}</h2><p className="mt-1 text-xs text-slate-500">{team.description || 'Aucune description'} · {team.etatEquipe}</p></div>
                <button type="button" onClick={() => void toggleTeam(team)} disabled={busy === 'team-' + team.idEquipe} className={secondaryClass}>{team.etatEquipe === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}</button>
              </header>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800">Membres actuels ({team.appartenances.length})</h3>
                  {team.appartenances.map((member) => (
                    <div key={member.idUtilisateur + member.dateDebut} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div><p className="text-sm font-semibold text-slate-800">{member.utilisateur.prenom ? member.utilisateur.prenom + ' ' : ''}{member.utilisateur.nom}</p><p className="text-xs text-slate-500">{member.utilisateur.email} · {member.fonction}</p></div>
                      <button type="button" onClick={() => void removeMember(team.idEquipe, member)} className={secondaryClass}>Retirer</button>
                    </div>
                  ))}
                  <form onSubmit={(event) => void addMember(team.idEquipe, event)} className="space-y-2 rounded-xl border border-slate-100 p-3">
                    <label className={labelClass}>UUID du compte utilisateur<input required value={memberIds[team.idEquipe] ?? ''} onChange={(event) => setMemberIds((current) => ({ ...current, [team.idEquipe]: event.target.value }))} className={inputClass} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
                    <label className={labelClass}>Fonction<input required value={memberFunctions[team.idEquipe] ?? ''} onChange={(event) => setMemberFunctions((current) => ({ ...current, [team.idEquipe]: event.target.value }))} className={inputClass} placeholder="Agent de terrain" /></label>
                    <button type="submit" disabled={busy === 'member-' + team.idEquipe} className={buttonClass}>Ajouter le membre</button>
                  </form>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800">Compétences actives ({team.competences.length})</h3>
                  {team.competences.map((skill) => (
                    <div key={skill.idCompetenceEquipe} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div><p className="text-sm font-semibold text-slate-800">{skill.typeDechet.libelle}</p><p className="text-xs text-slate-500">Attribuée le {dateLabel(skill.dateAttribution)}{skill.commentaire ? ' · ' + skill.commentaire : ''}</p></div>
                      <button type="button" onClick={() => void removeSkill(team.idEquipe, skill)} className={secondaryClass}>Désactiver</button>
                    </div>
                  ))}
                  <form onSubmit={(event) => void addSkill(team.idEquipe, event)} className="space-y-2 rounded-xl border border-slate-100 p-3">
                    <label className={labelClass}>Type de déchet<select required value={skillTypes[team.idEquipe] ?? ''} onChange={(event) => setSkillTypes((current) => ({ ...current, [team.idEquipe]: event.target.value }))} className={inputClass}><option value="">Sélectionner</option>{activeTypes.map((type) => <option key={type.idTypeDechet} value={type.idTypeDechet}>{type.libelle}</option>)}</select></label>
                    <label className={labelClass}>Commentaire facultatif<input value={skillComments[team.idEquipe] ?? ''} onChange={(event) => setSkillComments((current) => ({ ...current, [team.idEquipe]: event.target.value }))} className={inputClass} /></label>
                    <button type="submit" disabled={busy === 'skill-add-' + team.idEquipe || !activeTypes.length} className={buttonClass}>Ajouter la compétence</button>
                  </form>
                </div>
              </div>
            </section>
          ))}
          {!teams.length ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Aucune équipe enregistrée.</p> : null}
        </div>
      )}
    </div>
  );
}
