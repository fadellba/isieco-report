import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useMobileAuth } from '../features/auth/mobile-auth-context';
import { BrandMark } from './BrandMark';

interface ProfileScreenProps {
  currentSpace: 'citizen' | 'agent';
}

export function ProfileScreen({ currentSpace }: ProfileScreenProps) {
  const router = useRouter();
  const { profile, signOut } = useMobileAuth();
  const [busy, setBusy] = useState(false);
  const hasCitizen = profile?.roles.some((role) => role.code === 'CITOYEN') ?? false;
  const hasAgent = profile?.roles.some((role) => role.code === 'AGENT_TERRAIN') ?? false;
  const canSwitch = currentSpace === 'citizen' ? hasAgent : hasCitizen;
  const nextSpace = currentSpace === 'citizen' ? 'agent' : 'citizen';

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      router.replace('/sign-in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-surface-base px-5 pb-8 pt-14">
      <BrandMark />
      <Text className="mt-9 text-xs font-bold uppercase tracking-[0.16em] text-brand-forest">Mon compte</Text>
      <Text className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
        {profile?.prenom ? `${profile.prenom} ${profile.nom}` : profile?.nom ?? 'Votre profil'}
      </Text>
      <Text className="mt-2 text-sm text-ink-500">{profile?.email}</Text>

      <View className="mt-7 rounded-3xl border border-line-subtle bg-white p-5">
        <Text className="text-xs font-bold uppercase tracking-wide text-ink-500">Vos espaces autorisés</Text>
        {profile?.roles.map((role) => (
          <View key={role.code} className="mt-3 flex-row items-center justify-between">
            <Text className="flex-1 text-sm font-semibold text-ink-800">{role.libelle}</Text>
            <View className="rounded-full bg-brand-mist px-3 py-1">
              <Text className="text-[10px] font-bold text-brand-forest">Actif</Text>
            </View>
          </View>
        ))}
        <Text className="mt-4 text-xs leading-5 text-ink-500">
          Les autorisations sont contrôlées par l’API pour chaque opération. Changer d’espace ne modifie pas vos droits.
        </Text>
      </View>

      {canSwitch ? (
        <TouchableOpacity
          onPress={() => router.replace(nextSpace === 'agent' ? '/(agent)/home' : '/(citizen)/home')}
          className="mt-5 rounded-2xl border border-brand-forest bg-white px-5 py-4"
        >
          <Text className="text-center text-sm font-bold text-brand-forest">
            Passer à l’espace {nextSpace === 'agent' ? 'agent' : 'citoyen'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <View className="mt-auto pt-8">
        <TouchableOpacity disabled={busy} onPress={() => void handleSignOut()} className="rounded-2xl bg-ink-900 px-5 py-4 disabled:opacity-50">
          <Text className="text-center text-sm font-bold text-white">{busy ? 'Déconnexion…' : 'Se déconnecter'}</Text>
        </TouchableOpacity>
        <Text className="mt-4 text-center text-[10px] text-ink-400">ISIECO · Gestion de la propreté urbaine</Text>
      </View>
    </View>
  );
}
