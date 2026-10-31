import { useCallback, useEffect, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { dateLabel, reportStatusLabel } from '../../../src/features/reports/report-format';
import { listMyReports, type ReportPage } from '../../../src/features/reports/reports-api';

export default function CitizenReportsScreen() {
  const [result, setResult] = useState<ReportPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage = page, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listMyReports(targetPage, 20);
      setResult(data);
      setPage(targetPage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos signalements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useFocusEffect(useCallback(() => { void load(1); }, [load]));

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <ScrollView
      className="flex-1 bg-eco-50"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} />}
    >
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-700">Espace citoyen</Text>
      <Text className="mt-3 text-3xl font-extrabold text-eco-950">Mes signalements</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-600">
        Consultez vos signalements et leur état de traitement. Seuls les signalements de votre compte sont retournés par l’API.
      </Text>

      <Link href="/(citizen)/reports/new" asChild>
        <TouchableOpacity className="mt-6 rounded-xl bg-eco-700 px-5 py-4">
          <Text className="text-center font-bold text-white">Déposer un signalement</Text>
        </TouchableOpacity>
      </Link>

      {error ? <Text className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}
      {loading && !result ? <View className="mt-10 items-center"><ActivityIndicator color="#166534" /><Text className="mt-3 text-sm text-slate-500">Chargement…</Text></View> : null}
      {!loading && result?.items.length === 0 ? (
        <View className="mt-6 rounded-2xl border border-eco-100 bg-white p-5">
          <Text className="text-sm font-semibold text-slate-800">Aucun signalement enregistré</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600">Vous pourrez suivre ici les signalements déposés depuis votre compte.</Text>
        </View>
      ) : null}

      <View className="mt-6 gap-3">
        {result?.items.map((item) => (
          <Link key={item.idSignalement} href={{ pathname: '/(citizen)/reports/[id]', params: { id: item.idSignalement } }} asChild>
            <TouchableOpacity className="rounded-2xl border border-eco-100 bg-white p-5">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-base font-bold text-eco-950" numberOfLines={1}>
                  Signalement #{item.idSignalement.slice(0, 8).toUpperCase()}
                </Text>
                <View className="rounded-full bg-eco-50 px-3 py-1">
                  <Text className="text-[10px] font-bold text-eco-800">{reportStatusLabel(item.statutSignalement)}</Text>
                </View>
              </View>
              <Text className="mt-3 text-sm leading-6 text-slate-700" numberOfLines={3}>{item.description || 'Aucune description.'}</Text>
              <Text className="mt-3 text-xs text-slate-500">Soumis le {dateLabel(item.dateSoumission)}</Text>
              {item.statutSignalement === 'EN_ATTENTE_COMPLEMENT' ? (
                <Text className="mt-2 text-xs font-bold text-amber-700">Une réponse de votre part est attendue.</Text>
              ) : null}
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      {result && result.total > result.pageSize ? (
        <View className="mt-6 flex-row items-center justify-between">
          <TouchableOpacity disabled={page <= 1 || loading} onPress={() => void load(page - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 disabled:opacity-40">
            <Text className="text-xs font-semibold text-slate-700">Précédent</Text>
          </TouchableOpacity>
          <Text className="text-xs text-slate-500">Page {page} / {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages || loading} onPress={() => void load(page + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 disabled:opacity-40">
            <Text className="text-xs font-semibold text-slate-700">Suivant</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Link href="/" className="mt-8 text-center text-sm font-semibold text-eco-700">Retour à l’accueil</Link>
    </ScrollView>
  );
}
