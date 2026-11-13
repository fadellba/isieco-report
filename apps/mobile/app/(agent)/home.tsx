import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import { listMyTeams, listTeamAssignments, listTeamInterventions, type TeamAssignment, type TeamIntervention } from '../../src/features/interventions/agent-api';
import { BrandMark } from '../../src/ui/BrandMark';

export default function AgentHomeScreen() {
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

  const pending = assignments.filter((item) => item.etatAffectation === 'ACTIVE' && item.decisionEquipe === 'EN_ATTENTE').length;
  const accepted = assignments.filter((item) => item.etatAffectation === 'ACTIVE' && item.decisionEquipe === 'ACCEPTEE').length;
  const inProgress = interventions.filter((item) => item.statutIntervention === 'EN_COURS').length;
  const recent = assignments.filter((item) => item.etatAffectation === 'ACTIVE').slice(0, 3);

  return (
    <ScrollView
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#14532D" />}
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <View className="rounded-full bg-brand-mist px-3 py-2">
          <Text className="text-[10px] font-bold text-brand-forest">ESPACE AGENT</Text>
        </View>
      </View>
      <Text className="mt-9 text-sm font-medium text-ink-500">Bonjour{profile?.prenom ? ` ${profile.prenom}` : ''},</Text>
      <Text className="mt-1 text-[30px] font-extrabold leading-9 tracking-tight text-ink-900">Votre terrain, vos missions.</Text>
      <Text className="mt-3 text-sm leading-6 text-ink-500">
        Retrouvez les affectations de vos équipes et les interventions à faire avancer.
      </Text>

      {error ? (
        <View className="mt-5 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text className="text-sm text-status-danger">{error}</Text>
          <TouchableOpacity onPress={() => void load(true)} className="mt-3 self-start">
            <Text className="text-xs font-bold text-status-danger">Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="mt-7 flex-row gap-2">
        {[
          { label: 'À accepter', value: pending },
          { label: 'Acceptées', value: accepted },
          { label: 'En cours', value: inProgress },
        ].map((item) => (
          <View key={item.label} className="flex-1 rounded-2xl border border-line-subtle bg-white p-3">
            <Text className="text-2xl font-extrabold text-brand-forest">{item.value}</Text>
            <Text className="mt-1 text-[10px] font-semibold text-ink-500">{item.label}</Text>
          </View>
        ))}
      </View>

      <View className="mt-8 flex-row items-end justify-between">
        <View>
          <Text className="text-lg font-extrabold text-ink-900">Vos missions</Text>
          <Text className="mt-1 text-xs text-ink-500">{teamCount} équipe(s) active(s)</Text>
        </View>
        <Link href="/(agent)/missions" className="text-xs font-bold text-brand-forest">Tout voir →</Link>
      </View>

      {loading ? (
        <View className="mt-7 items-center py-8"><ActivityIndicator color="#14532D" /><Text className="mt-3 text-xs text-ink-500">Chargement des affectations…</Text></View>
      ) : null}
      {!loading && teamCount === 0 ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-5">
          <Text className="text-sm font-bold text-ink-800">Aucune équipe active</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-500">Contactez le gestionnaire des référentiels pour vérifier vos appartenances.</Text>
        </View>
      ) : null}
      {!loading && recent.length === 0 && teamCount > 0 ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-5">
          <Text className="text-sm font-bold text-ink-800">Aucune mission active</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-500">Les nouvelles affectations apparaîtront ici.</Text>
        </View>
      ) : null}
      <View className="mt-4 gap-3">
        {recent.map((item) => (
          <Link key={item.idAffectation} href="/(agent)/missions" asChild>
            <TouchableOpacity className="rounded-2xl border border-line-subtle bg-white p-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                  {item.contenuDossier.dossier.referenceDossier}
                </Text>
                <View className="rounded-full bg-brand-mist px-3 py-1">
                  <Text className="text-[9px] font-bold text-brand-forest">{item.decisionEquipe === 'EN_ATTENTE' ? 'À accepter' : 'Acceptée'}</Text>
                </View>
              </View>
              <Text className="mt-2 text-sm font-bold text-ink-900">{item.contenuDossier.typeDechet.libelle}</Text>
              <Text className="mt-1 text-xs text-ink-500">{item.equipe.nomEquipe}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
