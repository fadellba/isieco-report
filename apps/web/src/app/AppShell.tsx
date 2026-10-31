import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { navigationItems } from './navigation';

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const activeRoles = profile?.roles ?? [];
  const links = navigationItems.filter((item) =>
    item.roles.some((role) => activeRoles.some((active) => active.code === role)),
  );

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/connexion', { replace: true });
    } catch {
      navigate('/connexion', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-eco-100 bg-white lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-3 border-b border-slate-100 px-6 py-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-eco-700 text-lg font-black text-white">E</span>
          <span>
            <span className="block text-sm font-extrabold tracking-tight text-eco-900">ISI-Eco Report</span>
            <span className="mt-0.5 block text-xs text-slate-500">Back-office opérationnel</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Navigation principale">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Espace de travail</p>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-eco-50 text-eco-800' : 'text-slate-600 hover:bg-slate-50'}`
            }
          >
            Vue d'ensemble
          </NavLink>
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-eco-50 text-eco-800' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="truncate text-sm font-bold text-slate-800">
              {profile?.prenom ? `${profile.prenom} ${profile.nom}` : profile?.nom}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">{profile?.email}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-eco-700">ISI-Eco Report</p>
            <p className="text-sm text-slate-500">Plateforme de suivi environnemental</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">{profile?.roles.length ?? 0} habilitation(s)</span>
            <button type="button" onClick={handleSignOut} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 lg:hidden">
              Sortir
            </button>
          </div>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden" aria-label="Navigation mobile">
          <Link to="/" className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Accueil</Link>
          {links.map((item) => (
            <Link key={item.to} to={item.to} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{item.label}</Link>
          ))}
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
