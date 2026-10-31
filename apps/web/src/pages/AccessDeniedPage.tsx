import { Link } from 'react-router-dom';

export function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Accès refusé</p>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Habilitation manquante</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Votre compte ne possède pas le rôle nécessaire pour accéder à cette page. Les droits sont attribués par l'administration.
      </p>
      <Link to="/" className="mt-6 inline-flex rounded-lg bg-eco-700 px-4 py-2.5 text-sm font-bold text-white">Retour à l'accueil</Link>
    </div>
  );
}
