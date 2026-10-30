import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [nom, setNom] = useState(''); const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function handleSubmit() {
    setError(null); setMessage(null); setBusy(true);
    const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { nom: nom.trim(), prenom: prenom.trim() } } });
    setBusy(false);
    if (authError) { setError(authError.message); return; }
    if (data.session) { router.replace('/'); return; }
    setMessage('Votre compte a été créé. Consultez votre boîte e-mail pour confirmer votre adresse, puis connectez-vous.');
  }
  return (
    <View className="flex-1 justify-center bg-eco-50 px-7 py-10">
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-600">ISI-ECO REPORT</Text>
      <Text className="mt-4 text-3xl font-extrabold text-eco-950">Créer un compte citoyen</Text>
      <Text className="mt-3 text-base leading-7 text-slate-600">Les nouveaux comptes reçoivent uniquement le rôle citoyen. Les autres habilitations sont attribuées par l'administration.</Text>
      <TextInput className="mt-7 rounded-xl border border-slate-300 bg-white px-4 py-4 text-base" onChangeText={setNom} placeholder="Nom" value={nom} />
      <TextInput className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-4 text-base" onChangeText={setPrenom} placeholder="Prénom" value={prenom} />
      <TextInput autoCapitalize="none" className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-4 text-base" keyboardType="email-address" onChangeText={setEmail} placeholder="Adresse e-mail" value={email} />
      <TextInput autoCapitalize="none" className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-4 text-base" onChangeText={setPassword} placeholder="Mot de passe (12 caractères minimum)" secureTextEntry value={password} />
      {message ? <Text className="mt-4 rounded-xl bg-eco-100 p-4 text-sm text-eco-900">{message}</Text> : null}
      {error ? <Text className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}
      <TouchableOpacity className="mt-6 rounded-xl bg-eco-700 px-5 py-4" disabled={busy || nom.trim().length < 2 || password.length < 12} onPress={() => void handleSubmit()}><Text className="text-center font-bold text-white">{busy ? 'Création…' : 'Créer mon compte'}</Text></TouchableOpacity>
      <Link className="mt-7 text-center font-semibold text-eco-700" href="/sign-in">J'ai déjà un compte</Link>
    </View>
  );
}
