import { Text, View } from 'react-native';

interface BrandMarkProps {
  compact?: boolean;
  inverted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandMark({ compact = false, inverted = false, size = 'md' }: BrandMarkProps) {
  const iconSize = size === 'lg' ? 48 : size === 'sm' ? 28 : 38;
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';

  return (
    <View className="flex-row items-center">
      <View
        style={{ width: iconSize, height: iconSize }}
        className={`items-center justify-center rounded-2xl ${
          inverted ? 'bg-white/20' : 'bg-emerald-600'
        } shadow-sm`}
      >
        <Text style={{ fontSize: size === 'lg' ? 24 : size === 'sm' ? 14 : 18 }}>🌿</Text>
      </View>
      {!compact && (
        <View className="ml-2.5">
          <Text
            className={`${textSize} font-black tracking-tight ${
              inverted ? 'text-white' : 'text-slate-900'
            }`}
          >
            ISIECO
          </Text>
          <Text
            className={`text-[9px] font-bold uppercase tracking-widest ${
              inverted ? 'text-emerald-300' : 'text-emerald-700'
            }`}
          >
            Eco Green City
          </Text>
        </View>
      )}
    </View>
  );
}
