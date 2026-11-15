import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { supabase } from '../lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const redirectTo = new URL('/reinitialiser-mot-de-passe', window.location.origin).toString();
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (requestError) throw requestError;
      setSent(true);
    } catch {
      setError("La demande ne peut pas être envoyée pour le moment. Vérifiez l'adresse saisie et réessayez.");
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
            <span className="auth-story__eyebrow">RÉCUPÉRATION DE COMPTE</span>
            <h1>Retrouvez votre accès en toute sécurité.</h1>
            <p>Un lien temporaire vous permettra de définir un nouveau mot de passe et de reprendre votre activité.</p>
          </div>
          <div className="auth-story__footer">ISIECO · PLATEFORME DE SUIVI OPÉRATIONNEL</div>
        </aside>

        <section className="auth-main" aria-labelledby="auth-title">
          <div className="auth-main__top">
            <span className="auth-main__secure"><span /> Procédure sécurisée</span>
            <Link to="/connexion">Retour à la connexion</Link>
          </div>
          <div className="auth-card">
            <div className="auth-card__heading">
              <span className="auth-card__eyebrow">MOT DE PASSE OUBLIÉ</span>
              <h2 id="auth-title">Recevoir un lien.</h2>
              <p>Saisissez l’adresse e-mail associée à votre compte ISIECO.</p>
            </div>

            {sent ? (
              <div className="auth-form__success" role="status">
                <strong>Vérifiez votre boîte e-mail.</strong>
                <p>Si cette adresse correspond à un compte, un message contenant un lien de réinitialisation vient d’être envoyé. Consultez aussi vos courriers indésirables.</p>
                <Link className="auth-form__link" to="/connexion">Retour à la connexion</Link>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <span>Adresse e-mail</span>
                  <input
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nom@organisation.sn"
                    required
                    type="email"
                    value={email}
                  />
                </label>
                {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
                <button className="auth-form__submit" disabled={busy || !email.trim()} type="submit">
                  <span>{busy ? 'Envoi en cours…' : 'Envoyer le lien'}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            <div className="auth-card__note">
              <span className="auth-card__note-icon" aria-hidden="true">i</span>
              <p>Pour protéger les comptes, cette page affiche le même message que l’adresse existe ou non.</p>
            </div>
          </div>
          <footer className="auth-main__footer">
            <span>© ISIECO · Propreté urbaine</span>
            <span>Le lien envoyé est à usage unique et temporaire</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
