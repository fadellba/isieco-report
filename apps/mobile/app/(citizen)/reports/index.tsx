import { useCallback, useState } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { dateLabel, reportStatusLabel } from '../../../src/features/reports/report-format';
import { FeedbackBanner } from '../../../src/ui/FeedbackBanner';
import { listMyReports, type ReportPage } from '../../../src/features/reports/reports-api';
import { BrandMark } from '../../../src/ui/BrandMark';

function reportBadge(status: string) {
  switch (status) {
    case 'SOUMIS':
      return { label: 'Reçu', bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'EN_ATTENTE_COMPLEMENT':
      return { label: 'Action requise', bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'QUALIFIE':
      return { label: 'Validé', bg: 'bg-emerald-100', text: 'text-emerald-800' };
    case 'AFFECTE':
    case 'INTERVENTION_EN_COURS':
      return { label: 'En cours', bg: 'bg-emerald-600', text: 'text-white' };
    case 'RESOLU':
    case 'CLOTURE':
      return { label: 'Nettoyé', bg: 'bg-emerald-800', text: 'text-white' };
    case 'REJETE':
      return { label: 'Rejeté', bg: 'bg-rose-100', text: 'text-rose-800' };
    default:
      return { label: reportStatusLabel(status), bg: 'bg-slate-100', text: 'text-slate-800' };
  }
}

export default function CitizenReportsScreen() {
  const router = useRouter();
  const [result, setResult] = useState<ReportPage | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage = page, refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await listMyReports(targetPage, 30);
        setResult(data);
        setPage(targetPage);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : 'Impossible de charger vos signalements.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page],
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  const filteredItems = (result?.items ?? []).filter((item) => {
    if (filter === 'ACTIVE') {
      return !['RESOLU', 'CLOTURE', 'REJETE'].includes(item.statutSignalement);
    }
    if (filter === 'RESOLVED') {
      return ['RESOLU', 'CLOTURE'].includes(item.statutSignalement);
    }
    return true;
  });

  return (
    <View className="flex-1 bg-[#F8FAF9]">
      {/* Top Header */}
      <View className="flex-row items-center justify-between border-b border-line-subtle bg-white px-5 pb-3.5 pt-12">
        <BrandMark />
        <View className="rounded-full bg-emerald-50 px-3 py-1.5">
          <Text className="text-[10px] font-extrabold tracking-wide text-brand-forest">
            ESPACE CITOYEN
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(1, true)}
            tintColor="#174C3D"
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold tracking-tight text-ink-900">
              Mes signalements
            </Text>
            <Text className="mt-0.5 text-xs text-ink-500">
              Suivi en temps réel de vos déclarations citoyennes
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(citizen)/reports/new')}
            className="flex-row items-center gap-1.5 rounded-2xl bg-brand-forest px-3.5 py-2.5 shadow-sm"
          >
            <Text className="text-white text-xs">📷</Text>
            <Text className="text-xs font-extrabold text-white">Nouveau</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <View className="mt-5 flex-row gap-2">
          {[
            { key: 'ALL' as const, label: 'Tous' },
            { key: 'ACTIVE' as const, label: 'En cours' },
            { key: 'RESOLVED' as const, label: 'Résolus' },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                className={`rounded-full px-4 py-2 ${
                  active ? 'bg-brand-forest shadow-sm' : 'border border-line-subtle bg-white'
                }`}
              >
                <Text
                  className={`text-xs ${
                    active ? 'font-extrabold text-white' : 'font-medium text-ink-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error && (
          <View className="mt-4">
            <FeedbackBanner tone="error" message={error} />
          </View>
        )}

        {loading && !result && (
          <View className="mt-12 items-center">
            <ActivityIndicator size="large" color="#174C3D" />
            <Text className="mt-3 text-xs font-semibold text-ink-500">
              Chargement de vos signalements...
            </Text>
          </View>
        )}

        {!loading && filteredItems.length === 0 && (
          <View className="mt-8 items-center rounded-3xl border border-dashed border-line-strong bg-white p-8 text-center">
            <Text className="text-4xl">🌱</Text>
            <Text className="mt-3 text-base font-extrabold text-ink-900">
              Aucun signalement trouvé
            </Text>
            <Text className="mt-1 text-center text-xs leading-5 text-ink-500">
              Contribuez à préserver notre environnement urbain en signalant le premier dépôt
              illégal.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(citizen)/reports/new')}
              className="mt-5 rounded-2xl bg-brand-forest px-5 py-3 shadow-sm"
            >
              <Text className="text-xs font-extrabold text-white">📷 Signaler un dépôt</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List of items */}
        <View className="mt-5 gap-3">
          {filteredItems.map((item) => {
            const badge = reportBadge(item.statutSignalement);
            return (
              <TouchableOpacity
                key={item.idSignalement}
                onPress={() =>
                  router.push({
                    pathname: '/(citizen)/reports/[id]',
                    params: { id: item.idSignalement },
                  })
                }
                className="overflow-hidden rounded-3xl border border-line-subtle bg-white p-4 shadow-sm active:opacity-85"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono text-[11px] font-bold text-ink-400">
                    #IS-{item.idSignalement.slice(0, 8).toUpperCase()}
                  </Text>
                  <View className={`rounded-full px-2.5 py-0.5 ${badge.bg}`}>
                    <Text className={`text-[10px] font-extrabold ${badge.text}`}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text className="mt-2 text-sm font-extrabold text-ink-900" numberOfLines={1}>
                  {item.description || 'Dépôt sauvage sans description'}
                </Text>

                <View className="mt-2 flex-row items-center justify-between border-t border-line-subtle pt-2.5">
                  <Text className="text-[11px] text-ink-400">
                    Déposé le {dateLabel(item.dateSoumission)}
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
