import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { BrandMark } from '../src/ui/BrandMark';

export default function SignUpScreen() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { nom: nom.trim(), prenom: prenom.trim() } },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.session) {
        router.replace('/');
        return;
      }
      setMessage('Votre compte a été créé. Consultez votre boîte e-mail pour confirmer votre adresse, puis connectez-vous.');
    } catch {
      setError('La création du compte est momentanément indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'mt-2 rounded-2xl border border-line-strong bg-white px-4 py-4 text-sm text-ink-900';

  return (
    <KeyboardAvoidingView className="flex-1 bg-surface-base" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
        <BrandMark />
        <View className="mt-10">
          <Text className="text-xs font-bold uppercase tracking-[0.16em] text-brand-forest">Rejoindre ISIECO</Text>
          <Text className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900">Créer un compte citoyen</Text>
          <Text className="mt-3 text-sm leading-6 text-ink-500">
            Les nouveaux comptes reçoivent uniquement le rôle citoyen. Les autres habilitations sont attribuées par l’administration.
          </Text>
        </View>

        <View className="mt-8 gap-4">
          <View>
            <Text className="text-xs font-bold text-ink-700">Nom</Text>
            <TextInput autoCapitalize="words" className={inputClass} onChangeText={setNom} placeholder="Votre nom" placeholderTextColor="#8A948C" value={nom} />
          </View>
          <View>
            <Text className="text-xs font-bold text-ink-700">Prénom</Text>
            <TextInput autoCapitalize="words" className={inputClass} onChangeText={setPrenom} placeholder="Votre prénom" placeholderTextColor="#8A948C" value={prenom} />
          </View>
          <View>
            <Text className="text-xs font-bold text-ink-700">Adresse e-mail</Text>
            <TextInput autoCapitalize="none" autoComplete="email" autoCorrect={false} className={inputClass} keyboardType="email-address" onChangeText={setEmail} placeholder="nom@exemple.com" placeholderTextColor="#8A948C" value={email} />
          </View>
          <View>
            <Text className="text-xs font-bold text-ink-700">Mot de passe</Text>
            <TextInput autoCapitalize="none" autoComplete="new-password" className={inputClass} onChangeText={setPassword} placeholder="12 caractères minimum" placeholderTextColor="#8A948C" secureTextEntry value={password} />
          </View>
        </View>

        {message ? <Text className="mt-5 rounded-2xl border border-brand-forest/15 bg-brand-mist p-4 text-sm leading-5 text-brand-forest">{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" className="mt-5 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4 text-sm leading-5 text-status-danger">{error}</Text> : null}

        <TouchableOpacity
          accessibilityRole="button"
          className="mt-6 rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
          disabled={busy || nom.trim().length < 2 || prenom.trim().length < 2 || !email.trim() || password.length < 12}
          onPress={() => void handleSubmit()}
        >
          <Text className="text-center text-sm font-extrabold text-white">{busy ? 'Création…' : 'Créer mon compte'}</Text>
        </TouchableOpacity>

        <View className="mt-7 flex-row items-center justify-center">
          <Text className="text-xs text-ink-500">Vous avez déjà un compte ? </Text>
          <Link className="text-xs font-extrabold text-brand-forest" href="/sign-in">Se connecter</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
