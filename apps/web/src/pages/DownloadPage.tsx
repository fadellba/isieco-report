import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';

const releaseUrl = import.meta.env.VITE_ANDROID_RELEASE_URL as string | undefined;

export function DownloadPage() {
  return (
    <main className="public-page">
      <div className="public-page__shell">
        <header className="public-page__header">
          <Link to="/" className="public-page__brand" aria-label="ISIECO, retour à l'accueil"><BrandMark /></Link>
          <Link to="/connexion" className="public-page__login">Accès professionnel</Link>
        </header>

        <section className="download-panel" aria-labelledby="download-title">
          <div className="download-panel__visual" aria-hidden="true">
            <span className="download-panel__device">
              <span className="download-panel__device-top" />
              <span className="download-panel__device-logo">IS</span>
              <span className="download-panel__device-line download-panel__device-line--long" />
              <span className="download-panel__device-line" />
              <span className="download-panel__device-card" />
            </span>
            <span className="download-panel__pin" />
            <span className="download-panel__ring" />
          </div>

          <div className="download-panel__content">
            <span className="public-page__eyebrow">APPLICATION MOBILE · ANDROID</span>
            <h1 id="download-title">ISIECO vous accompagne sur le terrain.</h1>
            <p>
              Retrouvez les parcours citoyens et agents de terrain dans une application.
              Les fonctionnalités accessibles dépendent du compte connecté et des habilitations attribuées par le serveur.
            </p>
            {releaseUrl ? (
              <a className="download-panel__action" href={releaseUrl} rel="noreferrer">
                Télécharger l’APK Android <span aria-hidden="true">↓</span>
              </a>
            ) : (
              <div className="download-panel__notice" role="status">
                <strong>Version publique non disponible</strong>
                <span>Le lien de téléchargement sera affiché après publication d’une version Android signée.</span>
              </div>
            )}
            <div className="download-panel__safety">
              <strong>Avant l’installation</strong>
              <span>Installez uniquement un APK signé publié par le projet. Vérifiez sa version et son empreinte SHA-256.</span>
            </div>
          </div>
        </section>

        <footer className="public-page__footer">
          <span>© ISIECO · Propreté urbaine</span>
          <Link to="/connexion">Retour à la connexion</Link>
        </footer>
      </div>
    </main>
  );
}
