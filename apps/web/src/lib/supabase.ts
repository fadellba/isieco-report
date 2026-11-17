import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://mlhbdautaxufubaybzyt.supabase.co';
const defaultSupabaseAnonKey = 'sb_publishable_wFFes4eCYuJ9bEOMXAWxjg_ecOsYWZS';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || defaultSupabaseUrl;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || defaultSupabaseAnonKey;

/** Clé publique uniquement. Ne jamais utiliser la clé secret/service_role dans le Web. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
