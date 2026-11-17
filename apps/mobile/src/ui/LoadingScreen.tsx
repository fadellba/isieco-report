import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandMark } from './BrandMark';

export function LoadingScreen({
  label = 'Ensemble pour une ville plus propre',
}: {
  label?: string;
}) {
  return (
    <View className="flex-1 items-center justify-between bg-[#0A261E] px-8 pt-24 pb-12">
      <StatusBar style="light" />

      {/* Decorative top space */}
      <View className="h-4" />

      {/* Center Brand Identity matching splash.PNG */}
      <View className="w-full max-w-[320px] items-center">
        <View className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-400/30 items-center justify-center mb-6 shadow-2xl">
          <Text style={{ fontSize: 40 }}>🌿</Text>
        </View>

        <Text className="text-4xl font-black text-white tracking-tight text-center">ISIECO</Text>

        <Text className="mt-3 text-sm font-medium text-emerald-100/90 text-center leading-relaxed">
          Ensemble pour une ville plus propre
        </Text>
      </View>

      {/* Bottom organic curve accent and spinner matching splash.PNG */}
      <View className="w-full items-center pb-4">
        <ActivityIndicator color="#4ADE80" size="small" />
        <Text className="mt-3 text-[11px] font-medium text-emerald-300/60 text-center tracking-wide">
          {label}
        </Text>
      </View>
    </View>
  );
}
