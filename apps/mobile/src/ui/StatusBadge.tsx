import { Text, View } from 'react-native';

export type StatusTone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<StatusTone, { backgroundColor: string; borderColor: string; color: string }> = {
  brand: { backgroundColor: '#E8F0E7', borderColor: '#D4E4D4', color: '#174C3D' },
  info: { backgroundColor: '#EAF3F6', borderColor: '#D2E5EA', color: '#246779' },
  success: { backgroundColor: '#E8F3EC', borderColor: '#D2E7D9', color: '#23764F' },
  warning: { backgroundColor: '#F8F0E4', borderColor: '#EEDFC4', color: '#8B5B1D' },
  danger: { backgroundColor: '#F9ECEA', borderColor: '#EED7D3', color: '#A64239' },
  neutral: { backgroundColor: '#F0F2EE', borderColor: '#E2E7E0', color: '#58675D' },
};

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const palette = tones[tone];

  return (
    <View
      accessibilityLabel={'Statut : ' + label}
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
      }}
    >
      <Text style={{ color: palette.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.1 }}>
        {label}
      </Text>
    </View>
  );
}
