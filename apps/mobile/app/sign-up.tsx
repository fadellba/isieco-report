import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import {
  normalizeEmailAddress,
  signUpErrorMessage,
  validateEmailAddress,
} from '../src/features/auth/email-utils.mjs';
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
  const [registrationEmail, setRegistrationEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    if (nom.trim().length < 2 || prenom.trim().length < 2) {
      setError('Renseignez votre prénom et votre nom (2 caractères minimum).');
      return;
    }

    const normalizedEmail = normalizeEmailAddress(email);
    const emailError = validateEmailAddress(normalizedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (password.length < 12) {
      setError('Choisissez un mot de passe de 12 caractères minimum.');
      return;
    }

    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { nom: nom.trim(), prenom: prenom.trim() },
          emailRedirectTo: Linking.createURL('auth/callback'),
        },
      });
      if (authError) {
        setError(signUpErrorMessage(authError));
        return;
      }
      if (data.session) {
        router.replace('/');
        return;
      }

      setRegistrationEmail(normalizedEmail);
      setMessage(
        'Votre demande de création de compte a été enregistrée. Ouvrez le lien de confirmation reçu à ' +
          normalizedEmail +
          ' pour activer votre compte.',
      );
    } catch (reason) {
      setError(signUpErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (busy || !registrationEmail) return;
    setBusy(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: registrationEmail,
        options: { emailRedirectTo: Linking.createURL('auth/callback') },
      });
      if (resendError) throw resendError;
      setMessage('Un nouvel e-mail de confirmation a été envoyé à ' + registrationEmail + '.');
    } catch (reason) {
      setError(signUpErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    nom.trim().length >= 2 &&
    prenom.trim().length >= 2 &&
    validateEmailAddress(email) === null &&
    password.length >= 12;

  return (
    <AuthScreenFrame
      title="Créer un compte citoyen"
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
          accessibilityLabel="Adresse e-mail"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          className={inputClass}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="nom@exemple.com"
          placeholderTextColor="#94A3B8"
          textContentType="emailAddress"
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
          accessibilityLabel="Mot de passe, 12 caractères minimum"
          autoCapitalize="none"
          autoComplete="new-password"
          className={inputClass}
          onChangeText={setPassword}
          placeholder="12 caractères minimum"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          value={password}
        />
      </View>

      {error ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <Text accessibilityRole="alert" className="text-xs leading-5 text-red-700">
            {error}
          </Text>
        </View>
      ) : null}

      {message ? (
        <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <Text className="text-xs font-medium leading-5 text-emerald-800">{message}</Text>
          {registrationEmail ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void resendConfirmation()}
              className="mt-3 self-start"
            >
              <Text className="text-xs font-extrabold text-emerald-900 underline">
                {busy ? 'Envoi…' : 'Renvoyer l’e-mail de confirmation'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        onPress={() => void handleSubmit()}
        className={`mt-6 min-h-[50px] items-center justify-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-950/20 ${
          !canSubmit ? 'opacity-50' : 'active:bg-emerald-700'
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
