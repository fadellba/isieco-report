import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAgentProfile,
  listMyTeams,
  listTeamAssignments,
  listTeamInterventions,
  type AgentTeam,
  type TeamAssignment,
  type TeamIntervention,
} from '../../../src/features/interventions/agent-api';
import { dateLabel } from '../../../src/features/reports/report-format';
import { StatusBadge, type StatusTone } from '../../../src/ui/StatusBadge';
import { FeedbackBanner } from '../../../src/ui/FeedbackBanner';

type FilterKey =
  | 'ALL'
  | 'TO_ACCEPT'
  | 'TO_START'
  | 'IN_PROGRESS'
  | 'TO_VERIFY'
  | 'RESTART'
  | 'RESOLVED';
const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'TO_ACCEPT', label: 'À accepter' },
  { key: 'TO_START', label: 'À démarrer' },
  { key: 'IN_PROGRESS', label: 'En cours' },
  { key: 'TO_VERIFY', label: 'À vérifier' },
  { key: 'RESTART', label: 'Reprises' },
  { key: 'RESOLVED', label: 'Validées' },
];

function latestInterventions(items: TeamIntervention[]): Map<string, TeamIntervention> {
  const latest = new Map<string, TeamIntervention>();
  for (const item of items) {
    const current = latest.get(item.idAffectation);
    if (
      !current ||
      new Date(item.dateHeureDebut ?? 0).getTime() > new Date(current.dateHeureDebut ?? 0).getTime()
    ) {
      latest.set(item.idAffectation, item);
    }
  }
  return latest;
}

function missionFilter(
  assignment: TeamAssignment,
  latest: TeamIntervention | undefined,
): FilterKey | 'REFUSED' {
  if (assignment.decisionEquipe === 'EN_ATTENTE') return 'TO_ACCEPT';
  if (assignment.decisionEquipe === 'REFUSEE') return 'REFUSED';
  if (!latest) return 'TO_START';
  if (latest.statutIntervention === 'EN_COURS') return 'IN_PROGRESS';
  if (latest.verification?.etatVerification === 'REPRISE') return 'RESTART';
  if (latest.verification?.etatVerification === 'VALIDEE') return 'RESOLVED';
  return 'TO_VERIFY';
}

function missionStatus(
  assignment: TeamAssignment,
  latest: TeamIntervention | undefined,
): { label: string; tone: StatusTone } {
  const state = missionFilter(assignment, latest);
  const labels: Record<string, string> = {
    TO_ACCEPT: 'À accepter',
    REFUSED: 'Refusée',
    TO_START: 'À démarrer',
    IN_PROGRESS: 'Intervention en cours',
    TO_VERIFY: 'À vérifier',
    RESTART: 'Reprise demandée',
    RESOLVED: 'Validée',
  };
  const tones: Record<string, StatusTone> = {
    TO_ACCEPT: 'warning',
    REFUSED: 'danger',
    TO_START: 'info',
    IN_PROGRESS: 'brand',
    TO_VERIFY: 'info',
    RESTART: 'warning',
    RESOLVED: 'success',
  };
  return { label: labels[state] ?? 'État inconnu', tone: tones[state] ?? 'neutral' };
}

function nextAction(assignment: TeamAssignment, latest: TeamIntervention | undefined): string {
  const state = missionFilter(assignment, latest);
  const labels: Record<string, string> = {
    TO_ACCEPT: 'Répondre à l’affectation',
    REFUSED: 'Aucune action attendue',
    TO_START: 'Démarrer l’intervention',
    IN_PROGRESS: 'Consulter l’intervention en cours',
    TO_VERIFY: 'Compte rendu transmis',
    RESTART: 'Démarrer la reprise demandée',
    RESOLVED: 'Mission clôturée et validée',
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
    setLoadingTeams(true);
    setError(null);
    try {
      const [agent, myTeams] = await Promise.all([getAgentProfile(), listMyTeams()]);
      if (!agent.roles.some((role) => role.code === 'AGENT_TERRAIN')) {
        throw new Error('Le rôle AGENT_TERRAIN est requis pour accéder à cet espace.');
      }
      setTeams(myTeams);
      setSelectedTeamId((current) =>
        myTeams.some((team) => team.idEquipe === current) ? current : (myTeams[0]?.idEquipe ?? ''),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Impossible de charger votre espace agent.',
      );
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const loadMissions = useCallback(async () => {
    if (!selectedTeamId) {
      setAssignments([]);
      setInterventions([]);
      setLoadingMissions(false);
      return;
    }
    setLoadingMissions(true);
    setError(null);
    try {
      const [teamAssignments, teamInterventions] = await Promise.all([
        listTeamAssignments(selectedTeamId),
        listTeamInterventions(selectedTeamId),
      ]);
      setAssignments(teamAssignments);
      setInterventions(teamInterventions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les missions.');
    } finally {
      setLoadingMissions(false);
    }
  }, [selectedTeamId]);

  useFocusEffect(
    useCallback(() => {
      void loadTeams();
    }, [loadTeams]),
  );
  useEffect(() => {
    void loadMissions();
  }, [loadMissions]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      ALL: 0,
      TO_ACCEPT: 0,
      TO_START: 0,
      IN_PROGRESS: 0,
      TO_VERIFY: 0,
      RESTART: 0,
      RESOLVED: 0,
    };
    for (const assignment of assignments) {
      const state = missionFilter(assignment, latestByAssignment.get(assignment.idAffectation));
      if (state !== 'REFUSED') {
        result.ALL = (result.ALL ?? 0) + 1;
        result[state] = (result[state] ?? 0) + 1;
      }
    }
    return result;
  }, [assignments, latestByAssignment]);

  const filtered = useMemo(
    () =>
      assignments
        .filter((assignment) => {
          const state = missionFilter(assignment, latestByAssignment.get(assignment.idAffectation));
          return filter === 'ALL' ? state !== 'REFUSED' : state === filter;
        })
        .sort((a, b) => {
          const rank: Record<string, number> = {
            TO_ACCEPT: 0,
            RESTART: 1,
            IN_PROGRESS: 2,
            TO_START: 3,
            TO_VERIFY: 4,
            RESOLVED: 5,
            REFUSED: 6,
          };
          const rankA = rank[missionFilter(a, latestByAssignment.get(a.idAffectation))] ?? 99;
          const rankB = rank[missionFilter(b, latestByAssignment.get(b.idAffectation))] ?? 99;
          return rankA - rankB;
        }),
    [assignments, filter, latestByAssignment],
  );

  const selectedTeam = teams.find((team) => team.idEquipe === selectedTeamId) ?? null;

  function openMission(assignment: TeamAssignment) {
    router.push({
      pathname: '/(agent)/missions/[id]',
      params: { id: assignment.idAffectation, teamId: assignment.idEquipe },
    });
  }

  if (loadingTeams) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAF9] px-8">
        <ActivityIndicator color="#174C3D" size="large" />
        <Text className="mt-4 text-xs font-semibold text-ink-500">
          Chargement de votre espace agent…
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAF9]">
      {/* Top Header */}
      <View className="flex-row items-center justify-between border-b border-line-subtle bg-white px-5 pb-3.5 pt-12">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(agent)/home'))}
          className="flex-row items-center gap-2"
        >
          <Text className="text-base font-bold text-ink-700">←</Text>
          <Text className="text-base font-extrabold text-ink-900">Missions terrain</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(agent)/map')}
          className="rounded-full bg-emerald-50 px-3 py-1.5 border border-emerald-100"
        >
          <Text className="text-[11px] font-extrabold text-brand-forest">🧭 Vue carte</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 50 }}
        refreshControl={
          <RefreshControl
            refreshing={loadingMissions}
            onRefresh={() => void loadMissions()}
            tintColor="#174C3D"
          />
        }
      >
        {/* KPI Banner */}
        <View className="overflow-hidden rounded-3xl bg-[#0A261E] px-5 py-5 shadow-sm">
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
            Équipes d’intervention
          </Text>
          <Text className="mt-1 text-xl font-extrabold text-white">Affectations actives</Text>
          <View className="mt-4 flex-row gap-2.5">
            <View className="flex-1 rounded-2xl bg-white/10 p-3">
              <Text className="text-xl font-extrabold text-amber-300">{counts.TO_ACCEPT}</Text>
              <Text className="mt-0.5 text-[10px] font-bold text-white/70">À accepter</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/10 p-3">
              <Text className="text-xl font-extrabold text-emerald-300">
                {counts.IN_PROGRESS + counts.RESTART + counts.TO_START}
              </Text>
              <Text className="mt-0.5 text-[10px] font-bold text-white/70">À exécuter</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/10 p-3">
              <Text className="text-xl font-extrabold text-slate-200">{counts.TO_VERIFY}</Text>
              <Text className="mt-0.5 text-[10px] font-bold text-white/70">À vérifier</Text>
            </View>
          </View>
        </View>

        {error && (
          <View className="mt-4">
            <FeedbackBanner tone="error" message={error} />
          </View>
        )}

        {/* Team selector */}
        {teams.length > 0 && (
          <View className="mt-5">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
              Équipe sélectionnée
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
            >
              {teams.map((team) => {
                const selected = selectedTeamId === team.idEquipe;
                return (
                  <TouchableOpacity
                    key={team.idEquipe}
                    onPress={() => setSelectedTeamId(team.idEquipe)}
                    className={`rounded-full px-4 py-2 ${
                      selected ? 'bg-brand-forest shadow-sm' : 'border border-line-strong bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        selected ? 'font-extrabold text-white' : 'font-semibold text-ink-700'
                      }`}
                    >
                      {team.nomEquipe}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Filters */}
        <View className="mt-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7, paddingVertical: 6 }}
          >
            {filters.map((item) => {
              const active = filter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  className={`rounded-full px-3.5 py-1.5 ${
                    active ? 'bg-brand-forest shadow-sm' : 'border border-line-subtle bg-white'
                  }`}
                >
                  <Text
                    className={`text-[11px] ${
                      active ? 'font-bold text-white' : 'font-medium text-ink-600'
                    }`}
                  >
                    {item.label} ({counts[item.key]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Missions list */}
        {loadingMissions && !assignments.length && (
          <View className="items-center py-12">
            <ActivityIndicator color="#174C3D" size="small" />
            <Text className="mt-3 text-xs text-ink-500">Chargement des missions...</Text>
          </View>
        )}

        {!loadingMissions && filtered.length === 0 && (
          <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-6 text-center">
            <Text className="text-2xl">📋</Text>
            <Text className="mt-2 text-sm font-extrabold text-ink-900">
              Aucune mission dans cette liste
            </Text>
            <Text className="mt-1 text-xs text-ink-500">
              Les missions correspondant à ce filtre s’afficheront dès leur affectation.
            </Text>
          </View>
        )}

        <View className="mt-3 gap-3">
          {filtered.map((assignment) => {
            const latest = latestByAssignment.get(assignment.idAffectation);
            const status = missionStatus(assignment, latest);
            return (
              <TouchableOpacity
                key={assignment.idAffectation}
                onPress={() => openMission(assignment)}
                className="rounded-3xl border border-line-subtle bg-white p-4 shadow-sm active:opacity-85"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono text-xs font-bold text-ink-400">
                    {assignment.contenuDossier.dossier.referenceDossier}
                  </Text>
                  <StatusBadge label={status.label} tone={status.tone} />
                </View>

                <Text className="mt-2 text-sm font-extrabold text-ink-900">
                  {assignment.contenuDossier.typeDechet.libelle}
                </Text>

                {assignment.contenuDossier.dossier.descriptionLocalisation ? (
                  <Text className="mt-1 text-xs text-ink-500" numberOfLines={1}>
                    📍 {assignment.contenuDossier.dossier.descriptionLocalisation}
                  </Text>
                ) : null}

                <View className="mt-3 flex-row items-center justify-between border-t border-line-subtle pt-2.5">
                  <Text className="text-[11px] font-bold text-brand-forest">
                    {nextAction(assignment, latest)}
                  </Text>
                  <Text className="text-xs font-bold text-brand-forest">→</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
