import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { AuthScreenFrame } from '../src/ui/AuthScreenFrame';

const inputClass = 'mt-2 min-h-[50px] rounded-2xl border border-line-strong bg-surface-base px-4 py-3.5 text-sm text-ink-900';

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
    if (busy || nom.trim().length < 2 || prenom.trim().length < 2 || !email.trim() || password.length < 12) return;
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
        setError('La création du compte est impossible. Vérifiez les informations saisies ou réessayez plus tard.');
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

  const canSubmit = !busy && nom.trim().length >= 2 && prenom.trim().length >= 2 && Boolean(email.trim()) && password.length >= 12;

  return (
    <AuthScreenFrame
      eyebrow="Rejoindre ISIECO"
      title="Créer votre compte citoyen."
      description="Déclarez une situation, retrouvez vos signalements et suivez les étapes de leur traitement."
    >
      <View>
        <Text className="text-xs font-extrabold text-ink-700">Nom</Text>
        <TextInput
          accessibilityLabel="Nom"
          autoCapitalize="words"
          autoComplete="name"
          className={inputClass}
          onChangeText={setNom}
          placeholder="Votre nom"
          placeholderTextColor="#8A968D"
          returnKeyType="next"
          value={nom}
        />
      </View>

      <View className="mt-4">
        <Text className="text-xs font-extrabold text-ink-700">Prénom</Text>
        <TextInput
          accessibilityLabel="Prénom"
          autoCapitalize="words"
          className={inputClass}
          onChangeText={setPrenom}
          placeholder="Votre prénom"
          placeholderTextColor="#8A968D"
          returnKeyType="next"
          value={prenom}
        />
      </View>

      <View className="mt-4">
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

      <View className="mt-4">
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
          accessibilityLabel="Mot de passe, 12 caractères minimum"
          autoCapitalize="none"
          autoComplete="new-password"
          className={inputClass}
          onChangeText={setPassword}
          placeholder="12 caractères minimum"
          placeholderTextColor="#8A968D"
          returnKeyType="done"
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          value={password}
        />
        <Text className="mt-2 text-[10px] leading-4 text-ink-400">Utilisez au moins 12 caractères. Évitez un mot de passe déjà utilisé ailleurs.</Text>
      </View>

      <View className="mt-5 rounded-xl border border-brand-forest/10 bg-brand-mist px-3.5 py-3">
        <Text className="text-[11px] leading-5 text-brand-forest">
          La création publique donne uniquement accès à l’espace citoyen. Les habilitations agents et administrateurs sont attribuées par l’organisation.
        </Text>
      </View>

      {message ? (
        <View className="mt-4 rounded-2xl border border-status-success/20 bg-status-success/5 p-4">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-status-success">{message}</Text>
          <Link className="mt-3 text-xs font-extrabold text-brand-forest" href="/sign-in">Retour à la connexion</Link>
        </View>
      ) : null}
      {error ? (
        <View className="mt-4 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-status-danger">{error}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
        disabled={!canSubmit}
        onPress={() => void handleSubmit()}
      >
        <Text className="text-sm font-extrabold text-white">{busy ? 'Création en cours…' : 'Créer mon compte'}</Text>
      </Pressable>

      <View className="mt-6 flex-row flex-wrap items-center justify-center border-t border-line-subtle pt-5">
        <Text className="text-xs text-ink-500">Vous avez déjà un compte ? </Text>
        <Link className="text-xs font-extrabold text-brand-forest" href="/sign-in">Se connecter</Link>
      </View>
    </AuthScreenFrame>
  );
}
