import { useState } from 'react';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { normalizeEmailAddress, validateEmailAddress } from '../src/features/auth/email-utils.mjs';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

const inputClass =
  'mt-2 min-h-[52px] rounded-2xl border border-line-strong bg-surface-base px-4 py-3.5 text-sm text-ink-900';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    const normalizedEmail = normalizeEmailAddress(email);
    const emailError = validateEmailAddress(normalizedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const redirectTo = Linking.createURL('reset-password');
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
      if (requestError) throw requestError;
      setSent(true);
    } catch {
      setError(
        "La demande ne peut pas être envoyée pour le moment. Vérifiez l'adresse saisie et réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenFrame
      eyebrow="Récupération de compte"
      title="Retrouvez votre accès."
      description="Recevez un lien temporaire pour choisir un nouveau mot de passe."
    >
      {sent ? (
        <View className="rounded-2xl border border-status-success/20 bg-status-success/5 p-4">
          <Text accessibilityRole="alert" className="text-sm font-extrabold text-status-success">
            Vérifiez votre boîte e-mail.
          </Text>
          <Text className="mt-2 text-xs leading-5 text-ink-600">
            Si cette adresse correspond à un compte, un message contenant un lien de
            réinitialisation vient d’être envoyé. Consultez aussi vos courriers indésirables.
          </Text>
          <Link className="mt-4 text-xs font-extrabold text-brand-forest" href="/sign-in">
            Retour à la connexion
          </Link>
        </View>
      ) : (
        <>
          <Text className="text-xs font-extrabold text-ink-700">Adresse e-mail</Text>
          <TextInput
            accessibilityLabel="Adresse e-mail"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            className={inputClass}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="nom@exemple.com"
            placeholderTextColor="#8A968D"
            returnKeyType="go"
            textContentType="emailAddress"
            value={email}
          />
          {error ? (
            <View className="mt-4 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
              <Text accessibilityRole="alert" className="text-xs leading-5 text-status-danger">
                {error}
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !email.trim() }}
            className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
            disabled={busy || validateEmailAddress(email) !== null}
            onPress={() => void handleSubmit()}
          >
            <Text className="text-sm font-extrabold text-white">
              {busy ? 'Envoi en cours…' : 'Envoyer le lien'}
            </Text>
          </Pressable>
        </>
      )}
      <View className="mt-6 flex-row flex-wrap items-center justify-center border-t border-line-subtle pt-5">
        <Link className="text-xs font-extrabold text-brand-forest" href="/sign-in">
          Retour à la connexion
        </Link>
      </View>
    </AuthScreenFrame>
  );
}
