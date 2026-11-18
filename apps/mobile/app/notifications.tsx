import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { listNotifications, type AppNotification } from '../src/features/reports/reports-api';
import { useMobileAuth } from '../src/features/auth/mobile-auth-context';

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useMobileAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listNotifications(50));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (!profileLoading && profile) void load();
  }, [load, profile, profileLoading]));

  if (profileLoading) {
    return <View className="flex-1 items-center justify-center bg-slate-50"><ActivityIndicator color="#166534" /></View>;
  }
  if (!profile) return <Redirect href="/sign-in" />;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-5 pb-3 pt-12">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
          <Text className="text-base font-bold text-slate-700">←</Text>
        </Pressable>
        <Text className="text-base font-extrabold text-slate-900">Notifications</Text>
        <View className="h-9 w-9" />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text className="mb-4 text-xs leading-5 text-slate-500">
          Événements concernant votre compte, vos signalements ou vos missions. Les notifications couvrent les 90 derniers jours.
        </Text>
        {loading ? (
          <View className="items-center py-8"><ActivityIndicator color="#166534" /></View>
        ) : error ? (
          <View className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-xs text-rose-800">{error}</Text>
            <Pressable onPress={() => void load()} className="mt-3"><Text className="text-xs font-bold text-rose-900">Réessayer</Text></Pressable>
          </View>
        ) : items.length ? (
          <View className="gap-3">
            {items.map((item) => (
              <View key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 text-sm font-extrabold text-slate-900">{item.title}</Text>
                  <Text className="text-[9px] font-bold text-emerald-800">{item.actionCode.replaceAll('_', ' ')}</Text>
                </View>
                <Text className="mt-2 text-xs leading-5 text-slate-600">{item.message}</Text>
                <Text className="mt-3 text-[10px] text-slate-400">
                  {Number.isNaN(new Date(item.occurredAt).getTime()) ? 'Date inconnue' : dateTime.format(new Date(item.occurredAt))}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center rounded-xl border border-slate-200 bg-white p-6">
            <Text className="text-2xl">🔔</Text>
            <Text className="mt-2 text-sm font-bold text-slate-900">Aucune notification récente</Text>
            <Text className="mt-1 text-center text-xs leading-5 text-slate-500">Les mises à jour concernant votre espace apparaîtront ici.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
