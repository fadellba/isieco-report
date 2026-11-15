import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

const inputClass = 'mt-2 min-h-[52px] rounded-2xl border border-line-strong bg-surface-base px-4 py-3.5 text-sm text-ink-900';

export default function ResetPasswordScreen() {
  const incomingUrl = Linking.useLinkingURL();
  const [checking, setChecking] = useState(true);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [complete, setComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareRecovery() {
      setChecking(true);
      setError(null);
      try {
        if (incomingUrl) {
          const parsed = new URL(incomingUrl);
          const query = new URLSearchParams(parsed.search);
          const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
          const param = (key: string) => query.get(key) ?? hash.get(key);
          const callbackError = param('error_description') ?? param('error');
          if (callbackError) throw new Error('Le lien est invalide ou a expiré. Demandez-en un nouveau.');

          const code = param('code');
          const tokenHash = param('token_hash');
          const accessToken = param('access_token');
          const refreshToken = param('refresh_token');
          const flowType = param('type');

          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          } else if (tokenHash && flowType === 'recovery') {
            const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
            if (verifyError) throw verifyError;
          } else if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error('Aucune session de récupération valide. Demandez un nouveau lien depuis la connexion.');
        if (active) setRecoveryAvailable(true);
      } catch (reason) {
        if (active) {
          setRecoveryAvailable(false);
          setError(reason instanceof Error ? reason.message : 'Le lien de récupération est invalide ou a expiré.');
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void prepareRecovery();
    return () => { active = false; };
  }, [incomingUrl]);

  async function handleSubmit() {
    if (busy || !recoveryAvailable || password.length < 12 || password !== confirmation) return;
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setComplete(true);
      await supabase.auth.signOut();
    } catch {
      setError("Le mot de passe n'a pas pu être modifié. Le lien a peut-être expiré ; demandez-en un nouveau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenFrame
      eyebrow="Sécurité du compte"
      title={complete ? "Mot de passe modifié." : "Définir un mot de passe."}
      description={complete
        ? "Votre mot de passe a été mis à jour. Vous pouvez revenir à la connexion."
        : "Choisissez au moins 12 caractères et confirmez votre saisie."}
    >
      {checking ? (
        <Text className="py-3 text-center text-xs font-semibold text-ink-500">Vérification du lien…</Text>
      ) : complete ? (
        <View className="rounded-2xl border border-status-success/20 bg-status-success/5 p-4">
          <Text accessibilityRole="alert" className="text-sm font-extrabold text-status-success">Votre compte est prêt.</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-600">La session de récupération a été fermée après la modification du mot de passe.</Text>
          <Link className="mt-4 text-xs font-extrabold text-brand-forest" href="/sign-in">Se connecter</Link>
        </View>
      ) : !recoveryAvailable ? (
        <View className="rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-status-danger">
            {error ?? 'Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.'}
          </Text>
          <Link className="mt-4 text-xs font-extrabold text-brand-forest" href="/forgot-password">Demander un nouveau lien</Link>
        </View>
      ) : (
        <>
          <Text className="text-xs font-extrabold text-ink-700">Nouveau mot de passe</Text>
          <View className="mt-2 flex-row items-center rounded-2xl border border-line-strong bg-surface-base">
            <TextInput
              accessibilityLabel="Nouveau mot de passe, 12 caractères minimum"
              autoCapitalize="none"
              autoComplete="new-password"
              className="min-h-[52px] flex-1 px-4 py-3.5 text-sm text-ink-900"
              onChangeText={setPassword}
              placeholder="12 caractères minimum"
              placeholderTextColor="#8A968D"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              value={password}
            />
            <Pressable accessibilityRole="button" onPress={() => setShowPassword((visible) => !visible)} className="px-3 py-3">
              <Text className="text-[10px] font-extrabold text-brand-petrol">{showPassword ? 'Masquer' : 'Afficher'}</Text>
            </Pressable>
          </View>
          <Text className="mt-5 text-xs font-extrabold text-ink-700">Confirmer le mot de passe</Text>
          <TextInput
            accessibilityLabel="Confirmer le nouveau mot de passe"
            autoCapitalize="none"
            autoComplete="new-password"
            className={inputClass}
            onChangeText={setConfirmation}
            placeholder="Saisissez-le à nouveau"
            placeholderTextColor="#8A968D"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            value={confirmation}
          />
          {password && confirmation && password !== confirmation ? (
            <Text accessibilityRole="alert" className="mt-3 text-xs text-status-danger">Les deux mots de passe ne correspondent pas.</Text>
          ) : null}
          {error ? (
            <View className="mt-4 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
              <Text accessibilityRole="alert" className="text-xs leading-5 text-status-danger">{error}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || password.length < 12 || password !== confirmation }}
            className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
            disabled={busy || password.length < 12 || password !== confirmation}
            onPress={() => void handleSubmit()}
          >
            <Text className="text-sm font-extrabold text-white">{busy ? 'Mise à jour…' : 'Enregistrer le mot de passe'}</Text>
          </Pressable>
        </>
      )}
      <View className="mt-6 flex-row justify-center border-t border-line-subtle pt-5">
        <Link className="text-xs font-extrabold text-brand-forest" href="/sign-in">Retour à la connexion</Link>
      </View>
    </AuthScreenFrame>
  );
}
