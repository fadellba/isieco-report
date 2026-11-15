import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useMobileAuth } from '../src/features/auth/mobile-auth-context';
import { LoadingScreen } from '../src/ui/LoadingScreen';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

const ONBOARDING_KEY = 'isieco.onboarding.v2.complete';

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
      <AuthScreenFrame
        eyebrow="Vérification de session"
        title="Connexion indisponible."
        description="Votre session ne peut pas être vérifiée pour le moment. Vos données ne sont pas supprimées. Réessayez lorsque le service sera accessible."
      >
        <Text className="text-xs leading-5 text-ink-500">{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refreshProfile()}
          className="mt-5 min-h-[50px] items-center justify-center rounded-xl bg-brand-forest px-5 py-4"
        >
          <Text className="text-xs font-extrabold text-white">Réessayer</Text>
        </Pressable>
      </AuthScreenFrame>
    );
  }

  return <LoadingScreen />;
}
