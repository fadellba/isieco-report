import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import { listMyReports, type ReportPage } from '../../src/features/reports/reports-api';
import { dateLabel, reportStatusLabel } from '../../src/features/reports/report-format';
import { BrandMark } from '../../src/ui/BrandMark';

export default function CitizenHomeScreen() {
  const { profile } = useMobileAuth();
  const [result, setResult] = useState<ReportPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setResult(await listMyReports(1, 3));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos signalements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#174C3D" />}
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <View className="rounded-full bg-brand-mist px-3 py-2">
          <Text className="text-[10px] font-bold text-brand-forest">ESPACE CITOYEN</Text>
        </View>
      </View>

      <Text className="mt-9 text-sm font-medium text-ink-500">Bonjour{profile?.prenom ? ` ${profile.prenom}` : ''},</Text>
      <Text className="mt-1 text-[30px] font-extrabold leading-9 tracking-tight text-ink-900">
        Signalez un dépôt sauvage près de chez vous.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-ink-500">
        Localisez le problème, décrivez les faits et suivez chaque étape de son traitement.
      </Text>

      <View className="mt-7 overflow-hidden rounded-[28px] bg-brand-forest p-6">
        <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">Un problème à signaler ?</Text>
        <Text className="mt-3 text-2xl font-extrabold leading-8 text-white">Aidez les équipes à localiser le dépôt.</Text>
        <Text className="mt-2 text-sm leading-5 text-white/75">Indiquez le lieu et décrivez la situation. Une photo est facultative, mais peut aider l’équipe à identifier le dépôt.</Text>
        <Link href="/(citizen)/reports/new" asChild>
          <TouchableOpacity className="mt-6 flex-row items-center justify-center rounded-2xl bg-white px-4 py-4">
            <Text className="mr-2 text-xl font-bold text-brand-forest">＋</Text>
            <Text className="text-sm font-extrabold text-brand-forest">Signaler un dépôt</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="mt-6 rounded-2xl border border-line-subtle bg-white p-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-petrol">Après l’envoi</Text>
        <Text className="mt-1 text-sm font-extrabold text-ink-900">Un suivi à chaque étape</Text>
        <View className="mt-4 flex-row items-start">
          {[
            { number: '01', label: 'Reçu' },
            { number: '02', label: 'Qualifié' },
            { number: '03', label: 'Intervention' },
            { number: '04', label: 'Vérifié' },
          ].map((item, index) => (
            <View key={item.number} className="min-w-0 flex-1 items-center">
              <View className={index === 0 ? 'h-7 w-7 items-center justify-center rounded-full bg-brand-forest' : 'h-7 w-7 items-center justify-center rounded-full bg-brand-mist'}>
                <Text className={index === 0 ? 'text-[9px] font-extrabold text-white' : 'text-[9px] font-extrabold text-brand-forest'}>{item.number}</Text>
              </View>
              <Text className="mt-2 text-center text-[9px] font-bold text-ink-500">{item.label}</Text>
            </View>
          ))}
        </View>
        <Text className="mt-3 text-[10px] leading-4 text-ink-400">La clôture intervient après la vérification du compte rendu terrain.</Text>
      </View>

      <View className="mt-8 flex-row items-end justify-between">
        <View>
          <Text className="text-lg font-extrabold text-ink-900">Mes signalements</Text>
          <Text className="mt-1 text-xs text-ink-500">Le suivi de vos déclarations</Text>
        </View>
        <Link href="/(citizen)/reports" className="text-xs font-bold text-brand-forest">Voir tout →</Link>
      </View>

      {error ? (
        <View className="mt-4 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text className="text-sm leading-5 text-status-danger">{error}</Text>
          <TouchableOpacity onPress={() => void load(true)} className="mt-3 self-start">
            <Text className="text-xs font-bold text-status-danger">Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loading && !result ? (
        <View className="mt-7 items-center py-8"><ActivityIndicator color="#14532D" /><Text className="mt-3 text-xs text-ink-500">Chargement…</Text></View>
      ) : null}
      {!loading && result?.items.length === 0 ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-5">
          <Text className="text-sm font-bold text-ink-800">Aucun signalement pour le moment</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-500">Votre prochain signalement apparaîtra ici avec son état de traitement.</Text>
        </View>
      ) : null}
      <View className="mt-4 gap-3">
        {result?.items.map((item) => (
          <Link
            key={item.idSignalement}
            href={{ pathname: '/(citizen)/reports/[id]', params: { id: item.idSignalement } }}
            asChild
          >
            <TouchableOpacity className="rounded-2xl border border-line-subtle bg-white p-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-sm font-bold text-ink-900" numberOfLines={1}>
                  Signalement #{item.idSignalement.slice(0, 8).toUpperCase()}
                </Text>
                <View className="rounded-full bg-brand-mist px-3 py-1.5">
                  <Text className="text-[9px] font-bold text-brand-forest">{reportStatusLabel(item.statutSignalement)}</Text>
                </View>
              </View>
              <Text className="mt-2 text-xs leading-5 text-ink-500" numberOfLines={2}>
                {item.description || 'Aucune description ajoutée.'}
              </Text>
              <Text className="mt-3 text-[10px] text-ink-400">{dateLabel(item.dateSoumission)}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
