import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useMobileAuth } from '../src/features/auth/mobile-auth-context';
import { LoadingScreen } from '../src/ui/LoadingScreen';

const ONBOARDING_KEY = 'isieco.onboarding.v1.complete';

export default function IndexScreen() {
  const router = useRouter();
  const { profile, loading, error, refreshProfile } = useMobileAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => { if (active) setOnboardingComplete(value === 'true'); })
      .catch(() => { if (active) setOnboardingComplete(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loading || onboardingComplete === null) return;
    if (!profile) {
      router.replace(onboardingComplete ? '/sign-in' : '/onboarding');
      return;
    }

    const hasCitizen = profile.roles.some((role) => role.code === 'CITOYEN');
    const hasAgent = profile.roles.some((role) => role.code === 'AGENT_TERRAIN');

    if (hasCitizen && hasAgent) router.replace('/choose-space');
    else if (hasCitizen) router.replace('/(citizen)/home');
    else if (hasAgent) router.replace('/(agent)/home');
    else router.replace('/no-mobile-access');
  }, [loading, onboardingComplete, profile, router]);

  if (error && !profile) {
    return (
      <View className="flex-1 justify-center bg-surface-base px-6">
        <Text className="text-2xl font-extrabold text-ink-900">Connexion indisponible</Text>
        <Text className="mt-3 text-sm leading-6 text-ink-500">{error}</Text>
        <TouchableOpacity onPress={() => void refreshProfile()} className="mt-6 rounded-2xl bg-brand-forest px-5 py-4">
          <Text className="text-center text-sm font-bold text-white">Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <LoadingScreen />;
}
