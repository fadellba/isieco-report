import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import type { AuthenticatedProfile } from '@isieco/shared';
import { createApiClient } from '@isieco/api-client';
import { supabase } from '../lib/supabase';

const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL as string,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
});

export function AdminHomePage() {
  const [profile, setProfile] = useState<AuthenticatedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) { setSignedOut(true); setLoading(false); }
        return;
      }
      try {
        const result = await api.request<AuthenticatedProfile>('/accounts/me');
        if (active) setProfile(result);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (signedOut) return <Navigate to="/connexion" replace />;

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSignedOut(true);
  }

  return (
    <main className="min-h-screen bg-eco-50 px-5 py-12 text-eco-950 sm:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-eco-100 bg-white p-8 shadow-xl shadow-eco-900/5 sm:p-12">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-600">Back-office</p><h1 className="mt-3 text-3xl font-extrabold">ISI-Eco Report</h1></div>
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={handleSignOut} type="button">Déconnexion</button>
        </div>
        {loading ? <p className="mt-8 text-slate-600">Chargement du profil…</p> : null}
        {failed ? <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">Impossible de charger le profil. Vérifiez que l'API et la migration des rôles sont opérationnelles.</p> : null}
        {profile ? (
          <div className="mt-8 rounded-2xl bg-eco-50 p-6">
            <h2 className="text-xl font-bold">Bienvenue, {profile.prenom ? `${profile.prenom} ` : ''}{profile.nom}</h2>
            <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-wide text-eco-700">Habilitations actives</p>
            <div className="mt-2 flex flex-wrap gap-2">{profile.roles.map((role) => <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-eco-800" key={role.code}>{role.libelle}</span>)}</div>
            {profile.roles.every((role) => role.code === 'CITOYEN') ? <p className="mt-5 text-sm leading-6 text-amber-800">Ce compte dispose actuellement du rôle citoyen. L'accès au back-office nécessite une habilitation administrative attribuée par un administrateur.</p> : null}
          </div>
        ) : null}
        <Link className="mt-8 inline-flex font-semibold text-eco-700 hover:text-eco-900" to="/telecharger">Page de téléchargement mobile</Link>
      </section>
    </main>
  );
}
