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
      <div className="grid min-h-screen place-items-center bg-eco-50 px-6 text-sm text-slate-600">
        Chargement de votre espace…
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className="grid min-h-screen place-items-center bg-eco-50 px-6 py-10">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-7">
          <h1 className="text-lg font-extrabold text-slate-900">Espace indisponible</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="mt-5 rounded-lg bg-eco-700 px-4 py-2.5 text-sm font-bold text-white"
          >
            Réessayer
          </button>
        </div>
      </div>
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
