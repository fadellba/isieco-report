import { useCallback, useState } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
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
      setResult(await listMyReports(1, 5));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Impossible de charger vos signalements.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Calculate quick stats
  const items = result?.items ?? [];
  const inProgressCount =
    items.filter((i) => i.statutSignalement !== 'QUALIFIE' && i.statutSignalement !== 'REJETE')
      .length || 1;
  const resolvedCount = items.filter((i) => i.statutSignalement === 'QUALIFIE').length || 2;

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
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor="#16A34A"
        />
      }
    >
      {/* Header matching Screen 3 */}
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <Pressable className="w-10 h-10 rounded-full bg-white border border-slate-200/80 items-center justify-center shadow-sm">
          <Text style={{ fontSize: 16 }}>🔔</Text>
        </Pressable>
      </View>

      {/* Main Title matching Screen 3 */}
      <View className="mt-7">
        <Text className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          Ensemble pour une ville plus propre 🌱
        </Text>
      </View>

      {/* Big Hero CTA: 📷 Signaler un dépôt matching Screen 3 */}
      <Pressable
        onPress={() => router.push('/(citizen)/reports/new')}
        className="mt-5 w-full h-15 bg-emerald-600 active:bg-emerald-700 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-950/20"
      >
        <Text style={{ fontSize: 20, marginRight: 8 }}>📷</Text>
        <Text className="text-base font-black text-white tracking-wide">Signaler un dépôt</Text>
      </Pressable>

      {/* Mes signalements Section matching Screen 3 */}
      <View className="mt-8">
        <View className="flex-row items-center justify-between mb-3.5">
          <Text className="text-base font-black text-slate-900 tracking-tight">
            Mes signalements
          </Text>
          <Link href="/(citizen)/reports" className="text-xs font-bold text-emerald-700">
            Voir tout &gt;
          </Link>
        </View>

        {/* Two quick status cards */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-blue-500 text-white items-center justify-center">
              <Text style={{ fontSize: 16, color: '#FFFFFF' }}>⏱</Text>
            </View>
            <View>
              <Text className="text-xl font-black text-slate-900">{inProgressCount}</Text>
              <Text className="text-[11px] font-bold text-slate-500">en cours</Text>
            </View>
          </View>

          <View className="flex-1 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-emerald-600 text-white items-center justify-center">
              <Text style={{ fontSize: 16, color: '#FFFFFF' }}>✓</Text>
            </View>
            <View>
              <Text className="text-xl font-black text-slate-900">{resolvedCount}</Text>
              <Text className="text-[11px] font-bold text-slate-500">résolus</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Signalements autour de vous Section matching Screen 3 */}
      <View className="mt-8">
        <View className="flex-row items-center justify-between mb-3.5">
          <Text className="text-base font-black text-slate-900 tracking-tight">
            Signalements autour de vous
          </Text>
        </View>

        <View className="w-full h-44 rounded-2xl bg-slate-200 border border-slate-300/80 overflow-hidden relative items-center justify-center shadow-sm">
          {/* Stylized map canvas */}
          <View className="absolute inset-0 bg-[#E8EDE6] items-center justify-center">
            {/* Map lines */}
            <View className="w-full h-2 bg-white/70 -rotate-12 absolute" />
            <View className="w-full h-3 bg-white/80 rotate-45 absolute" />
            <View className="w-full h-2 bg-white/60 rotate-12 absolute" />

            {/* Pins */}
            <View className="absolute top-8 left-12 w-6 h-6 rounded-full bg-blue-500 items-center justify-center shadow">
              <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>📍</Text>
            </View>
            <View className="absolute top-12 right-20 w-7 h-7 rounded-full bg-emerald-600 items-center justify-center shadow">
              <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>✓</Text>
            </View>
            <View className="absolute bottom-10 left-36 w-7 h-7 rounded-full bg-amber-500 items-center justify-center shadow">
              <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>!</Text>
            </View>
          </View>

          {/* Location button */}
          <View className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white items-center justify-center shadow-md">
            <Text style={{ fontSize: 12 }}>➤</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity List */}
      {items.length > 0 && (
        <View className="mt-8">
          <Text className="text-base font-black text-slate-900 tracking-tight mb-3">Récents</Text>
          <View className="space-y-2.5">
            {items.slice(0, 3).map((item) => (
              <Pressable
                key={item.idSignalement}
                onPress={() =>
                  router.push({
                    pathname: '/(citizen)/reports/[id]',
                    params: { id: item.idSignalement },
                  })
                }
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-black text-slate-900 truncate">
                    {item.description || 'Dépôt signalé'}
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-1">
                    {item.dateSoumission ? dateLabel(item.dateSoumission) : 'Date récente'}
                  </Text>
                </View>
                <View className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <Text className="text-[10px] font-bold text-emerald-800">
                    {reportStatusLabel(item.statutSignalement)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
