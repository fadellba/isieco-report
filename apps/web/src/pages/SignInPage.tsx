import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError) {
      setError('Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe.');
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-eco-50 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-eco-100 bg-white p-8 shadow-xl shadow-eco-900/5 sm:p-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-600">ISI-Eco Report · Administration</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-eco-950">Connexion</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Accès réservé aux comptes administratifs et aux agents habilités.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">Adresse e-mail<input autoComplete="username" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-eco-600 focus:ring-2 focus:ring-eco-100" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label className="block text-sm font-semibold text-slate-700">Mot de passe<input autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-eco-600 focus:ring-2 focus:ring-eco-100" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          {error && <p aria-live="polite" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-xl bg-eco-700 px-5 py-3.5 font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Connexion…' : 'Se connecter'}</button>
        </form>
        <Link className="mt-7 inline-flex text-sm font-semibold text-eco-700 hover:text-eco-900" to="/telecharger">Télécharger l'application mobile</Link>
      </section>
    </main>
  );
}
