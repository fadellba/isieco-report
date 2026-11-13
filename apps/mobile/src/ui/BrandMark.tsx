import { Text, View } from 'react-native';

interface BrandMarkProps {
  compact?: boolean;
  inverted?: boolean;
}

export function BrandMark({ compact = false, inverted = false }: BrandMarkProps) {
  return (
    <View className="flex-row items-center">
      <View className={`h-11 w-11 items-center justify-center rounded-2xl ${inverted ? 'bg-white' : 'bg-brand-forest'}`}>
        <Text className={`text-base font-extrabold tracking-tight ${inverted ? 'text-brand-forest' : 'text-white'}`}>IE</Text>
      </View>
      {!compact ? (
        <View className="ml-3">
          <Text className={`text-base font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-ink-900'}`}>ISIECO</Text>
          <Text className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${inverted ? 'text-white/70' : 'text-ink-500'}`}>
            Propreté urbaine
          </Text>
        </View>
      ) : null}
    </View>
  );
}
