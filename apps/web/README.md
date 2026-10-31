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
| `/interventions` | `AGENT_TERRAIN` | Équipes du compte, réponses aux missions, démarrage, preuves et comptes rendus |
| `/verification` | `VERIFICATEUR_CLOTURE` | File des soumissions, preuves signées, validation ou demande de reprise |
| `/activite` | Compte actif | Historique personnel, filtres de type et de dates |

La gestion des comptes consomme les endpoints Accounts. L'écran d'activité consomme `GET /api/v1/audit/me`. Qualification et Cases réutilisent les services métier et leurs contrôles côté API ; les gardes Web ne servent qu'à adapter l'expérience. Les parcours métier Web des phases 12 à 17 sont intégrés dans `main` (PR #17 à #22).

## Administration des référentiels — Phase 14

La PR #19 a intégré la route protégée `/referentiels`, réservée au rôle `GESTIONNAIRE_REFERENTIEL`. L'écran couvre :

- types de déchets : création, modification des attributs descriptifs et clôture de validité ;
- géographie : création de régions, départements et communes, activation/désactivation sans suppression physique ;
- équipes : création et modification ;
- appartenances : consultation des membres courants, ajout et clôture ;
- compétences : consultation, attribution et clôture ;
- disponibilités : mise à jour et consultation de l'historique ;
- délégations : création, consultation des délégations actives et clôture.

L'ajout d'un membre utilise actuellement son UUID métier, car l'API Referentials ne fournit pas encore de route de recherche des comptes. La validation de l'identifiant, de l'état actif du compte et des périodes reste effectuée côté API.

## Affectations — Phase 15

La PR #20 a intégré `/affectations`, réservé au rôle `RESPONSABLE_AFFECTATION`. L'espace présente les contenus en attente et les équipes éligibles, puis permet la création, le suivi filtrable et la réaffectation motivée. Les listes de découverte ne constituent ni une réservation ni une autorisation durable : l'API revalide les règles métier dans la transaction de mutation.

## Espace Agent terrain — Phase 16

La PR #21 a intégré `/interventions`, réservée au rôle `AGENT_TERRAIN`. L'écran ne propose que les équipes courantes du compte connecté. Il permet de répondre aux affectations de ces équipes, démarrer une intervention acceptée, déposer une preuve JPEG/PNG/WebP via multipart et soumettre un compte rendu. Seul l'agent ayant démarré une intervention voit les commandes de preuve et de soumission ; l'API revérifie l'auteur et l'appartenance à chaque mutation. Une reprise n'est proposée qu'après une décision de vérification `REPRISE`.

Le client HTTP commun laisse le navigateur générer le `Content-Type` multipart et sa frontière lorsqu'un corps `FormData` est transmis.

## Vérification indépendante — Phase 17

La PR #22 a intégré `/verification`, réservée au rôle `VERIFICATEUR_CLOTURE`. L'espace présente une file paginée des derniers comptes rendus soumis, permet d'examiner le compte rendu et les éléments du dossier, puis de consulter les photos privées au moyen d'URLs signées générées à la demande (60 secondes). Le vérificateur peut enregistrer une décision conforme ou demander une reprise motivée.

L'interface masque les commandes de décision et de consultation des preuves lorsque le vérificateur est l'auteur de l'intervention. L'API vérifie indépendamment la séparation des tâches, la fraîcheur de la soumission et l'état du dossier.

## Organisation réelle du code

- `src/app` : contexte d'authentification, navigation, shell et gardes de routes.
- `src/features/accounts` : administration des comptes et rôles.
- `src/features/audit` : historique d'activité.
- `src/features/dashboard` : vue d'ensemble.
- `src/features/qualification` : file et décisions de qualification.
- `src/features/cases` : liste et gestion des dossiers.
- `src/features/referentials` : administration des références, de la géographie et des équipes.
- `src/features/assignments` : création, suivi et réaffectation des affectations.
- `src/features/interventions` : espace Agent terrain, preuves privées et comptes rendus.
- `src/features/verification` : file et décisions de vérification indépendante.
- `src/lib` : client API et configuration Supabase.
- `src/pages` : connexion, téléchargement et page d'accès refusé.

## Limites restantes

Les principaux parcours métier Web sont intégrés. La consultation des photos de qualification et l'upload des preuves d'intervention sont couverts par les parcours concernés. Le dépôt de photos de signalement depuis le back-office citoyen n'est pas un parcours Web livré : le dépôt citoyen est porté par l'application Mobile. La recherche multi-critères de comptes, les détails d'événements et l'historique des rôles par compte ne sont pas encore exposés dans l'interface. La recette utilisateur, l'accessibilité et la couverture média des écrans secondaires restent à compléter.
