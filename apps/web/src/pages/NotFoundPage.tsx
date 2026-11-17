import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="app-state-screen">
      <section className="app-state-screen__card">
        <span className="app-state-screen__icon" aria-hidden="true">
          404
        </span>
        <span className="app-state-screen__eyebrow">NAVIGATION</span>
        <h1>Cette page n’existe pas.</h1>
        <p>
          L’adresse utilisée ne correspond à aucun écran ISIECO disponible. Vérifiez le lien ou
          revenez à votre espace.
        </p>
        <Link to="/" className="page-state-card__primary" style={{ marginTop: 22 }}>
          Revenir à l’accueil
        </Link>
      </section>
    </main>
  );
}
