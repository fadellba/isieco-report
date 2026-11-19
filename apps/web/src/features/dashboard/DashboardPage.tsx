import { useAuth } from '../../app/auth-context';
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
  const canViewCommandCenter = (profile?.roles ?? []).some((role) =>
    COMMAND_CENTER_ROLES.includes(role.code),
  );

  if (!canViewCommandCenter) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-base font-bold text-slate-900">Espace de travail</h1>
        <p className="mt-1 text-xs text-slate-500">
          Aucun tableau de bord opérationnel n’est associé aux habilitations actives de ce compte.
        </p>
      </section>
    );
  }

  return <OperationalCommandCenter />;
}
