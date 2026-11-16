import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth-context';
import { navigationItems } from '../../app/navigation';
import { AppIcon } from '../../components/AppIcon';
import { OperationalCommandCenter } from './OperationalCommandCenter';

const COMMAND_CENTER_ROLES = [
  'AGENT_QUALIFICATION',
  'RESPONSABLE_TRAITEMENT',
  'RESPONSABLE_AFFECTATION',
  'VERIFICATEUR_CLOTURE',
  'GESTIONNAIRE_REFERENTIEL',
  'ADMINISTRATEUR_COMPTES',
];

export function DashboardPage() {
  const { profile } = useAuth();
  const roles = profile?.roles ?? [];
  const availableItems = navigationItems.filter((item) =>
    item.roles.some((role) => roles.some((active) => active.code === role)),
  );
  const canViewCommandCenter = roles.some((role) => COMMAND_CENTER_ROLES.includes(role.code));
  const displayName = [profile?.prenom, profile?.nom].filter(Boolean).join(' ');

  return (
    <div className="dashboard-page dashboard-page--reference">
      <section className="dashboard-cover">
        <div className="dashboard-cover__copy">
          <p className="dashboard-eyebrow">ISIECO · CENTRE OPÉRATIONNEL</p>
          <h1>Ensemble pour une ville plus propre.</h1>
          <p>Coordonnez les signalements, les équipes et les interventions sur le territoire.</p>
        </div>
        <div className="dashboard-cover__meta">
          <span className="dashboard-cover__live"><i /> Supervision opérationnelle</span>
          {displayName ? (
            <div className="dashboard-cover__user">
              <span>{[profile?.prenom?.[0], profile?.nom?.[0]].filter(Boolean).join('').toUpperCase()}</span>
              <div><strong>{displayName}</strong><small>{roles.length} habilitation{roles.length > 1 ? 's' : ''}</small></div>
            </div>
          ) : null}
        </div>
      </section>

      {canViewCommandCenter ? (
        <OperationalCommandCenter />
      ) : (
        <section className="dashboard-restricted-note">
          <span className="dashboard-restricted-note__icon"><AppIcon name="overview" size={18} /></span>
          <div>
            <strong>Vos espaces de travail</strong>
            <p>Le centre de commandement est réservé aux habilitations de supervision. Vos accès métier restent disponibles ci-dessous.</p>
          </div>
        </section>
      )}

      {!canViewCommandCenter ? (
        <section className="dashboard-workspaces">
          <div className="dashboard-section-heading">
            <div><h2>Vos espaces de travail</h2><p>Seuls les modules autorisés pour votre compte sont proposés.</p></div>
          </div>
          {availableItems.length ? (
            <div className="dashboard-access-grid" style={{ marginTop: 16 }}>
              {availableItems.map((item) => (
                <Link key={item.to} to={item.to} className="dashboard-access-card">
                  <div className="dashboard-access-card__top"><AppIcon name={item.icon} size={21} /><AppIcon name="arrow" size={17} /></div>
                  <div><h3>{item.label}</h3><p>{item.description}</p></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard-no-workspace">
              Aucun espace de back-office n'est associé à ce compte. Les parcours citoyen et agent sont disponibles dans l'application mobile selon vos habilitations.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
