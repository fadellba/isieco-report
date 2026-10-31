import { createApiClient } from '@isieco/api-client';
import { supabase } from './supabase';

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL as string,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
});
