import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMobileAuth } from '../features/auth/mobile-auth-context';
import { BrandMark } from './BrandMark';
import { FeedbackBanner } from './FeedbackBanner';

interface ProfileScreenProps {
  currentSpace: 'citizen' | 'agent';
}

export function ProfileScreen({ currentSpace }: ProfileScreenProps) {
  const router = useRouter();
  const { profile, signOut } = useMobileAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCitizen = profile?.roles.some((role) => role.code === 'CITOYEN') ?? false;
  const hasAgent = profile?.roles.some((role) => role.code === 'AGENT_TERRAIN') ?? false;
  const canSwitch = currentSpace === 'citizen' ? hasAgent : hasCitizen;
  const nextSpace = currentSpace === 'citizen' ? 'agent' : 'citizen';
  const displayName = profile?.prenom
    ? profile.prenom + ' ' + profile.nom
    : (profile?.nom ?? 'Votre profil');
  const initials =
    [profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'IS';

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace('/sign-in');
    } catch {
      setError('La déconnexion a échoué. Vérifiez votre connexion et réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 }}
    >
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <View className="rounded-full bg-brand-mist px-3 py-2">
          <Text className="text-[10px] font-extrabold text-brand-forest">
            {currentSpace === 'agent' ? 'ESPACE AGENT' : 'ESPACE CITOYEN'}
          </Text>
        </View>
      </View>

      <Text className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-petrol">
        MON COMPTE
      </Text>
      <Text className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
        Profil et accès
      </Text>
      <Text className="mt-2 text-sm leading-6 text-ink-500">
        Consultez les informations du compte et les espaces actuellement autorisés.
      </Text>

      <View className="mt-6 flex-row items-center rounded-3xl border border-line-subtle bg-white p-5">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-forest">
          <Text className="text-base font-extrabold text-white">{initials}</Text>
        </View>
        <View className="ml-4 min-w-0 flex-1">
          <Text className="text-base font-extrabold text-ink-900">{displayName}</Text>
          <Text className="mt-1 text-xs text-ink-500">
            {profile?.email ?? 'Adresse e-mail non renseignée'}
          </Text>
          <Text className="mt-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-status-success">
            Compte {profile?.etatCompte?.toLowerCase() ?? 'authentifié'}
          </Text>
        </View>
      </View>

      <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5">
        <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-petrol">
          HABILITATIONS
        </Text>
        <Text className="mt-1 text-base font-extrabold text-ink-900">Vos espaces autorisés</Text>
        {profile?.roles.map((role) => (
          <View
            key={role.code}
            className="mt-3 flex-row items-center justify-between border-t border-line-subtle pt-3"
          >
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-sm font-bold text-ink-800">{role.libelle ?? role.code}</Text>
              <Text className="mt-1 text-[9px] font-medium text-ink-400">{role.code}</Text>
            </View>
            <View className="rounded-full bg-brand-mist px-3 py-1.5">
              <Text className="text-[9px] font-extrabold text-brand-forest">Actif</Text>
            </View>
          </View>
        ))}
        <Text className="mt-4 text-[10px] leading-5 text-ink-500">
          Les autorisations sont contrôlées par l’API pour chaque opération. Changer d’espace ne
          modifie pas vos droits.
        </Text>
      </View>

      {canSwitch ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.replace(nextSpace === 'agent' ? '/(agent)/home' : '/(citizen)/home')
          }
          className="mt-4 flex-row items-center justify-between rounded-2xl border border-line-strong bg-white px-4 py-4"
        >
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-petrol">
              CHANGER D’ESPACE
            </Text>
            <Text className="mt-1 text-sm font-extrabold text-ink-900">
              Passer à l’espace {nextSpace === 'agent' ? 'agent' : 'citoyen'}
            </Text>
          </View>
          <Text className="text-lg font-light text-brand-forest">→</Text>
        </Pressable>
      ) : null}

      {error ? (
        <View className="mt-4">
          <FeedbackBanner tone="error" message={error} />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void handleSignOut()}
        className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-ink-900 px-5 py-4 disabled:opacity-50"
      >
        <Text className="text-sm font-extrabold text-white">
          {busy ? 'Déconnexion…' : 'Se déconnecter'}
        </Text>
      </Pressable>
      <Text className="mt-4 text-center text-[9px] font-semibold uppercase tracking-[0.13em] text-ink-400">
        ISIECO · Gestion de la propreté urbaine
      </Text>
    </ScrollView>
  );
}
