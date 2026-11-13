import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useMobileAuth } from '../src/features/auth/mobile-auth-context';
import { BrandMark } from '../src/ui/BrandMark';

export default function ChooseSpaceScreen() {
  const router = useRouter();
  const { profile } = useMobileAuth();
  const hasCitizen = profile?.roles.some((role) => role.code === 'CITOYEN') ?? false;
  const hasAgent = profile?.roles.some((role) => role.code === 'AGENT_TERRAIN') ?? false;

  return (
    <View className="flex-1 justify-center bg-surface-base px-6 py-10">
      <BrandMark />
      <Text className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-brand-forest">Bienvenue sur ISIECO</Text>
      <Text className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">Quel espace souhaitez-vous ouvrir ?</Text>
      <Text className="mt-3 text-sm leading-6 text-ink-500">Votre compte dispose de plusieurs espaces. Vous pourrez changer à tout moment depuis votre profil.</Text>
      {hasCitizen ? (
        <TouchableOpacity onPress={() => router.replace('/(citizen)/home')} className="mt-7 rounded-3xl bg-brand-forest p-5">
          <Text className="text-xs font-bold uppercase tracking-wide text-white/70">Espace citoyen</Text>
          <Text className="mt-2 text-xl font-extrabold text-white">Signaler et suivre</Text>
          <Text className="mt-1 text-sm text-white/75">Déclarer un dépôt et suivre son traitement.</Text>
        </TouchableOpacity>
      ) : null}
      {hasAgent ? (
        <TouchableOpacity onPress={() => router.replace('/(agent)/home')} className="mt-3 rounded-3xl border border-line-subtle bg-white p-5">
          <Text className="text-xs font-bold uppercase tracking-wide text-brand-forest">Espace agent</Text>
          <Text className="mt-2 text-xl font-extrabold text-ink-900">Mes missions terrain</Text>
          <Text className="mt-1 text-sm text-ink-500">Consulter les affectations et rendre compte des interventions.</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
