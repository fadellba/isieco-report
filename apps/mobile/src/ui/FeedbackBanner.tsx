import { Text, View } from 'react-native';

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';

const palettes: Record<FeedbackTone, { background: string; border: string; accent: string; title: string }> = {
  success: { background: '#EAF4ED', border: '#D3E7D9', accent: '#23764F', title: 'Opération confirmée' },
  error: { background: '#F9ECEA', border: '#EED7D3', accent: '#A64239', title: 'Une erreur est survenue' },
  warning: { background: '#F8F0E4', border: '#EEDFC4', accent: '#8B5B1D', title: 'Attention' },
  info: { background: '#EAF3F6', border: '#D2E5EA', accent: '#246779', title: 'Information' },
};

export function FeedbackBanner({
  message,
  tone,
  title,
}: {
  message: string;
  tone: FeedbackTone;
  title?: string;
}) {
  const palette = palettes[tone];

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={{
        flexDirection: 'row',
        overflow: 'hidden',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
      }}
    >
      <View style={{ width: 4, backgroundColor: palette.accent }} />
      <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800' }}>
          {title ?? palette.title}
        </Text>
        <Text
          accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
          style={{ marginTop: 4, color: '#33453A', fontSize: 12, lineHeight: 19 }}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}
