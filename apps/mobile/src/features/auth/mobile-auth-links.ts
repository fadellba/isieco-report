import 'react-native-url-polyfill/auto';
import type { SupabaseClient } from '@supabase/supabase-js';

const EMAIL_OTP_TYPES = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
] as const;

type MobileEmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

/**
 * Exchanges the credentials returned by Supabase's email confirmation link.
 * Auth may return a PKCE code, a token hash, or an access/refresh token pair.
 */
export async function completeMobileAuthRedirect(
  incomingUrl: string,
  client: SupabaseClient,
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(incomingUrl);
  } catch {
    throw new Error('Le lien de confirmation est mal formé. Demandez un nouvel e-mail.');
  }

  const query = new URLSearchParams(parsed.search);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const param = (name: string) => query.get(name) ?? fragment.get(name);

  if (param('error') || param('error_description')) {
    throw new Error('Le lien de confirmation est invalide ou a expiré. Demandez un nouvel e-mail.');
  }

  const code = param('code');
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw new Error('La confirmation de votre adresse e-mail a échoué. Demandez un nouveau lien.');
    return;
  }

  const tokenHash = param('token_hash');
  if (tokenHash) {
    const rawType = param('type');
    if (!rawType || !EMAIL_OTP_TYPES.includes(rawType as MobileEmailOtpType)) {
      throw new Error('Le type de confirmation reçu est invalide. Demandez un nouveau lien.');
    }
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as MobileEmailOtpType,
    });
    if (error) throw new Error('La confirmation de votre adresse e-mail a échoué. Demandez un nouveau lien.');
    return;
  }

  const accessToken = param('access_token');
  const refreshToken = param('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw new Error('La session de confirmation n’a pas pu être ouverte. Reconnectez-vous.');
    return;
  }

  throw new Error('Le lien ne contient pas de code de confirmation exploitable. Demandez un nouvel e-mail.');
}
