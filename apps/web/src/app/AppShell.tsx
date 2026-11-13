import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { navigationItems, type NavigationGroup } from './navigation';
import { AppIcon } from '../components/AppIcon';

const groups: NavigationGroup[] = ['Opérations', 'Administration'];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const activeRoles = profile?.roles ?? [];
  const links = navigationItems.filter((item) =>
    item.roles.some((role) => activeRoles.some((active) => active.code === role)),
  );
  const initials = [profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'IS';

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      navigate('/connexion', { replace: true });
    }
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="app-brand" aria-label="ISIECO, accueil du back office">
          <span className="app-brand__mark">IE</span>
          <span className="app-brand__copy">
            <strong>ISIECO</strong>
            <small>PROPRETÉ URBAINE</small>
          </span>
        </Link>

        <div className="app-sidebar__context">
          <span className="app-sidebar__context-dot" />
          <span>Centre opérationnel</span>
        </div>

        <nav className="app-sidebar__nav" aria-label="Navigation principale">
          <p className="app-nav-caption">ESPACE DE TRAVAIL</p>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
          >
            <span className="app-nav-link__icon"><AppIcon name="overview" /></span>
            <span>Vue d’ensemble</span>
          </NavLink>

          {groups.map((group) => {
            const groupedLinks = links.filter((item) => item.group === group);
            if (!groupedLinks.length) return null;
            return (
              <div className="app-nav-group" key={group}>
                <p className="app-nav-caption">{group.toUpperCase()}</p>
                {groupedLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
                    title={item.description}
                  >
                    <span className="app-nav-link__icon"><AppIcon name={item.icon} /></span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-user-card">
            <span className="app-user-avatar">{initials}</span>
            <span className="app-user-card__identity">
              <strong>{profile?.prenom ? `${profile.prenom} ${profile.nom}` : profile?.nom}</strong>
              <small>{profile?.email}</small>
            </span>
          </div>
          <button type="button" onClick={() => void handleSignOut()} className="app-signout">
            <AppIcon name="logout" size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__titles">
            <span className="app-topbar__eyebrow">ISIECO / GESTION DES OPÉRATIONS</span>
            <strong>Plateforme de propreté urbaine</strong>
          </div>
          <div className="app-topbar__account">
            <span className="app-role-count">{activeRoles.length} habilitation{activeRoles.length > 1 ? 's' : ''}</span>
            <span className="app-user-avatar app-user-avatar--small">{initials}</span>
          </div>
        </header>

        <nav className="app-mobile-nav" aria-label="Navigation des espaces">
          <NavLink to="/" end className={({ isActive }) => `app-mobile-nav__link ${isActive ? 'is-active' : ''}`}>
            <AppIcon name="overview" size={16} />
            <span>Vue d’ensemble</span>
          </NavLink>
          {links.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `app-mobile-nav__link ${isActive ? 'is-active' : ''}`}>
              <AppIcon name={item.icon} size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
