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
    to: '/affectations',
    label: 'Affectations',
    description: 'Répartition des dossiers aux équipes compétentes',
    roles: ['RESPONSABLE_AFFECTATION'],
  },
  {
    to: '/referentiels',
    label: 'Référentiels',
    description: 'Types de déchets, équipes et compétences',
    roles: ['GESTIONNAIRE_REFERENTIEL'],
  },
  {
    to: '/verification',
    label: 'Vérification',
    description: 'Contrôle indépendant des comptes rendus',
    roles: ['VERIFICATEUR_CLOTURE'],
  },
  {
    to: '/interventions',
    label: 'Interventions',
    description: 'Missions et comptes rendus de terrain',
    roles: ['AGENT_TERRAIN'],
  },
];
