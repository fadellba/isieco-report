import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';
import { useMobileAuth } from '../src/features/auth/mobile-auth-context';

export default function NoMobileAccessScreen() {
  const router = useRouter();
  const { refreshProfile, signOut } = useMobileAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retryAccess() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      await refreshProfile();
      router.replace('/');
    } catch {
      setError('La vérification des accès a échoué. Réessayez.');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      router.replace('/sign-in');
    } catch {
      setError('La déconnexion est momentanément indisponible. Réessayez.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <AuthScreenFrame
      eyebrow="Accès mobile"
      title="Cet espace n’est pas activé."
      description="Votre compte est authentifié, mais aucune habilitation citoyen ou agent de terrain active ne permet d’ouvrir les parcours mobiles."
    >
      <View className="rounded-2xl border border-status-warning/20 bg-status-warning/5 p-4">
        <Text className="text-xs font-extrabold text-ink-900">Pourquoi cet écran apparaît-il ?</Text>
        <Text className="mt-2 text-xs leading-5 text-ink-600">
          Les habilitations de gestion et de supervision sont accessibles depuis le back-office Web. Pour les parcours mobiles, contactez votre organisation afin de vérifier les rôles associés à votre compte.
        </Text>
      </View>

      {error ? (
        <View className="mt-4 rounded-xl border border-status-danger/20 bg-status-danger/5 p-3">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-status-danger">{error}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={refreshing || signingOut}
        onPress={() => void retryAccess()}
        className="mt-5 min-h-[50px] items-center justify-center rounded-xl bg-brand-forest px-4 py-3 disabled:opacity-50"
      >
        <Text className="text-xs font-extrabold text-white">{refreshing ? 'Vérification…' : 'Vérifier mes accès'}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={refreshing || signingOut}
        onPress={() => void handleSignOut()}
        className="mt-3 min-h-[50px] items-center justify-center rounded-xl border border-line-strong bg-white px-4 py-3 disabled:opacity-50"
      >
        <Text className="text-xs font-extrabold text-ink-700">{signingOut ? 'Déconnexion…' : 'Se déconnecter'}</Text>
      </Pressable>
    </AuthScreenFrame>
  );
}
