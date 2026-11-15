import { Link } from 'react-router-dom';

export function AccessDeniedPage() {
  return (
    <section className="page-state-card page-state-card--warning" aria-labelledby="access-denied-title">
      <div className="page-state-card__icon" aria-hidden="true">!</div>
      <span className="page-state-card__eyebrow">HABILITATIONS</span>
      <h1 id="access-denied-title">Cet espace n’est pas accessible.</h1>
      <p>
        Votre compte est bien identifié, mais il ne possède pas le rôle requis pour consulter cette page.
        Les habilitations sont attribuées par l’administration.
      </p>
      <div className="page-state-card__actions">
        <Link to="/" className="page-state-card__primary">Retour à mon espace</Link>
      </div>
    </section>
  );
}
