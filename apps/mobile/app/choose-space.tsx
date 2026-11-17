import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useMobileAuth } from '../src/features/auth/mobile-auth-context';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

export default function ChooseSpaceScreen() {
  const router = useRouter();
  const { profile } = useMobileAuth();
  const hasCitizen = profile?.roles.some((role) => role.code === 'CITOYEN') ?? false;
  const hasAgent = profile?.roles.some((role) => role.code === 'AGENT_TERRAIN') ?? false;

  return (
    <AuthScreenFrame
      eyebrow="Vos accès ISIECO"
      title="Choisissez votre espace."
      description="Votre compte dispose de plusieurs espaces. Sélectionnez celui qui correspond à votre action du moment."
    >
      {hasCitizen ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(citizen)/home')}
          className="rounded-2xl bg-brand-forest p-5"
        >
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-lime">
            Espace citoyen
          </Text>
          <Text className="mt-2 text-xl font-extrabold text-white">Signaler et suivre</Text>
          <Text className="mt-2 text-xs leading-5 text-white/75">
            Déclarer un dépôt, consulter vos signalements et suivre leur traitement.
          </Text>
          <Text className="mt-5 text-xs font-extrabold text-white">Ouvrir cet espace →</Text>
        </Pressable>
      ) : null}

      {hasAgent ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(agent)/home')}
          className="mt-3 rounded-2xl border border-line-subtle bg-surface-base p-5"
        >
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-petrol">
            Espace agent
          </Text>
          <Text className="mt-2 text-xl font-extrabold text-ink-900">Mes missions terrain</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-500">
            Consulter les affectations, documenter les interventions et transmettre les comptes
            rendus.
          </Text>
          <Text className="mt-5 text-xs font-extrabold text-brand-forest">Ouvrir cet espace →</Text>
        </Pressable>
      ) : null}

      <View className="mt-5 rounded-xl border border-line-subtle px-4 py-3">
        <Text className="text-[10px] leading-5 text-ink-500">
          Les espaces disponibles sont déterminés par les habilitations actives de votre compte.
        </Text>
      </View>
    </AuthScreenFrame>
  );
}
