import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import {
  listMyTeams,
  listTeamAssignments,
  listTeamInterventions,
  type TeamAssignment,
  type TeamIntervention,
} from '../../src/features/interventions/agent-api';
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

  const pending = assignments.filter(
    (item) => item.etatAffectation === 'ACTIVE' && item.decisionEquipe === 'EN_ATTENTE',
  ).length;
  const inProgress = interventions.filter((item) => item.statutIntervention === 'EN_COURS').length;
  const completed = interventions.filter((item) => item.statutIntervention === 'SOUMISE').length;

  const nextMission = assignments.find((item) => item.etatAffectation === 'ACTIVE');
  const recentAssignments = assignments
    .filter((item) => item.etatAffectation === 'ACTIVE')
    .slice(0, 4);

  const initials =
    [profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'AG';

  return (
    <View className="flex-1 bg-[#F8FAF9]">
      {/* Top Header matching Screen 5 in ref */}
      <View className="flex-row items-center justify-between border-b border-line-subtle bg-white px-5 pb-3.5 pt-12">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-forest shadow-sm">
            <Text className="text-xs font-extrabold text-white">{initials}</Text>
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-extrabold text-ink-900">
                Bonjour{profile?.prenom ? ` ${profile.prenom}` : ''}
              </Text>
              <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                <Text className="text-[9px] font-extrabold text-emerald-800">Agent terrain</Text>
              </View>
            </View>
            <Text className="text-[11px] text-ink-400">Équipes de propreté urbaine</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(agent)/map')}
          className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100"
        >
          <Text className="text-base">🧭</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor="#174C3D"
          />
        }
      >
        {/* Section title & Counters matching Screen 5 */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold tracking-tight text-ink-900">
              Mes missions
            </Text>
            <Text className="mt-0.5 text-xs text-ink-500">
              {assignments.length} mission(s) répertoriée(s)
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(agent)/missions')}
            className="rounded-full bg-surface-base px-3 py-1.5 border border-line-subtle"
          >
            <Text className="text-xs font-bold text-brand-forest">Tout voir →</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Metric Pills */}
        <View className="mt-4 flex-row gap-2.5">
          <View className="flex-1 rounded-2xl border border-line-subtle bg-white p-3.5 shadow-sm">
            <Text className="text-2xl font-extrabold text-amber-600">{pending}</Text>
            <Text className="mt-1 text-[11px] font-bold text-ink-600">À accepter</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-line-subtle bg-white p-3.5 shadow-sm">
            <Text className="text-2xl font-extrabold text-emerald-700">{inProgress}</Text>
            <Text className="mt-1 text-[11px] font-bold text-ink-600">En cours</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-line-subtle bg-white p-3.5 shadow-sm">
            <Text className="text-2xl font-extrabold text-slate-700">{completed}</Text>
            <Text className="mt-1 text-[11px] font-bold text-ink-600">Terminées</Text>
          </View>
        </View>

        {/* PROCHAINE MISSION HERO CARD (Matching Screen 5) */}
        {nextMission ? (
          <View className="mt-5 overflow-hidden rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="rounded-full bg-emerald-100 px-3 py-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                  Prochaine intervention
                </Text>
              </View>
              <Text className="font-mono text-xs font-bold text-ink-400">
                {nextMission.contenuDossier.dossier.referenceDossier}
              </Text>
            </View>

            <View className="mt-4 flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
                <Text className="text-2xl">🚛</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-extrabold text-ink-900" numberOfLines={1}>
                  {nextMission.contenuDossier.typeDechet.libelle}
                </Text>
                <Text className="mt-0.5 text-xs text-ink-500">
                  Équipe : {nextMission.equipe.nomEquipe}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <View className="rounded-full bg-surface-base px-2.5 py-0.5 border border-line-subtle">
                    <Text className="text-[10px] font-bold text-ink-600">
                      {nextMission.decisionEquipe === 'EN_ATTENTE' ? 'À valider' : 'Prêt'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2.5 border-t border-line-subtle pt-3.5">
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(agent)/missions/[id]',
                    params: { id: nextMission.idAffectation, teamId: nextMission.idEquipe },
                  })
                }
                className="flex-1 rounded-2xl bg-brand-forest py-3 shadow-sm"
              >
                <Text className="text-center text-xs font-extrabold text-white">
                  Ouvrir la mission
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(agent)/map')}
                className="rounded-2xl border border-line-strong bg-white px-4 py-3"
              >
                <Text className="text-xs font-extrabold text-ink-800">🧭 Carte</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* RECENT MISSIONS LIST */}
        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-sm font-extrabold text-ink-900">Toutes les affectations</Text>
          <Text className="text-xs text-ink-400">{teamCount} équipe(s)</Text>
        </View>

        {loading && (
          <View className="mt-8 items-center py-6">
            <ActivityIndicator size="small" color="#174C3D" />
            <Text className="mt-3 text-xs text-ink-500">Chargement de vos missions...</Text>
          </View>
        )}

        {!loading && recentAssignments.length === 0 && (
          <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-6 text-center">
            <Text className="text-2xl">🌱</Text>
            <Text className="mt-2 text-sm font-extrabold text-ink-900">
              Aucune mission pour le moment
            </Text>
            <Text className="mt-1 text-xs text-ink-500">
              Les affectations confiées à vos équipes s’afficheront dès leur attribution.
            </Text>
          </View>
        )}

        <View className="mt-3 gap-2.5">
          {recentAssignments.map((item) => (
            <TouchableOpacity
              key={item.idAffectation}
              onPress={() =>
                router.push({
                  pathname: '/(agent)/missions/[id]',
                  params: { id: item.idAffectation, teamId: item.idEquipe },
                })
              }
              className="rounded-2xl border border-line-subtle bg-white p-4 shadow-sm active:opacity-80"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-xs font-bold text-ink-400">
                  {item.contenuDossier.dossier.referenceDossier}
                </Text>
                <View
                  className={`rounded-full px-2.5 py-0.5 ${
                    item.decisionEquipe === 'EN_ATTENTE' ? 'bg-amber-100' : 'bg-emerald-100'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-extrabold ${
                      item.decisionEquipe === 'EN_ATTENTE' ? 'text-amber-900' : 'text-emerald-900'
                    }`}
                  >
                    {item.decisionEquipe === 'EN_ATTENTE' ? 'À accepter' : 'Acceptée'}
                  </Text>
                </View>
              </View>

              <Text className="mt-1.5 text-sm font-extrabold text-ink-900">
                {item.contenuDossier.typeDechet.libelle}
              </Text>
              <Text className="mt-0.5 text-xs text-ink-500">{item.equipe.nomEquipe}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
