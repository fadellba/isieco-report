import { useCallback, useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { completeMobileAuthRedirect } from '../../src/features/auth/mobile-auth-links';
import { useMobileAuth } from '../../src/features/auth/mobile-auth-context';
import { supabase } from '../../src/lib/supabase';
import { AuthScreenFrame } from '../../src/ui/AuthScreenFrame';

export default function AuthCallbackScreen() {
  const incomingUrl = Linking.useLinkingURL();
  const router = useRouter();
  const { refreshProfile } = useMobileAuth();
  const processedUrls = useRef(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleUrl = useCallback(
    async (url: string | null) => {
      if (!url || processedUrls.current.has(url)) return;
      processedUrls.current.add(url);
      setLoading(true);
      setError(null);
      try {
        await completeMobileAuthRedirect(url, supabase);
        await refreshProfile().catch(() => undefined);
        router.replace('/');
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'La confirmation a échoué. Demandez un nouveau lien par e-mail.',
        );
      } finally {
        setLoading(false);
      }
    },
    [refreshProfile, router],
  );

  useEffect(() => {
    let active = true;
    const acceptUrl = (url: string | null) => {
      if (active) void handleUrl(url);
    };
    const subscription = Linking.addEventListener('url', ({ url }) => acceptUrl(url));

    if (incomingUrl) {
      acceptUrl(incomingUrl);
    } else {
      void Linking.getInitialURL()
        .then(acceptUrl)
        .catch(() => {
          if (active) {
            setLoading(false);
            setError('Impossible de lire le lien. Ouvrez à nouveau le dernier e-mail reçu.');
          }
        });
    }

    return () => {
      active = false;
      subscription.remove();
    };
  }, [handleUrl, incomingUrl]);

  return (
    <AuthScreenFrame
      title={loading ? 'Confirmation en cours…' : 'Confirmation de l’adresse e-mail'}
      description="ISIECO vérifie le lien sécurisé reçu par e-mail."
    >
      {loading ? (
        <View className="items-center py-5">
          <ActivityIndicator color="#174C3D" size="large" />
          <Text className="mt-3 text-xs text-ink-500">Vérification de votre compte…</Text>
        </View>
      ) : (
        <View className="rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-status-danger">
            {error ?? 'Le lien de confirmation est invalide ou a expiré.'}
          </Text>
          <Link className="mt-4 text-xs font-extrabold text-brand-forest" href="/sign-in">
            Retour à la connexion
          </Link>
          <Link className="mt-3 text-xs font-extrabold text-brand-forest" href="/sign-up">
            Recommencer l’inscription
          </Link>
        </View>
      )}
    </AuthScreenFrame>
  );
}
