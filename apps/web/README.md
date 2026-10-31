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

## Routes intégrées dans main

| Route | Accès | Fonction |
|---|---|---|
| `/connexion` | Public | Connexion Supabase Auth |
| `/telecharger` | Public | Page de distribution Android |
| `/` | Session active | Vue d'ensemble et espaces autorisés |
| `/administration/comptes` | `ADMINISTRATEUR_COMPTES` | Liste paginée, attribution et révocation des rôles |
| `/qualification` et `/qualification/:idSignalement` | `AGENT_QUALIFICATION` | File, détail, photos signées, compléments et décisions |
| `/dossiers` et `/dossiers/:idDossier` | `RESPONSABLE_TRAITEMENT` | Liste, création, rattachements, priorité et localisation |
| `/referentiels` | `GESTIONNAIRE_REFERENTIEL` | Types de déchets, géographie, équipes et relations temporelles |
| `/affectations` | `RESPONSABLE_AFFECTATION` | Création, suivi, filtres et réaffectation |
| `/activite` | Compte actif | Historique personnel, filtres de type et de dates |

La gestion des comptes consomme les endpoints Accounts. L'écran d'activité consomme `GET /api/v1/audit/me`. Qualification et Cases réutilisent les services métier et leurs contrôles côté API ; les gardes Web ne servent qu'à adapter l'expérience.

## Phase 14 intégrée : Référentiels

La PR #19 a intégré la route protégée `/referentiels`, réservée au rôle `GESTIONNAIRE_REFERENTIEL`. L'écran couvre :

- types de déchets : création, modification des attributs descriptifs et clôture de validité ;
- géographie : création de régions, départements et communes, activation/désactivation sans suppression physique ;
- équipes : création et modification ;
- appartenances : consultation des membres courants, ajout et clôture ;
- compétences : consultation, attribution et clôture ;
- disponibilités : mise à jour et consultation de l'historique ;
- délégations : création, consultation des délégations actives et clôture.

L'ajout d'un membre utilise actuellement son UUID métier, car l'API Referentials ne fournit pas encore de route de recherche des comptes. La validation de l'identifiant, de l'état actif du compte et des périodes reste effectuée côté API. Ces fonctionnalités sont intégrées dans `main` depuis le 31 octobre 2026.

## Phase 16 en cours : espace Agent terrain

La branche `feat/phase-16-web-interventions` ajoute `/interventions`, réservée au rôle `AGENT_TERRAIN`. L'écran ne propose que les équipes courantes du compte connecté. Il permet de répondre aux affectations de ces équipes, démarrer une intervention acceptée, déposer une preuve JPEG/PNG/WebP via multipart et soumettre un compte rendu. Seul l'agent ayant démarré une intervention voit les commandes de preuve et de soumission ; l'API revérifie l'auteur et l'appartenance à chaque mutation. Une reprise n'est proposée qu'après une décision de vérification `REPRISE`. Ces changements sont en cours et pas encore intégrés dans `main`.

Le client HTTP commun laisse le navigateur générer le `Content-Type` multipart et sa frontière lorsqu'un corps `FormData` est transmis.

## Organisation

- `src/app` : contexte d'authentification, navigation, shell et gardes de routes.
- `src/features/accounts` : administration des comptes et rôles.
- `src/features/audit` : historique d'activité.
- `src/features/dashboard` : vue d'ensemble.
- `src/features/qualification` : file et décisions de qualification.
- `src/features/cases` : liste et gestion des dossiers.
- `src/features/referentials` : administration des références, de la géographie et des équipes (Phase 14 intégrée).
- `src/features/assignments` : création, suivi et réaffectation des affectations (Phase 15 intégrée).
- `src/features/interventions` : espace Agent terrain, preuves privées et comptes rendus (branche Phase 16).
- `src/lib` : client API et configuration Supabase.
- `src/pages` : connexion, téléchargement et page d'accès refusé.

## Limites restantes

Les affectations sont intégrées. L'espace Agent terrain est en cours dans la Phase 16 ; l'interface de vérification reste à développer. Le Web ne téléverse pas encore les photos de signalement. L'ajout des preuves photo d'intervention est en cours dans la Phase 16 via le bucket privé ; les contrôles d'auteur et d'appartenance restent côté API. La recherche multi-critères de comptes, les détails d'événements et l'historique des rôles par compte ne sont pas encore exposés dans l'interface.