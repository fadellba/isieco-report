import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import {
  listMyReports,
  listNearbyReports,
  type NearbyReportsResult,
  type ReportPage,
} from '../../src/features/reports/reports-api';
import {
  getOfflineReportQueue,
  syncOfflineReports,
} from '../../src/features/reports/offline-report-outbox';
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
      setResult(await listMyReports(1, 30));
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
      if (state === 'active') void refreshOfflineQueue(true);
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
      setLocationError(
        reason instanceof Error
          ? reason.message
          : 'Position indisponible. Vérifiez les autorisations ou réessayez.',
      );
    } finally {
      setLocationBusy(false);
    }
  }

  const items = result?.items ?? [];
  const recentItems = items.slice(0, 3);
  const firstName = profile?.prenom?.trim();

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7F5]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 44, paddingBottom: 36 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor="#166534"
        />
      }
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les notifications"
          onPress={() => router.push('/notifications')}
          className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3"
        >
          <Text className="text-xs font-bold text-slate-700">Alertes</Text>
        </Pressable>
      </View>

      {pendingOfflineCount > 0 ? (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-extrabold text-amber-950">
                {pendingOfflineCount} signalement(s) en attente
              </Text>
              <Text className="mt-1 text-[10px] leading-4 text-amber-800">
                Conservés sur cet appareil jusqu’au retour de la connexion.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSyncMessage(null);
                void refreshOfflineQueue(true);
              }}
              disabled={syncBusy}
              className="rounded-xl bg-amber-800 px-3 py-2 disabled:opacity-60"
            >
              <Text className="text-[10px] font-bold text-white">
                {syncBusy ? 'Envoi…' : 'Synchroniser'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {syncMessage ? <Text className="mt-2 text-xs text-emerald-800">{syncMessage}</Text> : null}

      <View className="mt-6 overflow-hidden rounded-3xl bg-[#174C3D] p-6">
        <Text className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-100">
          {firstName ? 'Bonjour ' + firstName : 'Espace citoyen'}
        </Text>
        <Text className="mt-3 text-3xl font-black leading-tight text-white">
          Agissons pour une ville plus propre.
        </Text>
        <Text className="mt-3 text-sm leading-6 text-emerald-50">
          Signalez un dépôt, transmettez des photos et suivez les actions des équipes.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(citizen)/reports/new')}
          className="mt-5 min-h-[52px] flex-row items-center justify-center rounded-2xl bg-white px-4 py-3"
        >
          <Text className="text-sm font-extrabold text-[#174C3D]">Nouveau signalement</Text>
          <Text className="ml-2 text-base font-bold text-[#174C3D]">＋</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(citizen)/reports')}
          className="mt-3 items-center py-2"
        >
          <Text className="text-xs font-bold text-white">Voir mes signalements →</Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
          <Text className="text-lg font-extrabold text-emerald-800">#</Text>
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Votre contribution
          </Text>
          <Text className="mt-0.5 text-xl font-extrabold text-slate-900">
            {loading ? '—' : numberLabel(result?.total ?? 0)}
          </Text>
          <Text className="text-[10px] text-slate-500">signalement(s) envoyé(s) au total</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(citizen)/reports')}
          className="rounded-xl bg-slate-50 px-3 py-2"
        >
          <Text className="text-[10px] font-bold text-emerald-800">Consulter</Text>
        </Pressable>
      </View>

      <View className="mt-7">
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-extrabold text-slate-900">Activité récente</Text>
            <Text className="mt-0.5 text-xs text-slate-500">Les trois derniers signalements</Text>
          </View>
          <Pressable onPress={() => router.replace('/(citizen)/reports')}>
            <Text className="text-xs font-extrabold text-emerald-800">Tout voir →</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white py-8">
            <ActivityIndicator color="#166534" />
            <Text className="mt-2 text-xs text-slate-500">Chargement de votre activité…</Text>
          </View>
        ) : error ? (
          <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-xs leading-5 text-rose-800">{error}</Text>
            <Pressable onPress={() => void load(true)} className="mt-2 self-start">
              <Text className="text-xs font-bold text-rose-900">Réessayer</Text>
            </Pressable>
          </View>
        ) : recentItems.length ? (
          <View className="gap-2.5">
            {recentItems.map((item) => (
              <Pressable
                key={item.idSignalement}
                onPress={() =>
                  router.push({
                    pathname: '/(citizen)/reports/[id]',
                    params: { id: item.idSignalement },
                  })
                }
                className="flex-row items-center rounded-2xl border border-slate-200 bg-white p-4"
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Text className="text-base text-slate-700">↗</Text>
                </View>
                <View className="min-w-0 flex-1 pr-2">
                  <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                    {item.description || 'Signalement environnemental'}
                  </Text>
                  <Text className="mt-1 text-[10px] text-slate-500">
                    {item.dateSoumission ? dateLabel(item.dateSoumission) : 'Date non disponible'}
                  </Text>
                </View>
                <Text className="text-right text-[10px] font-bold text-emerald-800">
                  {reportStatusLabel(item.statutSignalement)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-7">
            <Text className="text-base font-extrabold text-slate-900">Aucun signalement pour le moment</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-slate-500">
              Votre activité apparaîtra ici après l’envoi de votre première déclaration.
            </Text>
          </View>
        )}
      </View>

      <View className="mt-7 rounded-3xl border border-slate-200 bg-white p-5">
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-lg font-extrabold text-slate-900">Autour de vous</Text>
            <Text className="mt-1 text-xs leading-5 text-slate-500">
              Consultez les signalements qualifiés dans un rayon de 3 km. Votre position n’est demandée qu’après votre action.
            </Text>
          </View>
          {center ? (
            <Pressable onPress={() => void loadNearbyReports()} disabled={locationBusy}>
              <Text className="text-xs font-bold text-emerald-800">Actualiser</Text>
            </Pressable>
          ) : null}
        </View>
        {!center ? (
          <Pressable
            onPress={() => void loadNearbyReports()}
            disabled={locationBusy}
            className="mt-4 min-h-[48px] flex-row items-center justify-center rounded-xl bg-emerald-50 px-3 py-3 disabled:opacity-60"
          >
            {locationBusy ? (
              <ActivityIndicator color="#166534" />
            ) : (
              <Text className="text-xs font-extrabold text-emerald-900">Afficher la carte à proximité</Text>
            )}
          </Pressable>
        ) : (
          <>
            <View className="mt-4">
              <NearbyReportsMap center={center} markers={nearby?.items ?? []} />
            </View>
            <Text className="mt-2 text-[10px] text-slate-500">
              {nearby?.items.length
                ? nearby.items.length + ' signalement(s) qualifié(s) affiché(s).'
                : 'Aucun signalement qualifié trouvé dans ce rayon.'}
            </Text>
          </>
        )}
        {locationError ? <Text className="mt-2 text-xs text-rose-700">{locationError}</Text> : null}
      </View>
    </ScrollView>
  );
}

function numberLabel(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}
