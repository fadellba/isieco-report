import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth-context';
import { navigationItems } from '../../app/navigation';

export function DashboardPage() {
  const { profile } = useAuth();
  const roles = profile?.roles ?? [];
  const availableItems = navigationItems.filter((item) =>
    item.roles.some((role) => roles.some((active) => active.code === role)),
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Vue d'ensemble</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Bonjour{profile?.prenom ? ` ${profile.prenom}` : ''}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Votre espace de travail ISI-Eco Report. Les accès ci-dessous sont calculés à partir des habilitations retournées par l'API.
            </p>
          </div>
          <span className="rounded-full border border-eco-100 bg-white px-3 py-1.5 text-xs font-semibold text-eco-800">
            Compte {profile?.etatCompte?.toLowerCase()}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Identité</p>
          <h2 className="mt-3 text-lg font-bold text-slate-900">{profile?.prenom ? `${profile.prenom} ${profile.nom}` : profile?.nom}</h2>
          <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Habilitations actives</p>
          <p className="mt-3 text-3xl font-extrabold text-eco-800">{roles.length}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((role) => (
              <span key={role.code} className="rounded-full bg-eco-50 px-2.5 py-1 text-xs font-semibold text-eco-800">{role.libelle}</span>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">État du compte</p>
          <p className="mt-3 text-xl font-extrabold text-slate-900">{profile?.etatCompte}</p>
          <p className="mt-2 text-sm text-slate-500">Les décisions d'accès sont vérifiées côté serveur à chaque requête protégée.</p>
        </article>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Vos espaces</h2>
            <p className="mt-1 text-sm text-slate-500">Seuls les modules accessibles à votre compte sont affichés.</p>
          </div>
        </div>
        {availableItems.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableItems.map((item) => (
              <Link key={item.to} to={item.to} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-eco-300 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900">{item.label}</h3>
                  <span className="text-eco-700 transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Aucun espace de back-office n'est associé à ce compte. Les parcours citoyen sont accessibles depuis l'application mobile.
          </div>
        )}
      </section>
    </div>
  );
}
