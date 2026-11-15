import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <AuthScreenFrame
      eyebrow="Navigation"
      title="Cette page n’existe pas."
      description="Le lien utilisé ne correspond à aucun écran ISIECO disponible. Revenez à votre espace pour reprendre votre parcours."
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/')}
        className="min-h-[50px] items-center justify-center rounded-xl bg-brand-forest px-4 py-3"
      >
        <Text className="text-xs font-extrabold text-white">Revenir à l’accueil</Text>
      </Pressable>
    </AuthScreenFrame>
  );
}
