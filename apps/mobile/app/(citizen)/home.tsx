import { useCallback, useEffect, useState } from 'react';
import { AppState, ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import {
  listMyReports,
  listNearbyReports,
  type NearbyReportsResult,
  type ReportPage,
} from '../../src/features/reports/reports-api';
import { getOfflineReportQueue, syncOfflineReports } from '../../src/features/reports/offline-report-outbox';
import { dateLabel, reportStatusLabel } from '../../src/features/reports/report-format';
import { requestCurrentForegroundCoordinates } from '../../src/features/media/mobile-media';
import { BrandMark } from '../../src/ui/BrandMark';
import { NearbyReportsMap } from '../../src/ui/NearbyReportsMap';

interface Coordinates {
  latitude: number;
  longitude: number;
}

export default function CitizenHomeScreen() {
  const router = useRouter();
  const { profile } = useMobileAuth();
  const ownerId = profile?.utilisateurId ?? null;
  const [result, setResult] = useState<ReportPage | null>(null);
  const [nearby, setNearby] = useState<NearbyReportsResult | null>(null);
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setResult(await listMyReports(1, 5));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos signalements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshOfflineQueue = useCallback(async (attemptSync: boolean) => {
    if (!ownerId) {
      setPendingOfflineCount(0);
      return;
    }
    try {
      const queued = await getOfflineReportQueue(ownerId);
      setPendingOfflineCount(queued.length);
      if (!attemptSync || queued.length === 0) return;

      setSyncBusy(true);
      const synced = await syncOfflineReports(ownerId);
      setPendingOfflineCount(synced.remaining);
      if (synced.synced > 0) {
        setSyncMessage(synced.synced + ' signalement(s) synchronisé(s) avec le serveur.');
        void load(true);
      }
    } catch (reason) {
      setSyncMessage(reason instanceof Error ? reason.message : 'La synchronisation est indisponible.');
    } finally {
      setSyncBusy(false);
    }
  }, [ownerId, load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshOfflineQueue(true);
    }, [load, refreshOfflineQueue]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshOfflineQueue(true);
      }
    });
    return () => subscription.remove();
  }, [refreshOfflineQueue]);

  async function loadNearbyReports() {
    setLocationBusy(true);
    setLocationError(null);
    try {
      const position = await requestCurrentForegroundCoordinates();
      const coordinates = { latitude: position.latitude, longitude: position.longitude };
      setCenter(coordinates);
      setNearby(await listNearbyReports(coordinates.latitude, coordinates.longitude, 3000));
    } catch (reason) {
      setLocationError(reason instanceof Error ? reason.message : 'Position indisponible. Vérifiez les autorisations ou réessayez.');
    } finally {
      setLocationBusy(false);
    }
  }

  const items = result?.items ?? [];
  const inProgressCount = result
    ? items.filter((item) => !['QUALIFIE', 'REJETE'].includes(item.statutSignalement)).length
    : 0;
  const resolvedCount = result
    ? items.filter((item) => item.statutSignalement === 'QUALIFIE').length
    : 0;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#16A34A" />}
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les notifications"
          onPress={() => router.push('/notifications')}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <Text className="text-lg">🔔</Text>
        </Pressable>
      </View>

      {pendingOfflineCount > 0 ? (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-extrabold text-amber-900">
                {pendingOfflineCount} signalement(s) en attente de synchronisation
              </Text>
              <Text className="mt-1 text-[10px] leading-4 text-amber-800">
                Conservés sur cet appareil et associés au compte connecté.
              </Text>
            </View>
            <Pressable
              onPress={() => { setSyncMessage(null); void refreshOfflineQueue(true); }}
              disabled={syncBusy}
              className="rounded-lg bg-amber-800 px-3 py-2 disabled:opacity-60"
            >
              <Text className="text-[10px] font-bold text-white">
                {syncBusy ? 'Envoi…' : 'Synchroniser'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {syncMessage ? <Text className="mt-2 text-xs text-emerald-800">{syncMessage}</Text> : null}

      <View className="mt-6">
        <Text className="text-2xl font-black leading-tight tracking-tight text-slate-900">
          Ensemble pour une ville plus propre 🌱
        </Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          Signalez un dépôt et suivez son traitement depuis votre espace.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/(citizen)/reports/new')}
        className="mt-5 h-14 w-full flex-row items-center justify-center rounded-2xl bg-emerald-700 shadow-sm"
      >
        <Text className="mr-2 text-lg">📷</Text>
        <Text className="text-sm font-extrabold text-white">Signaler un dépôt</Text>
      </Pressable>

      <View className="mt-7">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-slate-900">Signalements à proximité</Text>
          {center ? (
            <Pressable onPress={() => void loadNearbyReports()} disabled={locationBusy}>
              <Text className="text-xs font-bold text-emerald-700">Actualiser</Text>
            </Pressable>
          ) : null}
        </View>
        <Text className="mb-3 text-xs leading-5 text-slate-500">
          La carte affiche des signalements qualifiés dans un rayon de 3 km. Votre position n’est demandée qu’après votre action.
        </Text>
        {!center ? (
          <Pressable
            onPress={() => void loadNearbyReports()}
            disabled={locationBusy}
            className="h-12 flex-row items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 disabled:opacity-60"
          >
            {locationBusy ? <ActivityIndicator color="#166534" /> : (
              <Text className="text-sm font-bold text-emerald-800">📍 Me localiser pour afficher la carte</Text>
            )}
          </Pressable>
        ) : (
          <>
            <NearbyReportsMap center={center} markers={nearby?.items ?? []} />
            <Text className="mt-2 text-[11px] text-slate-500">
              {nearby?.items.length
                ? nearby.items.length + ' signalement(s) qualifié(s) affiché(s).'
                : 'Aucun signalement qualifié trouvé dans ce rayon.'}
            </Text>
          </>
        )}
        {locationError ? <Text className="mt-2 text-xs text-rose-700">{locationError}</Text> : null}
      </View>

      <View className="mt-7">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-slate-900">Mes signalements récents</Text>
          <Link href="/(citizen)/reports" className="text-xs font-bold text-emerald-700">Voir tout →</Link>
        </View>
        {loading ? (
          <View className="items-center py-6"><ActivityIndicator color="#166534" /></View>
        ) : error ? (
          <Text className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</Text>
        ) : items.length ? (
          <View className="gap-2">
            {items.slice(0, 3).map((item) => (
              <Pressable
                key={item.idSignalement}
                onPress={() => router.push({ pathname: '/(citizen)/reports/[id]', params: { id: item.idSignalement } })}
                className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
              >
                <View className="min-w-0 flex-1 pr-3">
                  <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>{item.description || 'Signalement environnemental'}</Text>
                  <Text className="mt-1 text-[10px] text-slate-500">{item.dateSoumission ? dateLabel(item.dateSoumission) : 'Date non disponible'}</Text>
                </View>
                <Text className="text-[10px] font-semibold text-emerald-800">{reportStatusLabel(item.statutSignalement)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
            Vous n’avez pas encore envoyé de signalement.
          </Text>
        )}
        <View className="mt-3 flex-row gap-3">
          <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
            <Text className="text-lg font-extrabold text-slate-900">{numberLabel(inProgressCount)}</Text>
            <Text className="text-[10px] text-slate-500">en traitement (5 récents)</Text>
          </View>
          <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
            <Text className="text-lg font-extrabold text-slate-900">{numberLabel(resolvedCount)}</Text>
            <Text className="text-[10px] text-slate-500">qualifiés (5 récents)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function numberLabel(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}
