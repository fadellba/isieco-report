import { Redirect, Tabs } from 'expo-router';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import { LoadingScreen } from '../../src/ui/LoadingScreen';
import { RoleTabBar } from '../../src/ui/RoleTabBar';

export default function AgentLayout() {
  const { profile, loading } = useMobileAuth();

  if (loading) return <LoadingScreen />;
  if (!profile) return <Redirect href="/sign-in" />;
  if (!profile.roles.some((role) => role.code === 'AGENT_TERRAIN')) return <Redirect href="/no-mobile-access" />;

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
            { route: 'missions', label: 'Missions', glyph: '▤' },
            { route: 'map', label: 'Carte', glyph: '⌖' },
            { route: 'profile', label: 'Profil', glyph: '○' },
          ]}
        />
      )}
    >
      <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="map" options={{ title: 'Carte' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
