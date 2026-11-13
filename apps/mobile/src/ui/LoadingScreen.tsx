import { ActivityIndicator, Text, View } from 'react-native';
import { BrandMark } from './BrandMark';

export function LoadingScreen({ label = 'Préparation de votre espace…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface-base px-8">
      <BrandMark />
      <ActivityIndicator className="mt-10" color="#14532D" size="large" />
      <Text className="mt-4 text-sm font-medium text-ink-500">{label}</Text>
    </View>
  );
}
