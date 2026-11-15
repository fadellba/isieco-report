import { Navigate, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import type { FunctionalRole } from '@isieco/shared';
import { useAuth } from './auth-context';

interface ProtectedRouteProps extends PropsWithChildren {
  roles?: FunctionalRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { profile, loading, error, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="app-state-screen">
        <section className="app-state-screen__card" role="status" aria-live="polite">
          <span className="app-state-screen__spinner" aria-hidden="true" />
          <span className="app-state-screen__eyebrow">ESPACE SÉCURISÉ</span>
          <h1>Préparation de votre espace</h1>
          <p>Vérification de votre session et de vos habilitations.</p>
        </section>
      </main>
    );
  }

  if (!profile && error) {
    return (
      <main className="app-state-screen">
        <section className="app-state-screen__card app-state-screen__card--error">
          <span className="app-state-screen__icon" aria-hidden="true">!</span>
          <span className="app-state-screen__eyebrow">SESSION</span>
          <h1>Espace temporairement indisponible</h1>
          <p>{error}</p>
          <button type="button" onClick={() => void refreshProfile()} className="page-state-card__primary">
            Réessayer
          </button>
        </section>
      </main>
    );
  }

  if (!profile) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  if (roles && !profile.roles.some((role) => roles.includes(role.code))) {
    return <Navigate to="/acces-refuse" replace />;
  }

  return <>{children}</>;
}
