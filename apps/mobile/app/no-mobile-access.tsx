import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BrandMark } from '../src/ui/BrandMark';
import { useMobileAuth } from '../src/features/auth/mobile-auth-context';

export default function NoMobileAccessScreen() {
  const router = useRouter();
  const { signOut } = useMobileAuth();
  return (
    <View className="flex-1 justify-center bg-surface-base px-6 py-10">
      <BrandMark />
      <Text className="mt-10 text-2xl font-extrabold text-ink-900">Espace mobile indisponible</Text>
      <Text className="mt-3 text-sm leading-6 text-ink-500">
        Votre compte est authentifié, mais aucun rôle citoyen ou agent de terrain actif ne donne accès aux parcours mobiles.
        Les fonctions de gestion restent disponibles dans le back office Web selon vos habilitations.
      </Text>
      <TouchableOpacity onPress={() => router.replace('/')} className="mt-7 rounded-2xl bg-brand-forest px-5 py-4">
        <Text className="text-center text-sm font-bold text-white">Réessayer</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => void signOut().then(() => router.replace('/sign-in'))} className="mt-3 rounded-2xl border border-line-subtle bg-white px-5 py-4">
        <Text className="text-center text-sm font-bold text-ink-700">Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}
