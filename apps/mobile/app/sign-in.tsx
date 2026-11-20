import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { normalizeEmailAddress, validateEmailAddress } from '../src/features/auth/email-utils.mjs';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

const inputClass =
  'mt-1.5 min-h-[48px] rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy || !password) return;
    const normalizedEmail = normalizeEmailAddress(email);
    const emailError = validateEmailAddress(normalizedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (authError) {
        setError(
          'Connexion impossible. Vérifiez vos identifiants ou confirmez votre adresse e-mail.',
        );
        return;
      }
      router.replace('/');
    } catch {
      setError('Le service de connexion est momentanément indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenFrame
      title="Connexion"
      description="Connectez-vous pour signaler un dépôt ou retrouver vos missions de terrain."
    >
      <View>
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Adresse e-mail
        </Text>
        <TextInput
          accessibilityLabel="Adresse e-mail"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          className={inputClass}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="nom@exemple.com"
          placeholderTextColor="#94A3B8"
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
      </View>

      <View className="mt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Mot de passe
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
            }
            onPress={() => setShowPassword((visible) => !visible)}
            hitSlop={8}
          >
            <Text className="text-xs font-bold text-emerald-600">
              {showPassword ? 'Masquer' : 'Afficher'}
            </Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Mot de passe"
          autoCapitalize="none"
          autoComplete="current-password"
          className={inputClass}
          onChangeText={setPassword}
          onSubmitEditing={() => void handleSubmit()}
          placeholder="Votre mot de passe"
          placeholderTextColor="#94A3B8"
          returnKeyType="go"
          secureTextEntry={!showPassword}
          textContentType="password"
          value={password}
        />
        <View className="mt-2 items-end">
          <Link className="text-xs font-bold text-emerald-600" href="/forgot-password">
            Mot de passe oublié ?
          </Link>
        </View>
      </View>

      {error ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-red-700">
            {error}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Se connecter"
        disabled={busy || validateEmailAddress(email) !== null || !password}
        onPress={() => void handleSubmit()}
        className="mt-6 min-h-[50px] items-center justify-center rounded-xl bg-emerald-600 active:bg-emerald-700 shadow-sm shadow-emerald-950/20"
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text className="text-sm font-extrabold text-white">Se connecter</Text>
        )}
      </Pressable>

      <View className="mt-6 items-center border-t border-slate-100 pt-5">
        <Text className="text-xs text-slate-500">
          Vous n’avez pas encore de compte ?{' '}
          <Link className="font-bold text-emerald-700" href="/sign-up">
            Créer un compte citoyen
          </Link>
        </Text>
      </View>
    </AuthScreenFrame>
  );
}
