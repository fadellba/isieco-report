import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandMark } from './BrandMark';

export function LoadingScreen({ label = 'Préparation de votre espace…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-[#123B33] px-8">
      <StatusBar style="light" />
      <View className="w-full max-w-[320px] items-center">
        <BrandMark inverted />
        <View className="mt-12 h-px w-16 bg-[#D7E6A5]" />
        <Text className="mt-6 text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#D7E6A5]">
          Signalement · Intervention · Suivi
        </Text>
        <ActivityIndicator className="mt-10" color="#D7E6A5" size="large" />
        <Text accessibilityLiveRegion="polite" className="mt-5 text-center text-sm font-medium text-white/80">
          {label}
        </Text>
        <Text className="mt-3 text-center text-[10px] font-semibold tracking-[0.08em] text-white/45">
          PLATEFORME DE PROPRETÉ URBAINE
        </Text>
      </View>
    </View>
  );
}