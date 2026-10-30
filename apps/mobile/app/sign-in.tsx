import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function handleSubmit() {
    setError(null); setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) { setError('Connexion impossible. Vérifiez vos identifiants ou confirmez votre adresse e-mail.'); return; }
    router.replace('/');
  }
  return (
    <View className="flex-1 justify-center bg-eco-50 px-7 py-10">
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-600">ISI-ECO REPORT</Text>
      <Text className="mt-4 text-3xl font-extrabold text-eco-950">Connexion</Text>
      <Text className="mt-3 text-base leading-7 text-slate-600">Connectez-vous à votre espace citoyen ou agent de terrain.</Text>
      <TextInput autoCapitalize="none" autoComplete="email" className="mt-8 rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900" keyboardType="email-address" onChangeText={setEmail} placeholder="Adresse e-mail" value={email} />
      <TextInput autoCapitalize="none" autoComplete="password" className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900" onChangeText={setPassword} placeholder="Mot de passe" secureTextEntry value={password} />
      {error ? <Text className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}
      <TouchableOpacity className="mt-7 rounded-xl bg-eco-700 px-5 py-4" disabled={busy} onPress={() => void handleSubmit()}><Text className="text-center font-bold text-white">{busy ? 'Connexion…' : 'Se connecter'}</Text></TouchableOpacity>
      <Link className="mt-7 text-center font-semibold text-eco-700" href="/sign-up">Créer un compte citoyen</Link>
    </View>
  );
}
