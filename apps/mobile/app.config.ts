import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...(googleMapsApiKey
        ? [['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]]
        : []),
    ],
  };
};
