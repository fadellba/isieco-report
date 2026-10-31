# Application Web ISI-Eco Report

Back-office React 19 + Vite 8 pour les équipes d'administration et d'exploitation, avec la page publique `/telecharger`.

## Démarrage

Depuis la racine du monorepo :

```bash
pnpm dev:web
```

L'application utilise `VITE_API_BASE_URL`, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Seule la clé publique Supabase est autorisée dans le navigateur. Aucun secret serveur ou accès PostgreSQL n'est exposé aux bundles client.

## Authentification et accès

`AuthProvider` suit la session Supabase, charge le profil métier depuis `GET /api/v1/accounts/me` et expose le client API commun. Les gardes de routes et la navigation utilisent les rôles actifs renvoyés par l'API pour l'expérience utilisateur.

**Ces gardes client ne constituent pas la frontière de sécurité.** Chaque endpoint NestJS refait les contrôles d'authentification, d'état du compte, de rôle et de propriété côté serveur.

## Routes présentes dans main

| Route | Accès | Fonction |
|---|---|---|
| `/connexion` | Public | Connexion Supabase Auth |
| `/telecharger` | Public | Page de distribution Android |
| `/` | Session active | Vue d'ensemble et espaces autorisés |
| `/administration/comptes` | `ADMINISTRATEUR_COMPTES` | Liste paginée, attribution et révocation des rôles |
| `/qualification` et `/qualification/:idSignalement` | `AGENT_QUALIFICATION` | File, détail, photos signées, compléments et décisions |
| `/dossiers` et `/dossiers/:idDossier` | `RESPONSABLE_TRAITEMENT` | Liste, création, rattachements, priorité et localisation |
| `/activite` | Compte actif | Historique personnel, filtres de type et de dates |

La gestion des comptes consomme les endpoints Accounts. L'écran d'activité consomme `GET /api/v1/audit/me`. Qualification et Cases réutilisent les services métier et leurs contrôles côté API ; les gardes Web ne servent qu'à adapter l'expérience.

## Organisation

- `src/app` : contexte d'authentification, navigation, shell et gardes de routes.
- `src/features/accounts` : administration des comptes et rôles.
- `src/features/audit` : historique d'activité.
- `src/features/dashboard` : vue d'ensemble.
- `src/features/qualification` : file et décisions de qualification.
- `src/features/cases` : liste et gestion des dossiers.
- `src/lib` : client API et configuration Supabase.
- `src/pages` : connexion, téléchargement et page d'accès refusé.

## Limites restantes

Les écrans d'administration des référentiels, d'affectation, d'intervention et de vérification restent à développer. Le Web ne téléverse pas encore les photos de signalement ni les preuves d'intervention ; les interfaces API et l'infrastructure Storage privée sont disponibles. La recherche multi-critères de comptes, les détails d'événements et l'historique des rôles par compte ne sont pas encore exposés dans l'interface.