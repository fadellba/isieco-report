import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

const inputClass =
  'mt-1.5 min-h-[48px] rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900';

export default function SignUpScreen() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (
      busy ||
      nom.trim().length < 2 ||
      prenom.trim().length < 2 ||
      !email.trim() ||
      password.length < 8
    )
      return;
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
        setError('La création du compte est impossible. Vérifiez les informations ou réessayez.');
        return;
      }
      if (data.session) {
        router.replace('/');
        return;
      }
      setMessage('Votre compte a été créé. Consultez vos e-mails pour confirmer votre adresse.');
    } catch {
      setError('La création du compte est momentanément indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    nom.trim().length >= 2 &&
    prenom.trim().length >= 2 &&
    Boolean(email.trim()) &&
    password.length >= 8;

  return (
    <AuthScreenFrame
      title="Créer un compte"
      description="Participez à la propreté de votre ville en signalant les dépôts sauvages."
    >
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-700">Prénom</Text>
          <TextInput
            autoCapitalize="words"
            className={inputClass}
            onChangeText={setPrenom}
            placeholder="Fatou"
            placeholderTextColor="#94A3B8"
            value={prenom}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-700">Nom</Text>
          <TextInput
            autoCapitalize="words"
            className={inputClass}
            onChangeText={setNom}
            placeholder="Diallo"
            placeholderTextColor="#94A3B8"
            value={nom}
          />
        </View>
      </View>

      <View className="mt-4">
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Adresse e-mail
        </Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          className={inputClass}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="nom@exemple.com"
          placeholderTextColor="#94A3B8"
          value={email}
        />
      </View>

      <View className="mt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Mot de passe
          </Text>
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Text className="text-xs font-bold text-emerald-600">
              {showPassword ? 'Masquer' : 'Afficher'}
            </Text>
          </Pressable>
        </View>
        <TextInput
          autoCapitalize="none"
          className={inputClass}
          onChangeText={setPassword}
          placeholder="8 caractères minimum"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showPassword}
          value={password}
        />
      </View>

      {error ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <Text className="text-xs text-red-700">{error}</Text>
        </View>
      ) : null}

      {message ? (
        <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <Text className="text-xs text-emerald-800 font-medium">{message}</Text>
        </View>
      ) : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => void handleSubmit()}
        className={`mt-6 min-h-[50px] items-center justify-center rounded-xl bg-emerald-600 active:bg-emerald-700 shadow-sm ${
          !canSubmit ? 'opacity-50' : ''
        }`}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text className="text-sm font-extrabold text-white">S'inscrire</Text>
        )}
      </Pressable>

      <View className="mt-6 items-center border-t border-slate-100 pt-5">
        <Text className="text-xs text-slate-500">
          Vous avez déjà un compte ?{' '}
          <Link className="font-bold text-emerald-700" href="/sign-in">
            Se connecter
          </Link>
        </Text>
      </View>
    </AuthScreenFrame>
  );
}
