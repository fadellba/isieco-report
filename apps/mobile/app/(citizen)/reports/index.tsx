import { useCallback, useEffect, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { dateLabel, reportStatusLabel } from '../../../src/features/reports/report-format';
import { StatusBadge, type StatusTone } from '../../../src/ui/StatusBadge';
import { FeedbackBanner } from '../../../src/ui/FeedbackBanner';
import { listMyReports, type ReportPage } from '../../../src/features/reports/reports-api';
import { BrandMark } from '../../../src/ui/BrandMark';

function reportTone(status: string): StatusTone {
  if (status === 'REJETE') return 'danger';
  if (status === 'EN_ATTENTE_COMPLEMENT') return 'warning';
  if (status === 'QUALIFIE') return 'success';
  if (status === 'COMPLEMENT_REPONDU') return 'info';
  return 'brand';
}

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
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} />}
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <View className="rounded-full bg-brand-mist px-3 py-2"><Text className="text-[10px] font-extrabold text-brand-forest">ESPACE CITOYEN</Text></View>
      </View>
      <Text className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-petrol">VOTRE SUIVI</Text>
      <Text className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">Mes signalements</Text>
      <Text className="mt-2 text-sm leading-6 text-ink-500">
        Consultez vos signalements et leur état de traitement. Seuls les signalements de votre compte sont retournés par l’API.
      </Text>

      <Link href="/(citizen)/reports/new" asChild>
        <TouchableOpacity className="mt-6 rounded-xl bg-brand-forest px-5 py-4">
          <Text className="text-center font-bold text-white">Déposer un signalement</Text>
        </TouchableOpacity>
      </Link>

      {error ? (
        <View className="mt-5">
          <FeedbackBanner tone="error" message={error} />
          <TouchableOpacity onPress={() => void load(1, true)} className="mt-3 self-start rounded-xl border border-line-strong bg-white px-4 py-2.5">
            <Text className="text-xs font-extrabold text-brand-forest">Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loading && !result ? <View className="mt-10 items-center"><ActivityIndicator color="#174C3D" /><Text className="mt-3 text-sm text-ink-500">Chargement…</Text></View> : null}
      {!loading && result?.items.length === 0 ? (
        <View className="mt-6 rounded-2xl border border-line-subtle bg-white p-5">
          <Text className="text-sm font-semibold text-ink-800">Aucun signalement enregistré</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-500">Vous pourrez suivre ici les signalements déposés depuis votre compte.</Text>
        </View>
      ) : null}

      <View className="mt-6 gap-3">
        {result?.items.map((item) => (
          <Link key={item.idSignalement} href={{ pathname: '/(citizen)/reports/[id]', params: { id: item.idSignalement } }} asChild>
            <TouchableOpacity className="rounded-2xl border border-line-subtle bg-white p-5">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-base font-bold text-ink-900" numberOfLines={1}>
                  Signalement #{item.idSignalement.slice(0, 8).toUpperCase()}
                </Text>
                <StatusBadge label={reportStatusLabel(item.statutSignalement)} tone={reportTone(item.statutSignalement)} />
              </View>
              <Text className="mt-3 text-sm leading-6 text-ink-700" numberOfLines={3}>{item.description || 'Aucune description.'}</Text>
              <Text className="mt-3 text-xs text-ink-500">Soumis le {dateLabel(item.dateSoumission)}</Text>
              {item.statutSignalement === 'EN_ATTENTE_COMPLEMENT' ? (
                <Text className="mt-2 text-xs font-bold text-status-warning">Une réponse de votre part est attendue.</Text>
              ) : null}
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      {result && result.total > result.pageSize ? (
        <View className="mt-6 flex-row items-center justify-between">
          <TouchableOpacity disabled={page <= 1 || loading} onPress={() => void load(page - 1)} className="rounded-lg border border-line-strong bg-white px-4 py-3 disabled:opacity-40">
            <Text className="text-xs font-semibold text-ink-700">Précédent</Text>
          </TouchableOpacity>
          <Text className="text-xs text-ink-500">Page {page} / {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages || loading} onPress={() => void load(page + 1)} className="rounded-lg border border-line-strong bg-white px-4 py-3 disabled:opacity-40">
            <Text className="text-xs font-semibold text-ink-700">Suivant</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Link href="/" className="mt-8 text-center text-sm font-semibold text-brand-forest">Retour à l’accueil</Link>
    </ScrollView>
  );
}
