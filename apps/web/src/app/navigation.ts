import type { FunctionalRole } from '@isieco/shared';
import type { AppIconName } from '../components/AppIcon';

export type NavigationGroup = 'Opérations' | 'Administration';

export interface NavigationItem {
  to: string;
  label: string;
  description: string;
  group: NavigationGroup;
  icon: AppIconName;
  roles: FunctionalRole[];
}

export const navigationItems: NavigationItem[] = [
  {
    to: '/qualification',
    label: 'Qualification',
    description: 'Examiner les signalements reçus',
    group: 'Opérations',
    icon: 'qualification',
    roles: ['AGENT_QUALIFICATION'],
  },
  {
    to: '/dossiers',
    label: 'Dossiers',
    description: 'Constituer et piloter les dossiers',
    group: 'Opérations',
    icon: 'cases',
    roles: ['RESPONSABLE_TRAITEMENT'],
  },
  {
    to: '/affectations',
    label: 'Affectations',
    description: 'Mobiliser les équipes compétentes',
    group: 'Opérations',
    icon: 'assignments',
    roles: ['RESPONSABLE_AFFECTATION'],
  },
  {
    to: '/interventions',
    label: 'Interventions',
    description: 'Consulter les missions de terrain',
    group: 'Opérations',
    icon: 'teams',
    roles: ['AGENT_TERRAIN'],
  },
  {
    to: '/verification',
    label: 'Vérification',
    description: 'Contrôler les comptes rendus',
    group: 'Opérations',
    icon: 'verification',
    roles: ['VERIFICATEUR_CLOTURE'],
  },
  {
    to: '/referentiels',
    label: 'Référentiels',
    description: 'Gérer les équipes et types de déchets',
    group: 'Administration',
    icon: 'settings',
    roles: ['GESTIONNAIRE_REFERENTIEL'],
  },
  {
    to: '/administration/comptes',
    label: 'Comptes',
    description: 'Gérer les profils et habilitations',
    group: 'Administration',
    icon: 'accounts',
    roles: ['ADMINISTRATEUR_COMPTES'],
  },
];
