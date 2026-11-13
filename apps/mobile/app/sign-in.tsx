import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { BrandMark } from '../src/ui/BrandMark';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
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
    <KeyboardAvoidingView className="flex-1 bg-surface-base" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>
        <BrandMark />
        <View className="mt-12">
          <Text className="text-xs font-bold uppercase tracking-[0.16em] text-brand-forest">Votre espace ISIECO</Text>
          <Text className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">Bienvenue.</Text>
          <Text className="mt-3 text-sm leading-6 text-ink-500">
            Connectez-vous pour signaler un dépôt ou retrouver vos missions de terrain.
          </Text>
        </View>

        <View className="mt-9 gap-5">
          <View>
            <Text className="text-xs font-bold text-ink-700">Adresse e-mail</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              className="mt-2 rounded-2xl border border-line-strong bg-white px-4 py-4 text-sm text-ink-900"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="nom@exemple.com"
              placeholderTextColor="#8A948C"
              returnKeyType="next"
              value={email}
            />
          </View>
          <View>
            <Text className="text-xs font-bold text-ink-700">Mot de passe</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="current-password"
              className="mt-2 rounded-2xl border border-line-strong bg-white px-4 py-4 text-sm text-ink-900"
              onChangeText={setPassword}
              placeholder="Votre mot de passe"
              placeholderTextColor="#8A948C"
              returnKeyType="done"
              secureTextEntry
              value={password}
              onSubmitEditing={() => void handleSubmit()}
            />
          </View>
        </View>

        {error ? (
          <Text accessibilityRole="alert" className="mt-5 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4 text-sm leading-5 text-status-danger">
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          className="mt-7 rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
          disabled={busy || !email.trim() || !password}
          onPress={() => void handleSubmit()}
        >
          <Text className="text-center text-sm font-extrabold text-white">{busy ? 'Connexion…' : 'Se connecter'}</Text>
        </TouchableOpacity>

        <View className="mt-8 flex-row items-center justify-center">
          <Text className="text-xs text-ink-500">Pas encore de compte ? </Text>
          <Link className="text-xs font-extrabold text-brand-forest" href="/sign-up">Créer un compte citoyen</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
