import { createApiClient } from '@isieco/api-client';
import { supabase } from './supabase';

const defaultApiBaseUrl = 'https://isieco-api-staging.onrender.com/api/v1';
const baseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || defaultApiBaseUrl;

export const api = createApiClient({
  baseUrl,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
});
