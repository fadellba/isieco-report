import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { supabase } from '../lib/supabase';

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim() || !password) return;
    setError(null);
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError('Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe.');
        return;
      }
      navigate('/', { replace: true });
    } catch {
      setError('Le service de connexion est momentanément indisponible. Réessayez dans quelques instants.');
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
            <span className="auth-story__eyebrow">PROPRETÉ URBAINE · ACTION PUBLIQUE</span>
            <h1>Du signalement à la résolution, chaque étape compte.</h1>
            <p>Une plateforme commune pour signaler, organiser les interventions de terrain et suivre leur vérification.</p>
            <div className="auth-story__flow" aria-label="Parcours opérationnel">
              <span>Signalement</span>
              <i />
              <span>Qualification</span>
              <i />
              <span>Intervention</span>
              <i />
              <span>Vérification</span>
            </div>
          </div>
          <div className="auth-story__footer">
            <span className="auth-story__orb auth-story__orb--one" />
            <span className="auth-story__orb auth-story__orb--two" />
            <span>ISIECO · PLATEFORME DE SUIVI OPÉRATIONNEL</span>
          </div>
        </aside>

        <section className="auth-main" aria-labelledby="auth-title">
          <div className="auth-main__top">
            <span className="auth-main__secure"><span /> Connexion sécurisée</span>
            <Link to="/telecharger">Application mobile</Link>
          </div>
          <div className="auth-card">
            <div className="auth-card__heading">
              <span className="auth-card__eyebrow">ESPACE PROFESSIONNEL</span>
              <h2 id="auth-title">Bienvenue.</h2>
              <p>Connectez-vous avec les identifiants fournis par votre organisation.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Adresse e-mail</span>
                <input
                  autoComplete="username"
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

              <label className="auth-field">
                <span>Mot de passe</span>
                <div className="auth-field__password">
                  <input
                    autoComplete="current-password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Votre mot de passe"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </label>

              {error ? <p className="auth-form__error" role="alert">{error}</p> : null}

              <button className="auth-form__submit" disabled={busy || !email.trim() || !password} type="submit">
                <span>{busy ? 'Connexion en cours…' : 'Se connecter'}</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className="auth-card__note">
              <span className="auth-card__note-icon" aria-hidden="true">i</span>
              <p>Les habilitations et les espaces disponibles dépendent de votre compte. Les droits sont vérifiés par le serveur.</p>
            </div>
          </div>
          <footer className="auth-main__footer">
            <span>© ISIECO · Propreté urbaine</span>
            <span>Accès réservé aux comptes habilités</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
