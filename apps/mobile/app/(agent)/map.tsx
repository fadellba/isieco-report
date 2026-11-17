import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
} from '../../src/features/interventions/agent-api';
import { dateLabel } from '../../src/features/reports/report-format';
import { FeedbackBanner } from '../../src/ui/FeedbackBanner';
import { StatusBadge, type StatusTone } from '../../src/ui/StatusBadge';
import NativeMapCanvas, { type NativeMapMarker } from '../../src/ui/NativeMapCanvas';

type MissionState =
  | 'TO_ACCEPT'
  | 'TO_START'
  | 'IN_PROGRESS'
  | 'TO_VERIFY'
  | 'RESTART'
  | 'RESOLVED'
  | 'REFUSED';
type MapFilter = 'ALL' | 'ACTION' | 'IN_PROGRESS' | 'TO_VERIFY' | 'RESOLVED';

const mapFilters: Array<{ key: MapFilter; label: string }> = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'ACTION', label: 'À traiter' },
  { key: 'IN_PROGRESS', label: 'En cours' },
  { key: 'TO_VERIFY', label: 'À vérifier' },
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

function missionState(
  assignment: TeamAssignment,
  latest: TeamIntervention | undefined,
): MissionState {
  if (assignment.decisionEquipe === 'EN_ATTENTE') return 'TO_ACCEPT';
  if (assignment.decisionEquipe === 'REFUSEE') return 'REFUSED';
  if (!latest) return 'TO_START';
  if (latest.statutIntervention === 'EN_COURS') return 'IN_PROGRESS';
  if (latest.verification?.etatVerification === 'REPRISE') return 'RESTART';
  if (latest.verification?.etatVerification === 'VALIDEE') return 'RESOLVED';
  return 'TO_VERIFY';
}

function missionPresentation(state: MissionState): {
  label: string;
  tone: StatusTone;
  action: string;
} {
  const values: Record<MissionState, { label: string; tone: StatusTone; action: string }> = {
    TO_ACCEPT: { label: 'À accepter', tone: 'warning', action: 'Répondre à l’affectation' },
    TO_START: { label: 'À démarrer', tone: 'info', action: 'Démarrer l’intervention' },
    IN_PROGRESS: { label: 'En cours', tone: 'brand', action: 'Consulter l’intervention' },
    TO_VERIFY: { label: 'À vérifier', tone: 'info', action: 'Consulter le compte rendu' },
    RESTART: { label: 'Reprise demandée', tone: 'warning', action: 'Consulter la reprise' },
    RESOLVED: { label: 'Vérification validée', tone: 'success', action: 'Consulter la résolution' },
    REFUSED: { label: 'Refusée', tone: 'danger', action: 'Aucune action attendue' },
  };
  return values[state];
}

function coordinatesFor(
  assignment: TeamAssignment,
): { latitude: number; longitude: number } | null {
  const latitude =
    assignment.contenuDossier.dossier.latitude === null
      ? Number.NaN
      : Number(assignment.contenuDossier.dossier.latitude);
  const longitude =
    assignment.contenuDossier.dossier.longitude === null
      ? Number.NaN
      : Number(assignment.contenuDossier.dossier.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export default function AgentMapScreen() {
  const router = useRouter();
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('ALL');
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [interventions, setInterventions] = useState<TeamIntervention[]>([]);
  const [filter, setFilter] = useState<MapFilter>('ALL');
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const latestByAssignment = useMemo(() => latestInterventions(interventions), [interventions]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, myTeams] = await Promise.all([getAgentProfile(), listMyTeams()]);
      if (!profile.roles.some((role) => role.code === 'AGENT_TERRAIN')) {
        throw new Error('Le rôle AGENT_TERRAIN est requis pour accéder à cette vue.');
      }

      setTeams(myTeams);
      setSelectedTeamId((current) =>
        current === 'ALL' || myTeams.some((team) => team.idEquipe === current) ? current : 'ALL',
      );

      const results = await Promise.all(
        myTeams.map(async (team) => {
          const [teamAssignments, teamInterventions] = await Promise.all([
            listTeamAssignments(team.idEquipe),
            listTeamInterventions(team.idEquipe),
          ]);
          return { teamAssignments, teamInterventions };
        }),
      );
      const uniqueAssignments = new Map<string, TeamAssignment>();
      const uniqueInterventions = new Map<string, TeamIntervention>();
      for (const result of results) {
        for (const assignment of result.teamAssignments)
          uniqueAssignments.set(assignment.idAffectation, assignment);
        for (const intervention of result.teamInterventions)
          uniqueInterventions.set(intervention.idIntervention, intervention);
      }
      setAssignments([...uniqueAssignments.values()]);
      setInterventions([...uniqueInterventions.values()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les missions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const teamFiltered = useMemo(
    () =>
      assignments.filter(
        (assignment) => selectedTeamId === 'ALL' || assignment.idEquipe === selectedTeamId,
      ),
    [assignments, selectedTeamId],
  );

  const filtered = useMemo(
    () =>
      teamFiltered
        .filter((assignment) => {
          const state = missionState(assignment, latestByAssignment.get(assignment.idAffectation));
          if (state === 'REFUSED') return false;
          if (filter === 'ALL') return true;
          if (filter === 'ACTION')
            return state === 'TO_ACCEPT' || state === 'TO_START' || state === 'RESTART';
          if (filter === 'IN_PROGRESS') return state === 'IN_PROGRESS';
          if (filter === 'TO_VERIFY') return state === 'TO_VERIFY';
          return state === 'RESOLVED';
        })
        .sort((left, right) => {
          const rank: Record<MissionState, number> = {
            TO_ACCEPT: 0,
            RESTART: 1,
            IN_PROGRESS: 2,
            TO_START: 3,
            TO_VERIFY: 4,
            RESOLVED: 5,
            REFUSED: 6,
          };
          const leftRank =
            rank[missionState(left, latestByAssignment.get(left.idAffectation))] ?? 99;
          const rightRank =
            rank[missionState(right, latestByAssignment.get(right.idAffectation))] ?? 99;
          return leftRank - rightRank;
        }),
    [teamFiltered, filter, latestByAssignment],
  );

  const located = useMemo(
    () => filtered.filter((assignment) => coordinatesFor(assignment) !== null),
    [filtered],
  );
  const withoutCoordinates = useMemo(
    () => filtered.filter((assignment) => coordinatesFor(assignment) === null),
    [filtered],
  );
  const selectedAssignment = useMemo(
    () =>
      located.find((assignment) => assignment.idAffectation === selectedMissionId) ??
      located[0] ??
      null,
    [located, selectedMissionId],
  );

  const counts = useMemo(() => {
    const result: Record<MapFilter, number> = {
      ALL: 0,
      ACTION: 0,
      IN_PROGRESS: 0,
      TO_VERIFY: 0,
      RESOLVED: 0,
    };
    for (const assignment of teamFiltered) {
      const state = missionState(assignment, latestByAssignment.get(assignment.idAffectation));
      if (state === 'REFUSED') continue;
      result.ALL += 1;
      if (state === 'TO_ACCEPT' || state === 'TO_START' || state === 'RESTART') result.ACTION += 1;
      if (state === 'IN_PROGRESS') result.IN_PROGRESS += 1;
      if (state === 'TO_VERIFY') result.TO_VERIFY += 1;
      if (state === 'RESOLVED') result.RESOLVED += 1;
    }
    return result;
  }, [teamFiltered, latestByAssignment]);

  function openMission(assignment: TeamAssignment) {
    router.push({
      pathname: '/(agent)/missions/[id]',
      params: { id: assignment.idAffectation, teamId: assignment.idEquipe },
    });
  }

  async function openOpenStreetMap(assignment: TeamAssignment) {
    const coordinate = coordinatesFor(assignment);
    if (!coordinate) return;
    const { latitude, longitude } = coordinate;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Carte indisponible', 'Impossible d’ouvrir l’itinéraire sur cet appareil.');
    }
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
          <Text className="text-base font-extrabold text-ink-900">Carte des missions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void load()}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-base"
        >
          <Text className="text-xs">🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#174C3D" />
        }
      >
        {/* Banner with stats */}
        <View className="overflow-hidden rounded-3xl bg-[#0A261E] p-5 shadow-sm">
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
            Cartographie d’intervention
          </Text>
          <Text className="mt-1 text-xl font-extrabold text-white">Localisation des dépôts</Text>
          <View className="mt-4 flex-row gap-2.5">
            <View className="flex-1 rounded-2xl bg-white/10 p-3">
              <Text className="text-xl font-extrabold text-emerald-300">{located.length}</Text>
              <Text className="mt-0.5 text-[10px] font-bold text-white/70">Avec GPS</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/10 p-3">
              <Text className="text-xl font-extrabold text-amber-300">
                {withoutCoordinates.length}
              </Text>
              <Text className="mt-0.5 text-[10px] font-bold text-white/70">À repérer</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/10 p-3">
              <Text className="text-xl font-extrabold text-white">{counts.ACTION}</Text>
              <Text className="mt-0.5 text-[10px] font-bold text-white/70">À traiter</Text>
            </View>
          </View>
        </View>

        {error && (
          <View className="mt-4">
            <FeedbackBanner tone="error" message={error} />
          </View>
        )}

        {/* Team selector pills */}
        {teams.length > 0 && (
          <View className="mt-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedTeamId('ALL')}
                className={`rounded-full px-4 py-2 ${
                  selectedTeamId === 'ALL'
                    ? 'bg-brand-forest'
                    : 'border border-line-strong bg-white'
                }`}
              >
                <Text
                  className={`text-xs ${
                    selectedTeamId === 'ALL' ? 'font-bold text-white' : 'font-semibold text-ink-700'
                  }`}
                >
                  Toutes ({assignments.length})
                </Text>
              </TouchableOpacity>
              {teams.map((t) => {
                const isSel = selectedTeamId === t.idEquipe;
                return (
                  <TouchableOpacity
                    key={t.idEquipe}
                    onPress={() => setSelectedTeamId(t.idEquipe)}
                    className={`rounded-full px-4 py-2 ${
                      isSel ? 'bg-brand-forest' : 'border border-line-strong bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isSel ? 'font-bold text-white' : 'font-semibold text-ink-700'
                      }`}
                    >
                      {t.nomEquipe}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Filter pills */}
        <View className="mt-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7, paddingVertical: 4 }}
          >
            {mapFilters.map((mf) => {
              const active = filter === mf.key;
              return (
                <TouchableOpacity
                  key={mf.key}
                  onPress={() => setFilter(mf.key)}
                  className={`rounded-full px-3.5 py-1.5 ${
                    active ? 'bg-brand-forest' : 'border border-line-subtle bg-white'
                  }`}
                >
                  <Text
                    className={`text-[11px] ${
                      active ? 'font-bold text-white' : 'font-medium text-ink-600'
                    }`}
                  >
                    {mf.label} ({counts[mf.key]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Selected Location card */}
        {selectedAssignment
          ? (() => {
              const coordinate = coordinatesFor(selectedAssignment);
              const state = missionState(
                selectedAssignment,
                latestByAssignment.get(selectedAssignment.idAffectation),
              );
              const presentation = missionPresentation(state);
              return (
                <View className="mt-4 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <View className="rounded-full bg-emerald-100 px-3 py-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950">
                        Point sélectionné
                      </Text>
                    </View>
                    <StatusBadge label={presentation.label} tone={presentation.tone} />
                  </View>

                  <Text className="mt-3 text-base font-extrabold text-ink-900">
                    {selectedAssignment.contenuDossier.typeDechet.libelle}
                  </Text>
                  <Text className="font-mono text-xs font-semibold text-ink-400">
                    #{selectedAssignment.contenuDossier.dossier.referenceDossier}
                  </Text>

                  <Text className="mt-2 text-xs leading-5 text-ink-600">
                    📍{' '}
                    {selectedAssignment.contenuDossier.dossier.descriptionLocalisation ||
                      'Repère non renseigné'}
                  </Text>

                  {coordinate && (
                    <Text className="mt-0.5 font-mono text-[11px] text-emerald-800">
                      GPS : {coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}
                    </Text>
                  )}

                  <View className="mt-4 flex-row gap-2.5 border-t border-line-subtle pt-3.5">
                    <TouchableOpacity
                      onPress={() => openMission(selectedAssignment)}
                      className="flex-1 rounded-2xl border border-line-strong bg-white py-3"
                    >
                      <Text className="text-center text-xs font-bold text-ink-800">
                        Détails de mission
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void openOpenStreetMap(selectedAssignment)}
                      className="flex-1 rounded-2xl bg-brand-forest py-3 shadow-sm"
                    >
                      <Text className="text-center text-xs font-extrabold text-white">
                        🧭 Navigation GPS
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()
          : null}

        {/* Horizontal list of located sites */}
        {located.length > 0 && (
          <View className="mt-5">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
              Sites géolocalisés ({located.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
            >
              {located.map((assignment) => {
                const isSel = selectedAssignment?.idAffectation === assignment.idAffectation;
                return (
                  <TouchableOpacity
                    key={assignment.idAffectation}
                    onPress={() => setSelectedMissionId(assignment.idAffectation)}
                    className={`w-64 rounded-2xl p-4 shadow-sm ${
                      isSel
                        ? 'border-2 border-brand-forest bg-emerald-50/50'
                        : 'border border-line-subtle bg-white'
                    }`}
                  >
                    <Text className="font-mono text-[11px] font-bold text-ink-400">
                      {assignment.contenuDossier.dossier.referenceDossier}
                    </Text>
                    <Text className="mt-1 text-sm font-extrabold text-ink-900" numberOfLines={1}>
                      {assignment.contenuDossier.typeDechet.libelle}
                    </Text>
                    <Text className="mt-1 text-xs text-ink-500" numberOfLines={1}>
                      {assignment.contenuDossier.dossier.descriptionLocalisation ||
                        'Adresse détectée'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* List of missions without coordinates */}
        {withoutCoordinates.length > 0 && (
          <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
            <Text className="text-sm font-extrabold text-ink-900">
              Missions à localiser ({withoutCoordinates.length})
            </Text>
            <Text className="mt-0.5 text-xs text-ink-500">
              Coordonnées GPS non précisées lors du signalement initial.
            </Text>
            <View className="mt-3 gap-2">
              {withoutCoordinates.map((assignment) => (
                <TouchableOpacity
                  key={assignment.idAffectation}
                  onPress={() => openMission(assignment)}
                  className="flex-row items-center justify-between rounded-xl bg-surface-base p-3 border border-line-subtle"
                >
                  <View className="min-w-0 flex-1 pr-2">
                    <Text className="text-xs font-bold text-ink-900">
                      {assignment.contenuDossier.dossier.referenceDossier} •{' '}
                      {assignment.contenuDossier.typeDechet.libelle}
                    </Text>
                    <Text className="text-[11px] text-ink-500" numberOfLines={1}>
                      {assignment.contenuDossier.dossier.descriptionLocalisation ||
                        'Repère textuel manquant'}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-brand-forest">→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
