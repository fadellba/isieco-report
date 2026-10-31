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
    to: '/qualification',
    label: 'Qualification',
    description: 'Examen et décision sur les signalements',
    roles: ['AGENT_QUALIFICATION'],
  },
  {
    to: '/dossiers',
    label: 'Dossiers',
    description: 'Constitution et pilotage des dossiers',
    roles: ['RESPONSABLE_TRAITEMENT'],
  },
  {
    to: '/referentiels',
    label: 'Référentiels',
    description: 'Types de déchets, géographie et équipes',
    roles: ['GESTIONNAIRE_REFERENTIEL'],
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
