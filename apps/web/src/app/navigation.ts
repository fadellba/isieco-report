import type { FunctionalRole } from '@isieco/shared';

export interface NavigationItem {
  to: string;
  label: string;
  description: string;
  roles: FunctionalRole[];
}

export const navigationItems: NavigationItem[] = [
  {
    to: '/administration/comptes',
    label: 'Comptes',
    description: 'Profils et habilitations',
    roles: ['ADMINISTRATEUR_COMPTES'],
  },
  {
    to: '/activite',
    label: 'Mon activité',
    description: 'Événements métier liés à mon compte',
    roles: [
      'CITOYEN',
      'AGENT_QUALIFICATION',
      'RESPONSABLE_TRAITEMENT',
      'RESPONSABLE_AFFECTATION',
      'AGENT_TERRAIN',
      'VERIFICATEUR_CLOTURE',
      'GESTIONNAIRE_REFERENTIEL',
      'ADMINISTRATEUR_COMPTES',
    ],
  },
];
