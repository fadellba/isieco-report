import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !password) return;

    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/connexion', { replace: true }), 2500);
    } catch {
      setError('Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <BrandMark size="lg" className="justify-center" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-7 sm:p-9">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Nouveau mot de passe
            </h1>
            <p className="text-sm text-slate-500 mt-1">Définissez un mot de passe robuste</p>
          </div>

          {error && (
            <div
              className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 leading-relaxed flex items-start gap-2.5"
              role="alert"
            >
              <span className="text-red-500 font-bold">✕</span>
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                ✓
              </div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">Mot de passe mis à jour !</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Redirection automatique vers la connexion…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full h-11 px-3.5 pr-11 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full h-11 px-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 mt-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {busy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/connexion"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  ← Annuler et retourner à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
