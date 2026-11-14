import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [complete, setComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setRecoveryAvailable(true);
        setChecking(false);
      }
    });

    void supabase.auth.getSession().then(({ data: sessionData, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError("Le lien ne peut pas être vérifié. Demandez-en un nouveau.");
      } else if (sessionData.session) {
        setRecoveryAvailable(true);
      }
      setChecking(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !recoveryAvailable || password.length < 12 || password !== confirmation) return;

    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setComplete(true);
      await supabase.auth.signOut();
    } catch {
      setError("Le mot de passe n'a pas pu être modifié. Le lien a peut-être expiré ; demandez-en un nouveau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <aside className="auth-story" aria-label="Présentation ISIECO">
          <div className="auth-story__brand"><BrandMark /></div>
          <div className="auth-story__content">
            <span className="auth-story__eyebrow">SÉCURITÉ DU COMPTE</span>
            <h1>Un nouvel accès, sous votre contrôle.</h1>
            <p>Choisissez un mot de passe robuste. Votre compte retrouvera ensuite son parcours de connexion habituel.</p>
          </div>
          <div className="auth-story__footer">ISIECO · PLATEFORME DE SUIVI OPÉRATIONNEL</div>
        </aside>

        <section className="auth-main" aria-labelledby="auth-title">
          <div className="auth-main__top">
            <span className="auth-main__secure"><span /> Lien de récupération</span>
            <Link to="/connexion">Retour à la connexion</Link>
          </div>
          <div className="auth-card">
            <div className="auth-card__heading">
              <span className="auth-card__eyebrow">NOUVEAU MOT DE PASSE</span>
              <h2 id="auth-title">{complete ? 'Mot de passe modifié.' : 'Définir un mot de passe.'}</h2>
              <p>{complete
                ? 'Votre mot de passe a été mis à jour. Vous pouvez vous connecter avec vos nouveaux identifiants.'
                : 'Utilisez au moins 12 caractères et confirmez votre saisie.'}</p>
            </div>

            {checking ? (
              <div className="auth-form__notice" role="status">Vérification du lien de récupération…</div>
            ) : complete ? (
              <div className="auth-form__success" role="status">
                <strong>Votre compte est prêt.</strong>
                <p>La session de récupération a été fermée après la modification du mot de passe.</p>
                <Link className="auth-form__link" to="/connexion">Se connecter</Link>
              </div>
            ) : !recoveryAvailable ? (
              <div className="auth-form__error" role="alert">
                {error ?? 'Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.'}
                <Link className="auth-form__link" to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <span>Nouveau mot de passe</span>
                  <div className="auth-field__password">
                    <input
                      autoComplete="new-password"
                      name="new-password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="12 caractères minimum"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </label>
                <label className="auth-field">
                  <span>Confirmer le mot de passe</span>
                  <input
                    autoComplete="new-password"
                    name="confirm-password"
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="Saisissez-le à nouveau"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={confirmation}
                  />
                </label>
                <p className="auth-form__hint">Le mot de passe doit contenir au moins 12 caractères.</p>
                {password && confirmation && password !== confirmation
                  ? <p className="auth-form__error" role="alert">Les deux mots de passe ne correspondent pas.</p>
                  : null}
                {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
                <button className="auth-form__submit" disabled={busy || password.length < 12 || password !== confirmation} type="submit">
                  <span>{busy ? 'Mise à jour…' : 'Enregistrer le mot de passe'}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}
          </div>
          <footer className="auth-main__footer">
            <span>© ISIECO · Propreté urbaine</span>
            <span>Ne partagez jamais ce lien de récupération</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
