import { createApiClient } from '@isieco/api-client';
import { supabase } from './supabase';

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
});
