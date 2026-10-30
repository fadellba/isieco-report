import { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import type { AuthenticatedProfile } from '@isieco/shared';
import { api } from '../src/lib/api';
import { supabase } from '../src/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<AuthenticatedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/sign-in'); return; }
      try {
        const result = await api.request<AuthenticatedProfile>('/accounts/me');
        if (active) setProfile(result);
      } catch {
        if (active) setError('Impossible de charger votre profil. Vérifiez la connexion à l’API.');
      } finally { if (active) setLoading(false); }
    }
    void loadProfile();
    return () => { active = false; };
  }, [router]);
  async function signOut() { await supabase.auth.signOut(); router.replace('/sign-in'); }
  if (loading) return <View className="flex-1 items-center justify-center bg-eco-50"><ActivityIndicator size="large" color="#166534" /><Text className="mt-4 text-slate-600">Chargement du profil…</Text></View>;
  return (
    <View className="flex-1 justify-center bg-eco-50 px-7 py-10">
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-600">ISI-ECO REPORT</Text>
      {profile ? <><Text className="mt-4 text-3xl font-extrabold text-eco-950">Bonjour {profile.prenom ? `${profile.prenom} ` : ''}{profile.nom}</Text><Text className="mt-2 text-base text-slate-600">{profile.email}</Text><View className="mt-8 rounded-2xl border border-eco-100 bg-white p-5"><Text className="text-sm font-bold uppercase tracking-wide text-eco-700">Vos rôles</Text>{profile.roles.map((role) => <Text className="mt-2 text-base text-eco-950" key={role.code}>• {role.libelle}</Text>)}<Text className="mt-4 text-sm leading-6 text-slate-600">Les fonctionnalités disponibles dépendront des habilitations accordées à votre compte.</Text></View></> : null}
      {error ? <Text className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}
      <TouchableOpacity className="mt-8 rounded-xl bg-eco-700 px-5 py-4" onPress={signOut}><Text className="text-center font-bold text-white">Se déconnecter</Text></TouchableOpacity>
      <Link className="mt-6 text-center font-semibold text-eco-700" href="/sign-in">Écran de connexion</Link>
    </View>
  );
}
