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
    <div className="space-y-8">
      {canViewCommandCenter ? (
        <OperationalCommandCenter />
      ) : (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <AppIcon name="overview" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Espace de travail</h2>
            <p className="text-xs text-slate-500 mt-1">
              Retrouvez ci-dessous les modules accessibles selon vos habilitations actives.
            </p>
          </div>
        </section>
      )}

      {/* Quick Access to Business Workspaces */}
      <section className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Espaces opérationnels
            </h2>
            <p className="text-xs text-slate-500">
              Accédez aux outils métier selon vos rôles actifs.
            </p>
          </div>
        </div>

        {availableItems.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-700 flex items-center justify-center transition">
                    <AppIcon name={item.icon} size={20} />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition">
                    Ouvrir →
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition">
                    {item.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900">
            Aucun module back-office disponible pour ce profil. Les missions de terrain et les
            signalements sont gérés sur l'application mobile.
          </div>
        )}
      </section>
    </div>
  );
}
