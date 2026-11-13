import { Redirect, Tabs, useRouter } from 'expo-router';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import { LoadingScreen } from '../../src/ui/LoadingScreen';
import { RoleTabBar } from '../../src/ui/RoleTabBar';

export default function CitizenLayout() {
  const { profile, loading } = useMobileAuth();
  const router = useRouter();

  if (loading) return <LoadingScreen />;
  if (!profile) return <Redirect href="/sign-in" />;
  if (!profile.roles.some((role) => role.code === 'CITOYEN')) return <Redirect href="/no-mobile-access" />;

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#F7F8F5' } }}
      tabBar={({ state, navigation }) => (
        <RoleTabBar
          state={state}
          navigation={navigation}
          items={[
            { route: 'home', label: 'Accueil', glyph: '⌂' },
            { route: 'reports', label: 'Suivi', glyph: '◷' },
            { route: 'profile', label: 'Profil', glyph: '○' },
          ]}
          action={{
            label: 'Signaler',
            glyph: '+',
            onPress: () => router.push('/(citizen)/reports/new'),
          }}
        />
      )}
    >
      <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="reports" options={{ title: 'Suivi' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
