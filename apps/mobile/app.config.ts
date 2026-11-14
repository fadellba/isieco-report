import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'ISIECO Report',
  slug: config.slug ?? 'isieco-report',
});
