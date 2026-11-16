import { useCallback, useMemo, useState } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import { listMyReports, type ReportPage } from '../../src/features/reports/reports-api';
import { dateLabel, reportStatusLabel } from '../../src/features/reports/report-format';
import { BrandMark } from '../../src/ui/BrandMark';
import NativeMapCanvas, { type NativeMapMarker } from '../../src/ui/NativeMapCanvas';

const MAP_USER_AGENT = 'ISIECO/0.1.0 (+https://github.com/fadellba/isieco-report)';

export default function CitizenHomeScreen() {
  const router = useRouter();
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
      setResult(await listMyReports(1, 20));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos signalements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const locatedReports = useMemo(
    () => (result?.items ?? []).filter((item) => {
      const latitude = item.latitude === null ? Number.NaN : Number(item.latitude);
      const longitude = item.longitude === null ? Number.NaN : Number(item.longitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude) &&
        latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }),
    [result],
  );

  const mapMarkers = useMemo<NativeMapMarker[]>(
    () => locatedReports.map((item) => ({
      id: item.idSignalement,
      title: 'Signalement #' + item.idSignalement.slice(0, 8).toUpperCase(),
      subtitle: item.descriptionLocalisation || item.description || reportStatusLabel(item.statutSignalement),
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      tone: item.statutSignalement === 'REJETE' ? 'danger' : item.statutSignalement === 'EN_ATTENTE_COMPLEMENT' ? 'warning' : 'success',
    })),
    [locatedReports],
  );

  const openReport = useCallback(async (id: string) => {
    router.push({ pathname: '/(citizen)/reports/[id]', params: { id } });
  }, [router]);

  return (
    <ScrollView
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#16864C" />}
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <Link href="/(citizen)/profile" className="h-10 w-10 items-center justify-center rounded-full border border-line-subtle bg-white">
          <Text className="text-lg font-bold text-brand-forest">···</Text>
        </Link>
      </View>

      <View className="mt-7">
        <Text className="text-xs font-semibold text-ink-500">Bonjour{profile?.prenom ? ' ' + profile.prenom : ''},</Text>
        <Text className="mt-1 text-[27px] font-extrabold leading-8 tracking-tight text-ink-900">
          Ensemble pour une ville plus propre.
        </Text>
        <Text className="mt-2 text-xs leading-5 text-ink-500">
          Signalez un dépôt et suivez les étapes de sa prise en charge.
        </Text>
      </View>

      <Link href="/(citizen)/reports/new" asChild>
        <TouchableOpacity className="mt-5 min-h-[62px] flex-row items-center justify-center rounded-2xl bg-[#11884E] px-5 py-4" accessibilityRole="button">
          <View className="mr-3 h-6 w-7 items-center justify-center rounded-md border-2 border-white">
            <View className="h-3 w-3 rounded-full border-2 border-white" />
          </View>
          <Text className="text-sm font-extrabold text-white">Signaler un dépôt</Text>
        </TouchableOpacity>
      </Link>

      {error ? (
        <View className="mt-4 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text className="text-xs leading-5 text-status-danger">{error}</Text>
          <TouchableOpacity onPress={() => void load(true)} className="mt-3 self-start">
            <Text className="text-xs font-bold text-status-danger">Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-line-subtle bg-white p-4">
          <Text className="text-[10px] font-semibold text-ink-500">Mes signalements</Text>
          <Text className="mt-1 text-2xl font-extrabold text-brand-forest">{loading && !result ? '—' : result?.total ?? 0}</Text>
          <Text className="mt-1 text-[9px] text-ink-400">Total du compte</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-line-subtle bg-white p-4">
          <Text className="text-[10px] font-semibold text-ink-500">Localisés</Text>
          <Text className="mt-1 text-2xl font-extrabold text-brand-forest">{loading && !result ? '—' : locatedReports.length}</Text>
          <Text className="mt-1 text-[9px] text-ink-400">Sur les 20 derniers</Text>
        </View>
      </View>

      <View className="mt-7 flex-row items-end justify-between">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-ink-900">Mes signalements localisés</Text>
          <Text className="mt-1 text-[10px] leading-4 text-ink-500">Seuls vos propres signalements apparaissent sur cette carte.</Text>
        </View>
        <Link href="/(citizen)/reports" className="ml-3 text-[10px] font-extrabold text-brand-forest">Voir tout ›</Link>
      </View>

      <View className="mt-3 overflow-hidden rounded-2xl border border-line-subtle bg-white p-1">
        <NativeMapCanvas
          markers={mapMarkers}
          onSelect={openReport}
          emptyLabel="Les signalements avec coordonnées apparaîtront ici."
          dom={{ style: { width: '100%', height: 205 }, userAgent: MAP_USER_AGENT }}
        />
      </View>

      <View className="mt-7 flex-row items-end justify-between">
        <View>
          <Text className="text-base font-extrabold text-ink-900">Derniers signalements</Text>
          <Text className="mt-1 text-[10px] text-ink-500">Suivez leur état de traitement</Text>
        </View>
        <Link href="/(citizen)/reports" className="text-[10px] font-extrabold text-brand-forest">Tout voir ›</Link>
      </View>

      {loading && !result ? (
        <View className="mt-5 items-center py-7">
          <ActivityIndicator color="#16864C" />
          <Text className="mt-2 text-[10px] text-ink-500">Chargement des signalements…</Text>
        </View>
      ) : null}
      {!loading && result?.items.length === 0 ? (
        <View className="mt-3 rounded-2xl border border-line-subtle bg-white p-4">
          <Text className="text-xs font-bold text-ink-800">Aucun signalement pour le moment</Text>
          <Text className="mt-1 text-[10px] leading-4 text-ink-500">Votre prochain signalement apparaîtra ici avec son état de traitement.</Text>
        </View>
      ) : null}

      <View className="mt-3 gap-2">
        {result?.items.slice(0, 3).map((item) => (
          <Link
            key={item.idSignalement}
            href={{ pathname: '/(citizen)/reports/[id]', params: { id: item.idSignalement } }}
            asChild
          >
            <TouchableOpacity className="rounded-2xl border border-line-subtle bg-white p-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-xs font-extrabold text-ink-900" numberOfLines={1}>
                  Signalement #{item.idSignalement.slice(0, 8).toUpperCase()}
                </Text>
                <View className="rounded-full bg-brand-mist px-3 py-1.5">
                  <Text className="text-[9px] font-extrabold text-brand-forest">{reportStatusLabel(item.statutSignalement)}</Text>
                </View>
              </View>
              <Text className="mt-2 text-[10px] leading-4 text-ink-500" numberOfLines={2}>
                {item.descriptionLocalisation || item.description || 'Aucune description ajoutée.'}
              </Text>
              <Text className="mt-2 text-[9px] text-ink-400">{dateLabel(item.dateSoumission)}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
