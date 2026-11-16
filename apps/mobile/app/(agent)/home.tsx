import { useCallback, useMemo, useState } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import { listMyTeams, listTeamAssignments, listTeamInterventions, type TeamAssignment, type TeamIntervention } from '../../src/features/interventions/agent-api';
import { BrandMark } from '../../src/ui/BrandMark';
import NativeMapCanvas, { type NativeMapMarker } from '../../src/ui/NativeMapCanvas';

const MAP_USER_AGENT = 'ISIECO/0.1.0 (+https://github.com/fadellba/isieco-report)';

function coordinatesFor(assignment: TeamAssignment) {
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

export default function AgentHomeScreen() {
  const router = useRouter();
  const { profile } = useMobileAuth();
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [interventions, setInterventions] = useState<TeamIntervention[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const teams = await listMyTeams();
      setTeamCount(teams.length);
      const [assignmentGroups, interventionGroups] = await Promise.all([
        Promise.all(teams.map((team) => listTeamAssignments(team.idEquipe))),
        Promise.all(teams.map((team) => listTeamInterventions(team.idEquipe))),
      ]);
      setAssignments(assignmentGroups.flat());
      setInterventions(interventionGroups.flat());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos missions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.etatAffectation === 'ACTIVE' && item.decisionEquipe !== 'REFUSEE'),
    [assignments],
  );
  const pending = assignments.filter((item) => item.etatAffectation === 'ACTIVE' && item.decisionEquipe === 'EN_ATTENTE').length;
  const accepted = assignments.filter((item) => item.etatAffectation === 'ACTIVE' && item.decisionEquipe === 'ACCEPTEE').length;
  const inProgress = interventions.filter((item) => item.statutIntervention === 'EN_COURS').length;
  const nextMission = activeAssignments.find((item) => item.decisionEquipe === 'EN_ATTENTE') ?? activeAssignments[0] ?? null;

  const mapMarkers = useMemo<NativeMapMarker[]>(() => activeAssignments.flatMap((assignment) => {
    const coordinate = coordinatesFor(assignment);
    if (!coordinate) return [];
    return [{
      id: assignment.idAffectation,
      title: assignment.contenuDossier.dossier.referenceDossier,
      subtitle: assignment.contenuDossier.dossier.descriptionLocalisation || assignment.contenuDossier.typeDechet.libelle,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      tone: assignment.decisionEquipe === 'EN_ATTENTE' ? 'warning' : 'success',
    }];
  }), [activeAssignments]);

  const openMission = useCallback(async (id: string) => {
    const assignment = assignments.find((item) => item.idAffectation === id);
    if (!assignment) return;
    router.push({
      pathname: '/(agent)/missions/[id]',
      params: { id: assignment.idAffectation, teamId: assignment.idEquipe },
    });
  }, [assignments, router]);

  function openNextMission() {
    if (!nextMission) return;
    router.push({
      pathname: '/(agent)/missions/[id]',
      params: { id: nextMission.idAffectation, teamId: nextMission.idEquipe },
    });
  }

  const nextCoordinate = nextMission ? coordinatesFor(nextMission) : null;

  return (
    <ScrollView
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 17, paddingTop: 18, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#16864C" />}
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <View className="rounded-full bg-brand-mist px-3 py-2">
          <Text className="text-[9px] font-extrabold text-brand-forest">ESPACE AGENT</Text>
        </View>
      </View>

      <View className="mt-5 overflow-hidden rounded-[27px] bg-[#073E3C] p-5">
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#D7E6A5]">AGENT TERRAIN · ISIECO</Text>
            <Text className="mt-2 text-[23px] font-extrabold text-white">Bonjour{profile?.prenom ? ' ' + profile.prenom : ''}</Text>
            <Text className="mt-1 text-[11px] leading-5 text-white/70">Vos missions et interventions du jour.</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <Text className="text-sm font-extrabold text-white">{[profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'AG'}</Text>
          </View>
        </View>

        <View className="mt-5 flex-row gap-2">
          {[
            { label: 'À accepter', value: pending, tone: 'bg-[#DDF0FF]', text: 'text-[#1769A6]' },
            { label: 'Acceptées', value: accepted, tone: 'bg-[#E0F2E2]', text: 'text-[#1A7546]' },
            { label: 'En cours', value: inProgress, tone: 'bg-[#FFF0DB]', text: 'text-[#A96B1B]' },
          ].map((item) => (
            <View key={item.label} className="min-w-0 flex-1 rounded-2xl bg-white/10 p-3">
              <Text className="text-2xl font-extrabold text-white">{loading ? '—' : item.value}</Text>
              <Text className="mt-1 text-[9px] font-bold text-white/75">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {error ? (
        <View className="mt-4 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text className="text-xs leading-5 text-status-danger">{error}</Text>
          <TouchableOpacity onPress={() => void load(true)} className="mt-3 self-start">
            <Text className="text-xs font-bold text-status-danger">Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="mt-6 flex-row items-end justify-between">
        <View>
          <Text className="text-base font-extrabold text-ink-900">Prochaine mission</Text>
          <Text className="mt-1 text-[10px] text-ink-500">{teamCount} équipe(s) active(s)</Text>
        </View>
        <Link href="/(agent)/missions" className="text-[10px] font-extrabold text-brand-forest">Voir tout ›</Link>
      </View>

      {loading && !assignments.length ? (
        <View className="mt-4 items-center rounded-2xl border border-line-subtle bg-white py-8">
          <ActivityIndicator color="#16864C" />
          <Text className="mt-2 text-[10px] text-ink-500">Chargement des affectations…</Text>
        </View>
      ) : null}
      {!loading && teamCount === 0 ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-5">
          <Text className="text-sm font-bold text-ink-800">Aucune équipe active</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-500">Contactez le gestionnaire des référentiels pour vérifier vos appartenances.</Text>
        </View>
      ) : null}
      {!loading && !nextMission && teamCount > 0 ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-5">
          <Text className="text-sm font-bold text-ink-800">Aucune mission active</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-500">Les nouvelles affectations apparaîtront ici.</Text>
        </View>
      ) : null}

      {nextMission ? (
        <View className="mt-3 overflow-hidden rounded-3xl border border-line-subtle bg-white">
          <View className="p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-petrol">DOSSIER · {nextMission.contenuDossier.dossier.referenceDossier}</Text>
                <Text className="mt-1 text-sm font-extrabold text-ink-900">{nextMission.contenuDossier.typeDechet.libelle}</Text>
                <Text className="mt-1 text-[10px] text-ink-500">{nextMission.equipe.nomEquipe}</Text>
              </View>
              <View className={nextMission.decisionEquipe === 'EN_ATTENTE' ? 'rounded-full bg-[#FFF1DB] px-3 py-1.5' : 'rounded-full bg-brand-mist px-3 py-1.5'}>
                <Text className={nextMission.decisionEquipe === 'EN_ATTENTE' ? 'text-[9px] font-extrabold text-[#A96B1B]' : 'text-[9px] font-extrabold text-brand-forest'}>
                  {nextMission.decisionEquipe === 'EN_ATTENTE' ? 'À accepter' : 'Acceptée'}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-[10px] leading-4 text-ink-500">
              {nextMission.contenuDossier.dossier.descriptionLocalisation || 'Localisation non renseignée'}
            </Text>
          </View>

          {nextCoordinate ? (
            <NativeMapCanvas
              markers={mapMarkers}
              selectedId={nextMission.idAffectation}
              onSelect={openMission}
              emptyLabel="Aucun point géographique disponible."
              dom={{ style: { width: '100%', height: 165 }, userAgent: MAP_USER_AGENT }}
            />
          ) : (
            <View className="items-center justify-center bg-surface-soft px-4 py-7">
              <Text className="text-xs font-bold text-ink-700">Cette mission ne possède pas de coordonnées GPS.</Text>
            </View>
          )}

          <View className="flex-row gap-2 p-3">
            <TouchableOpacity onPress={openNextMission} className="flex-1 rounded-xl bg-brand-forest px-3 py-3">
              <Text className="text-center text-[10px] font-extrabold text-white">Voir la mission</Text>
            </TouchableOpacity>
            <Link href="/(agent)/map" asChild>
              <TouchableOpacity className="flex-1 rounded-xl border border-line-strong bg-white px-3 py-3">
                <Text className="text-center text-[10px] font-extrabold text-brand-forest">Toutes les cartes</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      ) : null}

      <View className="mt-6 flex-row items-center justify-between">
        <View>
          <Text className="text-base font-extrabold text-ink-900">Vos équipes</Text>
          <Text className="mt-1 text-[10px] text-ink-500">Missions et interventions affectées</Text>
        </View>
        <Link href="/(agent)/missions" className="text-[10px] font-extrabold text-brand-forest">Toutes les missions ›</Link>
      </View>
      <View className="mt-3 gap-2">
        {activeAssignments.slice(0, 3).map((assignment) => (
          <TouchableOpacity
            key={assignment.idAffectation}
            onPress={() => void openMission(assignment.idAffectation)}
            className="rounded-2xl border border-line-subtle bg-white p-3"
          >
            <Text className="text-[9px] font-extrabold text-brand-petrol">{assignment.equipe.nomEquipe}</Text>
            <Text className="mt-1 text-xs font-bold text-ink-900">{assignment.contenuDossier.dossier.referenceDossier} · {assignment.contenuDossier.typeDechet.libelle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
