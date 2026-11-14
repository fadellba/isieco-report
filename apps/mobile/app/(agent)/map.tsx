import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import MapView, { Marker, type Region } from 'react-native-maps';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  getAgentProfile, listMyTeams, listTeamAssignments, listTeamInterventions,
  type AgentTeam, type TeamAssignment, type TeamIntervention,
} from '../../src/features/interventions/agent-api';
import { dateLabel } from '../../src/features/reports/report-format';
import { FeedbackBanner } from '../../src/ui/FeedbackBanner';
import { StatusBadge, type StatusTone } from '../../src/ui/StatusBadge';

type MissionState = 'TO_ACCEPT' | 'TO_START' | 'IN_PROGRESS' | 'TO_VERIFY' | 'RESTART' | 'RESOLVED' | 'REFUSED';
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
    if (!current || new Date(item.dateHeureDebut ?? 0).getTime() > new Date(current.dateHeureDebut ?? 0).getTime()) {
      latest.set(item.idAffectation, item);
    }
  }
  return latest;
}

function missionState(assignment: TeamAssignment, latest: TeamIntervention | undefined): MissionState {
  if (assignment.decisionEquipe === 'EN_ATTENTE') return 'TO_ACCEPT';
  if (assignment.decisionEquipe === 'REFUSEE') return 'REFUSED';
  if (!latest) return 'TO_START';
  if (latest.statutIntervention === 'EN_COURS') return 'IN_PROGRESS';
  if (latest.verification?.etatVerification === 'REPRISE') return 'RESTART';
  if (latest.verification?.etatVerification === 'VALIDEE') return 'RESOLVED';
  return 'TO_VERIFY';
}

function mapRegionFor(items: TeamAssignment[]): Region | null {
  const points = items
    .map(coordinatesFor)
    .filter((point): point is { latitude: number; longitude: number } => point !== null);
  if (points.length === 0) return null;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const latitudeRange = Math.max(...latitudes) - Math.min(...latitudes);
  const longitudeRange = Math.max(...longitudes) - Math.min(...longitudes);

  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitudeDelta: Math.min(3, Math.max(0.015, latitudeRange * 1.6 + 0.01)),
    longitudeDelta: Math.min(3, Math.max(0.015, longitudeRange * 1.6 + 0.01)),
  };
}

function markerColor(state: MissionState): string {
  switch (state) {
    case 'TO_ACCEPT':
    case 'RESTART':
      return '#B97827';
    case 'TO_START':
    case 'TO_VERIFY':
      return '#28748A';
    case 'IN_PROGRESS':
      return '#2F7773';
    case 'RESOLVED':
      return '#23764F';
    case 'REFUSED':
      return '#B64E43';
  }
}

function missionPresentation(state: MissionState): { label: string; tone: StatusTone; action: string } {
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

function coordinatesFor(assignment: TeamAssignment): { latitude: number; longitude: number } | null {
  const latitude = assignment.contenuDossier.dossier.latitude === null
    ? Number.NaN
    : Number(assignment.contenuDossier.dossier.latitude);
  const longitude = assignment.contenuDossier.dossier.longitude === null
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

      const results = await Promise.all(myTeams.map(async (team) => {
        const [teamAssignments, teamInterventions] = await Promise.all([
          listTeamAssignments(team.idEquipe),
          listTeamInterventions(team.idEquipe),
        ]);
        return { teamAssignments, teamInterventions };
      }));
      const uniqueAssignments = new Map<string, TeamAssignment>();
      const uniqueInterventions = new Map<string, TeamIntervention>();
      for (const result of results) {
        for (const assignment of result.teamAssignments) uniqueAssignments.set(assignment.idAffectation, assignment);
        for (const intervention of result.teamInterventions) uniqueInterventions.set(intervention.idIntervention, intervention);
      }
      setAssignments([...uniqueAssignments.values()]);
      setInterventions([...uniqueInterventions.values()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les missions géolocalisées.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const teamFiltered = useMemo(() => assignments.filter((assignment) =>
    selectedTeamId === 'ALL' || assignment.idEquipe === selectedTeamId,
  ), [assignments, selectedTeamId]);

  const filtered = useMemo(() => teamFiltered
    .filter((assignment) => {
      const state = missionState(assignment, latestByAssignment.get(assignment.idAffectation));
      if (state === 'REFUSED') return false;
      if (filter === 'ALL') return true;
      if (filter === 'ACTION') return state === 'TO_ACCEPT' || state === 'TO_START' || state === 'RESTART';
      if (filter === 'IN_PROGRESS') return state === 'IN_PROGRESS';
      if (filter === 'TO_VERIFY') return state === 'TO_VERIFY';
      return state === 'RESOLVED';
    })
    .sort((left, right) => {
      const rank: Record<MissionState, number> = {
        TO_ACCEPT: 0, RESTART: 1, IN_PROGRESS: 2, TO_START: 3,
        TO_VERIFY: 4, RESOLVED: 5, REFUSED: 6,
      };
      const leftRank = rank[missionState(left, latestByAssignment.get(left.idAffectation))] ?? 99;
      const rightRank = rank[missionState(right, latestByAssignment.get(right.idAffectation))] ?? 99;
      return leftRank - rightRank;
    }), [teamFiltered, filter, latestByAssignment]);

  const located = useMemo(() => filtered.filter((assignment) => coordinatesFor(assignment) !== null), [filtered]);
  const withoutCoordinates = useMemo(() => filtered.filter((assignment) => coordinatesFor(assignment) === null), [filtered]);
  const mapRegion = useMemo(() => mapRegionFor(located), [located]);
  const selectedAssignment = useMemo(
    () => located.find((assignment) => assignment.idAffectation === selectedMissionId) ?? located[0] ?? null,
    [located, selectedMissionId],
  );
  const counts = useMemo(() => {
    const result: Record<MapFilter, number> = { ALL: 0, ACTION: 0, IN_PROGRESS: 0, TO_VERIFY: 0, RESOLVED: 0 };
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

  async function openDirections(assignment: TeamAssignment) {
    const coordinate = coordinatesFor(assignment);
    if (!coordinate) return;
    const url = 'https://www.google.com/maps/dir/?api=1&destination='
      + encodeURIComponent(coordinate.latitude + ',' + coordinate.longitude);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Itinéraire indisponible', 'Aucune application ne peut ouvrir cet itinéraire sur cet appareil.');
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#174C3D" />}
    >
      <View className="overflow-hidden rounded-3xl bg-brand-forest px-5 py-5">
        <Text className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-lime">ESPACE AGENT · TERRAIN</Text>
        <Text className="mt-2 text-2xl font-extrabold text-white">Carte des missions</Text>
        <Text className="mt-2 text-sm leading-6 text-white/75">
          Retrouvez les interventions géolocalisées de vos équipes et ouvrez un itinéraire vers chaque site.
        </Text>
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-3">
            <Text className="text-2xl font-extrabold text-white">{located.length}</Text>
            <Text className="mt-1 text-[10px] font-bold text-white/70">Avec coordonnées</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-3">
            <Text className="text-2xl font-extrabold text-white">{withoutCoordinates.length}</Text>
            <Text className="mt-1 text-[10px] font-bold text-white/70">À localiser</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-3">
            <Text className="text-2xl font-extrabold text-white">{counts.ACTION}</Text>
            <Text className="mt-1 text-[10px] font-bold text-white/70">À traiter</Text>
          </View>
        </View>
      </View>



      {error ? (
        <View className="mt-4">
          <FeedbackBanner tone="error" message={error} />
          <Pressable onPress={() => void load()} className="mt-3 self-start rounded-xl border border-line-strong bg-white px-4 py-2.5">
            <Text className="text-xs font-extrabold text-brand-forest">Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && !assignments.length ? (
        <View className="mt-5 items-center rounded-2xl border border-line-subtle bg-white py-10">
          <ActivityIndicator color="#174C3D" />
          <Text className="mt-3 text-xs font-semibold text-ink-500">Chargement des missions…</Text>
        </View>
      ) : null}

      {!loading && teams.length === 0 ? (
        <View className="mt-5 rounded-2xl border border-line-subtle bg-white p-5">
          <Text className="text-base font-extrabold text-ink-900">Aucune équipe active</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-500">
            Contactez le gestionnaire des référentiels pour vérifier vos appartenances à une équipe.
          </Text>
        </View>
      ) : null}

      {teams.length > 0 ? (
        <>
          <View className="mt-6">
            <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-petrol">ÉQUIPES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTeamId === 'ALL' }}
                onPress={() => setSelectedTeamId('ALL')}
                className={selectedTeamId === 'ALL' ? 'rounded-full bg-brand-forest px-4 py-3' : 'rounded-full border border-line-strong bg-white px-4 py-3'}
              >
                <Text className={selectedTeamId === 'ALL' ? 'text-xs font-extrabold text-white' : 'text-xs font-bold text-ink-700'}>Toutes</Text>
              </Pressable>
              {teams.map((team) => {
                const selected = selectedTeamId === team.idEquipe;
                return (
                  <Pressable
                    key={team.idEquipe}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedTeamId(team.idEquipe)}
                    className={selected ? 'rounded-full bg-brand-forest px-4 py-3' : 'rounded-full border border-line-strong bg-white px-4 py-3'}
                  >
                    <Text className={selected ? 'text-xs font-extrabold text-white' : 'text-xs font-bold text-ink-700'}>{team.nomEquipe}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="mt-4">
            <Text className="text-lg font-extrabold text-ink-900">Missions par localisation</Text>
            <Text className="mt-1 text-xs text-ink-500">{located.length} site(s) géolocalisé(s) · {withoutCoordinates.length} sans coordonnées</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 12 }}>
              {mapFilters.map((item) => {
                const active = filter === item.key;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setFilter(item.key)}
                    className={active ? 'rounded-full bg-brand-forest px-3 py-2.5' : 'rounded-full border border-line-subtle bg-white px-3 py-2.5'}
                  >
                    <Text className={active ? 'text-[10px] font-extrabold text-white' : 'text-[10px] font-bold text-ink-600'}>
                      {item.label} · {counts[item.key]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {located.length === 0 || !mapRegion ? (
            <View className="rounded-2xl border border-line-subtle bg-white px-5 py-7">
              <Text className="text-sm font-extrabold text-ink-900">Aucun site géolocalisé dans cette vue</Text>
              <Text className="mt-2 text-sm leading-6 text-ink-500">
                Essayez un autre filtre ou vérifiez les missions sans coordonnées ci-dessous.
              </Text>
            </View>
          ) : (
            <>
              <View className="overflow-hidden rounded-3xl border border-line-subtle bg-white">
                <MapView
                  key={selectedTeamId + ':' + filter + ':' + located.length}
                  style={{ width: '100%', height: 340 }}
                  initialRegion={mapRegion}
                  mapType="standard"
                  showsCompass
                  showsScale
                  toolbarEnabled
                  rotateEnabled
                  pitchEnabled={false}
                  moveOnMarkerPress={false}
                >
                  {located.map((assignment) => {
                    const coordinate = coordinatesFor(assignment);
                    if (!coordinate) return null;
                    const state = missionState(assignment, latestByAssignment.get(assignment.idAffectation));
                    return (
                      <Marker
                        key={assignment.idAffectation}
                        coordinate={coordinate}
                        title={assignment.contenuDossier.dossier.referenceDossier}
                        description={assignment.contenuDossier.typeDechet.libelle}
                        pinColor={markerColor(state)}
                        onPress={() => setSelectedMissionId(assignment.idAffectation)}
                      />
                    );
                  })}
                </MapView>
                <View className="flex-row items-center justify-between border-t border-line-subtle bg-white px-4 py-3">
                  <Text className="text-[10px] font-extrabold text-ink-700">Carte interactive · {located.length} marqueur(s)</Text>
                  <Text className="text-[9px] font-semibold text-ink-400">Déplacez et zoomez sur la carte</Text>
                </View>
              </View>

              {selectedAssignment ? (() => {
                const state = missionState(selectedAssignment, latestByAssignment.get(selectedAssignment.idAffectation));
                const presentation = missionPresentation(state);
                const coordinate = coordinatesFor(selectedAssignment);
                return (
                  <View className="mt-3 rounded-3xl border border-line-subtle bg-white p-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-petrol">DOSSIER · {selectedAssignment.contenuDossier.dossier.referenceDossier}</Text>
                        <Text className="mt-1 text-sm font-extrabold text-ink-900">{selectedAssignment.contenuDossier.typeDechet.libelle}</Text>
                      </View>
                      <StatusBadge label={presentation.label} tone={presentation.tone} />
                    </View>
                    <Text className="mt-3 text-xs leading-5 text-ink-600">
                      {selectedAssignment.contenuDossier.dossier.descriptionLocalisation || 'Description du lieu non renseignée'}
                    </Text>
                    <Text className="mt-1 text-[10px] text-ink-400">
                      {coordinate ? coordinate.latitude.toFixed(5) + ', ' + coordinate.longitude.toFixed(5) : ''}
                      {selectedAssignment.contenuDossier.dossier.precisionLocalisation ? ' · ' + selectedAssignment.contenuDossier.dossier.precisionLocalisation : ''}
                    </Text>
                    <Text className="mt-2 text-[10px] font-medium text-ink-400">
                      {selectedAssignment.equipe.nomEquipe} · affectée le {dateLabel(selectedAssignment.dateHeureAffectation)}
                    </Text>
                    <View className="mt-4 flex-row gap-2 border-t border-line-subtle pt-3">
                      <Pressable onPress={() => openMission(selectedAssignment)} className="flex-1 rounded-xl border border-line-strong bg-white px-3 py-3">
                        <Text className="text-center text-[10px] font-extrabold text-brand-forest">Détails de la mission</Text>
                      </Pressable>
                      <Pressable onPress={() => void openDirections(selectedAssignment)} className="flex-1 rounded-xl bg-brand-forest px-3 py-3">
                        <Text className="text-center text-[10px] font-extrabold text-white">Itinéraire</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })() : null}

              <View className="mt-4">
                <Text className="text-xs font-extrabold text-ink-900">Sites affichés sur la carte</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
                  {located.map((assignment) => {
                    const selected = selectedAssignment?.idAffectation === assignment.idAffectation;
                    const state = missionState(assignment, latestByAssignment.get(assignment.idAffectation));
                    const presentation = missionPresentation(state);
                    return (
                      <Pressable
                        key={assignment.idAffectation}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedMissionId(assignment.idAffectation)}
                        className={selected ? 'w-56 rounded-2xl border border-brand-petrol bg-brand-mist p-3' : 'w-56 rounded-2xl border border-line-subtle bg-white p-3'}
                      >
                        <Text className="text-[9px] font-extrabold text-brand-petrol">{assignment.contenuDossier.dossier.referenceDossier}</Text>
                        <Text numberOfLines={1} className="mt-1 text-xs font-extrabold text-ink-900">{assignment.contenuDossier.typeDechet.libelle}</Text>
                        <Text className="mt-2 text-[9px] font-semibold text-ink-500">{presentation.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}

          {withoutCoordinates.length > 0 ? (
            <View className="mt-5 rounded-2xl border border-line-subtle bg-white p-4">
              <Text className="text-sm font-extrabold text-ink-900">Missions sans coordonnées ({withoutCoordinates.length})</Text>
              <Text className="mt-1 text-xs leading-5 text-ink-500">Ces missions restent accessibles, mais aucun itinéraire ne peut être généré tant que leur localisation n’est pas renseignée.</Text>
              <View className="mt-3 gap-2">
                {withoutCoordinates.map((assignment) => (
                  <Pressable key={assignment.idAffectation} onPress={() => openMission(assignment)} className="flex-row items-center justify-between rounded-xl bg-surface-soft px-3 py-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-extrabold text-ink-900">{assignment.contenuDossier.dossier.referenceDossier}</Text>
                      <Text className="mt-1 text-[10px] text-ink-500" numberOfLines={1}>{assignment.contenuDossier.dossier.descriptionLocalisation || 'Lieu non renseigné'}</Text>
                    </View>
                    <Text className="ml-3 text-[10px] font-extrabold text-brand-forest">Ouvrir ›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
