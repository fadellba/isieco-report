import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth-context';
import { navigationItems } from '../../app/navigation';
import { AppIcon } from '../../components/AppIcon';

export function DashboardPage() {
  const { profile } = useAuth();
  const roles = profile?.roles ?? [];
  const availableItems = navigationItems.filter((item) =>
    item.roles.some((role) => roles.some((active) => active.code === role)),
  );

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">ESPACE DE SUPERVISION</p>
          <h1 className="dashboard-title">
            Bonjour{profile?.prenom ? ` ${profile.prenom}` : ''}.
          </h1>
          <p className="dashboard-lede">
            Retrouvez vos espaces de travail et accédez directement aux opérations qui relèvent de vos habilitations.
            ISIECO centralise le suivi des signalements, des équipes et des interventions sur le territoire.
          </p>
        </div>
        <span className="dashboard-state">Compte {profile?.etatCompte?.toLowerCase()}</span>
      </section>

      <section className="dashboard-summary-grid" aria-label="Résumé du compte">
        <article className="dashboard-summary-card">
          <p className="dashboard-summary-card__label">Espaces métier actifs</p>
          <p className="dashboard-summary-card__value">{availableItems.length}</p>
          <p className="dashboard-summary-card__hint">Accès disponibles selon vos rôles actuels</p>
        </article>
        <article className="dashboard-summary-card">
          <p className="dashboard-summary-card__label">Habilitations</p>
          <p className="dashboard-summary-card__value">{roles.length}</p>
          <p className="dashboard-summary-card__hint">Les droits sont contrôlés côté API</p>
        </article>
        <article className="dashboard-summary-card">
          <p className="dashboard-summary-card__label">Profil</p>
          <p className="dashboard-summary-card__value dashboard-summary-card__value--profile">Actif</p>
          <p className="dashboard-summary-card__hint">{profile?.email}</p>
        </article>
      </section>

      <section className="dashboard-map-card" aria-label="Carte opérationnelle">
        <div className="dashboard-map-visual">
          <span className="dashboard-map-label">VUE CARTOGRAPHIQUE ISIECO</span>
        </div>
        <div className="dashboard-map-copy">
          <p className="dashboard-eyebrow">SUPERVISION GÉOGRAPHIQUE</p>
          <h2>La carte opérationnelle est la prochaine évolution.</h2>
          <p>
            Elle réunira les signalements, les dossiers, les affectations et les interventions.
            Son intégration dépend de la mise à disposition des données géographiques et des filtres côté API.
            Aucun point fictif n’est affiché ici.
          </p>
        </div>
      </section>

      <section>
        <div className="dashboard-section-heading">
          <div>
            <h2>Vos espaces de travail</h2>
            <p>Seuls les modules autorisés pour votre compte sont proposés.</p>
          </div>
        </div>
        {availableItems.length ? (
          <div className="dashboard-access-grid" style={{ marginTop: 16 }}>
            {availableItems.map((item) => (
              <Link key={item.to} to={item.to} className="dashboard-access-card">
                <div className="dashboard-access-card__top">
                  <AppIcon name={item.icon} size={21} />
                  <AppIcon name="arrow" size={17} />
                </div>
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Aucun espace de back-office n'est associé à ce compte. Les parcours citoyen et agent sont disponibles dans l'application mobile selon vos habilitations.
          </div>
        )}
      </section>
    </div>
  );
}
