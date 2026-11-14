import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

const inputClass = 'mt-2 min-h-[52px] rounded-2xl border border-line-strong bg-surface-base px-4 py-3.5 text-sm text-ink-900';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy || !email.trim() || !password) return;
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError('Connexion impossible. Vérifiez vos identifiants ou confirmez votre adresse e-mail.');
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
      eyebrow="Votre espace ISIECO"
      title="Heureux de vous retrouver."
      description="Connectez-vous pour signaler un dépôt, suivre son traitement ou retrouver vos missions de terrain."
    >
      <View>
        <Text className="text-xs font-extrabold text-ink-700">Adresse e-mail</Text>
        <TextInput
          accessibilityLabel="Adresse e-mail"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          className={inputClass}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="nom@exemple.com"
          placeholderTextColor="#8A968D"
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
      </View>

      <View className="mt-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-extrabold text-ink-700">Mot de passe</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onPress={() => setShowPassword((visible) => !visible)}
            hitSlop={8}
          >
            <Text className="text-[10px] font-extrabold text-brand-petrol">{showPassword ? 'Masquer' : 'Afficher'}</Text>
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
          placeholderTextColor="#8A968D"
          returnKeyType="go"
          secureTextEntry={!showPassword}
          textContentType="password"
          value={password}
        />
        <View className="mt-3 items-end">
          <Link className="text-[10px] font-extrabold text-brand-forest" href="/forgot-password">Mot de passe oublié ?</Link>
        </View>
      </View>

      {error ? (
        <View className="mt-5 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-status-danger">{error}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || !email.trim() || !password }}
        className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
        disabled={busy || !email.trim() || !password}
        onPress={() => void handleSubmit()}
      >
        <Text className="text-sm font-extrabold text-white">{busy ? 'Connexion en cours…' : 'Se connecter'}</Text>
      </Pressable>

      <View className="mt-6 border-t border-line-subtle pt-5">
        <View className="flex-row flex-wrap items-center justify-center">
          <Text className="text-xs text-ink-500">Pas encore de compte ? </Text>
          <Link className="text-xs font-extrabold text-brand-forest" href="/sign-up">Créer un compte citoyen</Link>
        </View>
        <Text className="mt-4 text-center text-[10px] leading-4 text-ink-400">
          Les accès agents et administrateurs sont attribués par leur organisation.
        </Text>
      </View>
    </AuthScreenFrame>
  );
}
