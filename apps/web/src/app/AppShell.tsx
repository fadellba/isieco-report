import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { navigationItems, type NavigationGroup } from './navigation';
import { AppIcon } from '../components/AppIcon';
import { BrandMark } from '../components/BrandMark';

const groups: NavigationGroup[] = ['Opérations', 'Administration'];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const activeRoles = profile?.roles ?? [];
  const links = navigationItems.filter((item) =>
    item.roles.some((role) => activeRoles.some((active) => active.code === role)),
  );
  const currentItem = links.find(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
  );
  const pageTitle = currentItem?.label ?? 'Tableau de bord';
  const initials =
    [profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'IS';
  const fullName = profile?.prenom
    ? `${profile.prenom} ${profile.nom}`
    : (profile?.nom ?? 'Utilisateur');
  const primaryRole = activeRoles[0]?.libelle ?? 'Opérateur';

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Continue to login
    }
    navigate('/connexion', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Dark Forest Green Sidebar matching web.PNG */}
      <aside className="w-full md:w-64 bg-[#0A261E] border-r border-[#13382D] flex-shrink-0 flex flex-col justify-between z-30">
        <div>
          {/* Logo brand */}
          <div className="h-20 flex items-center px-6 border-b border-[#13382D]">
            <Link to="/" className="flex items-center gap-3" aria-label="ISIECO Accueil">
              <BrandMark variant="dark-sidebar" size="md" />
            </Link>
          </div>

          {/* Navigation items */}
          <nav className="p-4 space-y-6">
            <div>
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-emerald-400/60 mb-2">
                Espace Principal
              </p>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#13382D]'
                  }`
                }
              >
                <AppIcon name="overview" size={17} />
                <span>Tableau de bord</span>
              </NavLink>
            </div>

            {groups.map((group) => {
              const groupedLinks = links.filter((item) => item.group === group);
              if (!groupedLinks.length) return null;
              return (
                <div key={group}>
                  <p className="px-3 text-[10px] font-black uppercase tracking-widest text-emerald-400/60 mb-2">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {groupedLinks.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/40'
                              : 'text-slate-300 hover:text-white hover:bg-[#13382D]'
                          }`
                        }
                        title={item.description}
                      >
                        <AppIcon name={item.icon} size={17} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-[#13382D] bg-[#071E17]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{fullName}</p>
              <p className="text-[10px] text-emerald-400/80 truncate">{primaryRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition"
          >
            <AppIcon name="logout" size={14} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar matching web.PNG */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Search bar */}
          <div className="relative max-w-md w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un signalement, une adresse, un dossier…"
              className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Right actions: Notifications & User pill */}
          <div className="flex items-center gap-4">
            {/* Notification bell with indicator */}
            <button
              type="button"
              className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
              aria-label="Notifications"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* User pill */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{fullName}</p>
                <p className="text-[10px] text-slate-500">{primaryRole}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
