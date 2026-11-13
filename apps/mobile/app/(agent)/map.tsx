import { Link } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BrandMark } from '../../src/ui/BrandMark';

export default function AgentMapScreen() {
  return (
    <View className="flex-1 bg-surface-base px-5 pb-8 pt-14">
      <BrandMark />
      <Text className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-brand-forest">Espace agent</Text>
      <Text className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">Carte des missions</Text>
      <View className="mt-6 min-h-[280px] items-center justify-center overflow-hidden rounded-3xl border border-line-subtle bg-brand-mist p-6">
        <Text className="text-5xl text-brand-forest">⌖</Text>
        <Text className="mt-4 text-center text-base font-bold text-ink-900">La carte opérationnelle arrive</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-ink-500">
          Les coordonnées des dépôts doivent d’abord être exposées dans le contrat des missions agent. Vos affectations restent accessibles dans la liste.
        </Text>
      </View>
      <Link href="/(agent)/missions" asChild>
        <TouchableOpacity className="mt-5 rounded-2xl bg-brand-forest px-5 py-4">
          <Text className="text-center text-sm font-bold text-white">Consulter mes missions</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
