import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  getAgentProfile, listMyTeams, listTeamAssignments, listTeamInterventions,
  type AgentTeam, type TeamAssignment, type TeamIntervention,
} from '../../../src/features/interventions/agent-api';
import { dateLabel } from '../../../src/features/reports/report-format';
import { StatusBadge, type StatusTone } from '../../../src/ui/StatusBadge';
import { FeedbackBanner } from '../../../src/ui/FeedbackBanner';

type FilterKey = 'ALL' | 'TO_ACCEPT' | 'TO_START' | 'IN_PROGRESS' | 'TO_VERIFY' | 'RESTART' | 'RESOLVED';
const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'Toutes' }, { key: 'TO_ACCEPT', label: 'À accepter' },
  { key: 'TO_START', label: 'À démarrer' }, { key: 'IN_PROGRESS', label: 'En cours' },
  { key: 'TO_VERIFY', label: 'À vérifier' }, { key: 'RESTART', label: 'Reprises' },
  { key: 'RESOLVED', label: 'Validées' },
];

function latestInterventions(items: TeamIntervention[]): Map<string, TeamIntervention> {
  const latest = new Map<string, TeamIntervention>();
  for (const item of items) {
    const current = latest.get(item.idAffectation);
    if (!current || new Date(item.dateHeureDebut ?? 0).getTime() > new Date(current.dateHeureDebut ?? 0).getTime()) {
      latest.set(item.idAffectation, item);
    }
  }
  return latest;
}

function missionFilter(assignment: TeamAssignment, latest: TeamIntervention | undefined): FilterKey | 'REFUSED' {
  if (assignment.decisionEquipe === 'EN_ATTENTE') return 'TO_ACCEPT';
  if (assignment.decisionEquipe === 'REFUSEE') return 'REFUSED';
  if (!latest) return 'TO_START';
  if (latest.statutIntervention === 'EN_COURS') return 'IN_PROGRESS';
  if (latest.verification?.etatVerification === 'REPRISE') return 'RESTART';
  if (latest.verification?.etatVerification === 'VALIDEE') return 'RESOLVED';
  return 'TO_VERIFY';
}

function missionStatus(assignment: TeamAssignment, latest: TeamIntervention | undefined): { label: string; tone: StatusTone } {
  const state = missionFilter(assignment, latest);
  const labels: Record<string, string> = {
    TO_ACCEPT: 'À accepter', REFUSED: 'Refusée', TO_START: 'À démarrer',
    IN_PROGRESS: 'Intervention en cours', TO_VERIFY: 'À vérifier',
    RESTART: 'Reprise demandée', RESOLVED: 'Vérification validée',
  };
  const tones: Record<string, StatusTone> = {
    TO_ACCEPT: 'warning', REFUSED: 'danger', TO_START: 'info',
    IN_PROGRESS: 'brand', TO_VERIFY: 'info', RESTART: 'warning', RESOLVED: 'success',
  };
  return { label: labels[state] ?? 'État inconnu', tone: tones[state] ?? 'neutral' };
}

function nextAction(assignment: TeamAssignment, latest: TeamIntervention | undefined): string {
  const state = missionFilter(assignment, latest);
  const labels: Record<string, string> = {
    TO_ACCEPT: 'Répondre à cette affectation', REFUSED: 'Aucune action attendue',
    TO_START: 'Démarrer l’intervention', IN_PROGRESS: 'Consulter l’intervention en cours',
    TO_VERIFY: 'Consulter le compte rendu transmis', RESTART: 'Démarrer la reprise demandée',
    RESOLVED: 'Consulter la résolution validée',
  };
  return labels[state] ?? 'Consulter la mission';
}

export default function AgentMissionsScreen() {
  const router = useRouter();
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [interventions, setInterventions] = useState<TeamIntervention[]>([]);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestByAssignment = useMemo(() => latestInterventions(interventions), [interventions]);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true); setError(null);
    try {
      const [agent, myTeams] = await Promise.all([getAgentProfile(), listMyTeams()]);
      if (!agent.roles.some((role) => role.code === 'AGENT_TERRAIN')) throw new Error('Le rôle AGENT_TERRAIN est requis pour accéder à cet espace.');
      setTeams(myTeams);
      setSelectedTeamId((current) => myTeams.some((team) => team.idEquipe === current) ? current : myTeams[0]?.idEquipe ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger votre espace agent.');
    } finally { setLoadingTeams(false); }
  }, []);

  const loadMissions = useCallback(async () => {
    if (!selectedTeamId) { setAssignments([]); setInterventions([]); setLoadingMissions(false); return; }
    setLoadingMissions(true); setError(null);
    try {
      const [teamAssignments, teamInterventions] = await Promise.all([
        listTeamAssignments(selectedTeamId), listTeamInterventions(selectedTeamId),
      ]);
      setAssignments(teamAssignments); setInterventions(teamInterventions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les missions.');
    } finally { setLoadingMissions(false); }
  }, [selectedTeamId]);

  useFocusEffect(useCallback(() => { void loadTeams(); }, [loadTeams]));
  useEffect(() => { void loadMissions(); }, [loadMissions]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      ALL: 0, TO_ACCEPT: 0, TO_START: 0, IN_PROGRESS: 0, TO_VERIFY: 0, RESTART: 0, RESOLVED: 0,
    };
    for (const assignment of assignments) {
      const state = missionFilter(assignment, latestByAssignment.get(assignment.idAffectation));
      if (state !== 'REFUSED') { result.ALL += 1; result[state] = (result[state] ?? 0) + 1; }
    }
    return result;
  }, [assignments, latestByAssignment]);

  const filtered = useMemo(() => assignments
    .filter((assignment) => {
      const state = missionFilter(assignment, latestByAssignment.get(assignment.idAffectation));
      return filter === 'ALL' ? state !== 'REFUSED' : state === filter;
    })
    .sort((a, b) => {
      const rank: Record<string, number> = { TO_ACCEPT: 0, RESTART: 1, IN_PROGRESS: 2, TO_START: 3, TO_VERIFY: 4, RESOLVED: 5, REFUSED: 6 };
      return rank[missionFilter(a, latestByAssignment.get(a.idAffectation))]
        - rank[missionFilter(b, latestByAssignment.get(b.idAffectation))];
    }), [assignments, filter, latestByAssignment]);

  const selectedTeam = teams.find((team) => team.idEquipe === selectedTeamId) ?? null;

  function openMission(assignment: TeamAssignment) {
    router.push({ pathname: '/(agent)/missions/[id]', params: { id: assignment.idAffectation, teamId: assignment.idEquipe } });
  }

  if (loadingTeams) {
    return <View className="flex-1 items-center justify-center bg-surface-base px-8"><ActivityIndicator color="#174C3D" size="large" /><Text className="mt-4 text-sm font-semibold text-ink-500">Chargement de votre espace agent…</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-surface-base" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={loadingMissions} onRefresh={() => void loadMissions()} tintColor="#174C3D" />}>
      <View className="overflow-hidden rounded-3xl bg-brand-forest px-5 py-5">
        <Text className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-lime">ESPACE AGENT · TERRAIN</Text>
        <Text className="mt-2 text-2xl font-extrabold text-white">Vos missions</Text>
        <Text className="mt-2 text-sm leading-6 text-white/75">Retrouvez les affectations de votre équipe et suivez chaque intervention jusqu’à sa vérification.</Text>
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-3"><Text className="text-2xl font-extrabold text-white">{counts.TO_ACCEPT}</Text><Text className="mt-1 text-[10px] font-bold text-white/70">À accepter</Text></View>
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-3"><Text className="text-2xl font-extrabold text-white">{counts.IN_PROGRESS + counts.RESTART + counts.TO_START}</Text><Text className="mt-1 text-[10px] font-bold text-white/70">À exécuter</Text></View>
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-3"><Text className="text-2xl font-extrabold text-white">{counts.TO_VERIFY}</Text><Text className="mt-1 text-[10px] font-bold text-white/70">À vérifier</Text></View>
        </View>
      </View>

      {error ? <View className="mt-4"><FeedbackBanner tone="error" message={error} /><Pressable onPress={() => void (teams.length ? loadMissions() : loadTeams())} className="mt-3 self-start rounded-xl border border-line-strong bg-white px-4 py-2.5"><Text className="text-xs font-extrabold text-brand-forest">Réessayer</Text></Pressable></View> : null}

      {teams.length === 0 ? (
        <View className="mt-5 rounded-2xl border border-line-subtle bg-white p-5"><Text className="text-base font-extrabold text-ink-900">Aucune équipe active</Text><Text className="mt-2 text-sm leading-6 text-ink-500">Contactez le gestionnaire des référentiels pour vérifier vos appartenances à une équipe.</Text></View>
      ) : (
        <>
          <View className="mt-6">
            <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-petrol">VOTRE ÉQUIPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
              {teams.map((team) => {
                const selected = selectedTeamId === team.idEquipe;
                return <Pressable key={team.idEquipe} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedTeamId(team.idEquipe)} className={selected ? 'rounded-full bg-brand-forest px-4 py-3' : 'rounded-full border border-line-strong bg-white px-4 py-3'}><Text className={selected ? 'text-xs font-extrabold text-white' : 'text-xs font-bold text-ink-700'}>{team.nomEquipe}</Text></Pressable>;
              })}
            </ScrollView>
            {selectedTeam ? <Text className="text-xs text-ink-400">{selectedTeam.fonction} · membre depuis {dateLabel(selectedTeam.dateDebut)}</Text> : null}
          </View>

          <View className="mt-6">
            <View className="flex-row items-center justify-between"><Text className="text-lg font-extrabold text-ink-900">File des missions</Text><Text className="text-xs font-semibold text-ink-400">{filtered.length} résultat(s)</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 12 }}>
              {filters.map((item) => {
                const active = filter === item.key;
                return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(item.key)} className={active ? 'rounded-full bg-brand-forest px-3 py-2.5' : 'rounded-full border border-line-subtle bg-white px-3 py-2.5'}><Text className={active ? 'text-[10px] font-extrabold text-white' : 'text-[10px] font-bold text-ink-600'}>{item.label} · {counts[item.key]}</Text></Pressable>;
              })}
            </ScrollView>

            {loadingMissions && !assignments.length ? <View className="items-center rounded-2xl border border-line-subtle bg-white py-10"><ActivityIndicator color="#174C3D" /><Text className="mt-3 text-xs font-semibold text-ink-500">Chargement des affectations…</Text></View> : null}
            {!loadingMissions && filtered.length === 0 ? (
              <View className="rounded-2xl border border-line-subtle bg-white px-5 py-7">
                <Text className="text-sm font-extrabold text-ink-900">{filter === 'ALL' ? 'Aucune mission à afficher' : 'Aucune mission dans cette file'}</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-500">{filter === 'TO_ACCEPT' ? 'Les nouvelles affectations proposées par votre service apparaîtront ici.' : filter === 'TO_VERIFY' ? 'Les comptes rendus transmis apparaîtront ici pendant leur vérification indépendante.' : 'Les missions correspondant à ce filtre apparaîtront ici dès qu’elles seront disponibles.'}</Text>
              </View>
            ) : null}

            <View className="mt-2 gap-3">
              {filtered.map((assignment) => {
                const latest = latestByAssignment.get(assignment.idAffectation);
                const status = missionStatus(assignment, latest);
                return (
                  <Pressable key={assignment.idAffectation} onPress={() => openMission(assignment)} accessibilityRole="button" accessibilityLabel={assignment.contenuDossier.dossier.referenceDossier + ' · ' + status.label + '. ' + nextAction(assignment, latest)} className="rounded-3xl border border-line-subtle bg-white p-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1"><Text className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-petrol">DOSSIER</Text><Text className="mt-1 text-base font-extrabold text-ink-900">{assignment.contenuDossier.dossier.referenceDossier}</Text><Text className="mt-1 text-xs font-medium text-ink-500">{assignment.contenuDossier.typeDechet.libelle}</Text></View>
                      <StatusBadge label={status.label} tone={status.tone} />
                    </View>
                    {assignment.contenuDossier.dossier.descriptionLocalisation ? <Text className="mt-3 text-xs leading-5 text-ink-500" numberOfLines={2}>{assignment.contenuDossier.dossier.descriptionLocalisation}</Text> : null}
                    <View className="mt-4 flex-row items-center justify-between border-t border-line-subtle pt-3"><Text className="text-[10px] font-bold text-brand-forest">{nextAction(assignment, latest)}</Text><Text className="text-xl font-light text-brand-petrol">›</Text></View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}
      <Text className="mt-7 text-center text-[10px] font-semibold tracking-[0.12em] text-ink-400">AFFECTATION · INTERVENTION · VÉRIFICATION</Text>
    </ScrollView>
  );
}
