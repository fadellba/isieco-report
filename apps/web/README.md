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
| `/` | Session active | Centre de commandement cartographique pour les rôles back-office autorisés, puis espaces de travail disponibles |
| `/administration/comptes` | `ADMINISTRATEUR_COMPTES` | Liste paginée, attribution et révocation des rôles |
| `/qualification` et `/qualification/:idSignalement` | `AGENT_QUALIFICATION` | File, détail, photos signées, compléments et décisions |
| `/dossiers` et `/dossiers/:idDossier` | `RESPONSABLE_TRAITEMENT` | Liste, création, rattachements, priorité et localisation |
| `/referentiels` | `GESTIONNAIRE_REFERENTIEL` | Types de déchets, équipes, appartenances et compétences |
| `/affectations` | `RESPONSABLE_AFFECTATION` | Création, suivi, filtres et réaffectation |
| `/interventions` | `AGENT_TERRAIN` | Équipes du compte, réponses aux missions, démarrage, preuves et comptes rendus |
| `/verification` | `VERIFICATEUR_CLOTURE` | File des soumissions, preuves signées, validation ou demande de reprise |
| `/acces-refuse` | Session active | Page de refus d'accès |

La gestion des comptes consomme les endpoints Accounts. Il n'existe pas d'écran d'activité personnel ni de route `GET /api/v1/audit/me`. L'API expose uniquement la chronologie métier ciblée d'un dossier via `GET /api/v1/cases/:idDossier/history`, réservée à `RESPONSABLE_TRAITEMENT`. Qualification et Cases réutilisent les services métier et leurs contrôles côté API ; les gardes Web ne servent qu'à adapter l'expérience. Les parcours métier Web principaux sont intégrés dans `main`.

## Administration des référentiels — Phase 14

La PR #19 a intégré la route protégée `/referentiels`, réservée au rôle `GESTIONNAIRE_REFERENTIEL`. L'écran couvre les éléments du modèle simplifié :

- types de déchets : création et activation/désactivation ;
- équipes : création et activation/désactivation ;
- appartenances : consultation des membres courants, ajout et clôture ;
- compétences : consultation, attribution et désactivation.

Les régions, départements, communes, calendriers d'indisponibilité et délégations ne font pas partie du modèle ni des routes actuelles.

L'ajout d'un membre utilise actuellement son UUID métier, car l'API Referentials ne fournit pas encore de route de recherche des comptes. La validation de l'identifiant, de l'état actif du compte et des périodes reste effectuée côté API.

## Affectations — Phase 15

La PR #20 a intégré `/affectations`, réservé au rôle `RESPONSABLE_AFFECTATION`. L'espace présente les contenus en attente et les équipes éligibles, puis permet la création, le suivi filtrable et la réaffectation motivée. Les listes de découverte ne constituent ni une réservation ni une autorisation durable : l'API revalide les règles métier dans la transaction de mutation.

## Espace Agent terrain — Phase 16

La PR #21 a intégré `/interventions`, réservée au rôle `AGENT_TERRAIN`. L'écran ne propose que les équipes courantes du compte connecté. Il permet de répondre aux affectations de ces équipes, démarrer une intervention acceptée, déposer une preuve JPEG/PNG/WebP via multipart et soumettre un compte rendu. Seul l'agent ayant démarré une intervention voit les commandes de preuve et de soumission ; l'API revérifie l'auteur et l'appartenance à chaque mutation. Une reprise n'est proposée qu'après une décision de vérification `REPRISE`.

Le client HTTP commun laisse le navigateur générer le `Content-Type` multipart et sa frontière lorsqu'un corps `FormData` est transmis.

## Vérification indépendante — Phase 17

La PR #22 a intégré `/verification`, réservée au rôle `VERIFICATEUR_CLOTURE`. L'espace présente une file paginée des derniers comptes rendus soumis, permet d'examiner le compte rendu et les éléments du dossier, puis de consulter les photos privées au moyen d'URLs signées générées à la demande (60 secondes). Le vérificateur peut enregistrer une décision conforme ou demander une reprise motivée.

L'interface masque les commandes de décision et de consultation des preuves lorsque le vérificateur est l'auteur de l'intervention. L'API vérifie indépendamment la séparation des tâches, la fraîcheur de la soumission et l'état du dossier.

## Centre de commandement cartographique

La page d'accueil affiche, pour les rôles back-office autorisés, un tableau de bord agrégé alimenté par `GET /api/v1/command-center/overview` :

- compteurs de signalements à qualifier ou en attente du citoyen, dossiers ouverts et prioritaires, affectations/interventions actives et vérifications à traiter ;
- carte interactive avec dossiers ouverts et signalements actifs non rattachés disposant de coordonnées enregistrées ;
- sélection d'un marqueur pour consulter son statut, sa priorité, son libellé de localisation, ses équipes actives et ses catégories ;
- nombre d'objets sans coordonnées et indication claire lorsque la réponse est tronquée ;
- actualisation manuelle et rafraîchissement périodique toutes les 60 secondes lorsque l'onglet est visible.

Les données cartographiques ne contiennent pas de nom, d'adresse électronique ou de téléphone de citoyen, et n'exposent pas les identités d'agents ni le journal d'audit brut. Les objets sans coordonnées sont comptés, mais ne sont jamais positionnés par approximation. Le panneau n'affiche aucune position GPS d'équipe : aucune télémétrie temps réel n'est encore modélisée.

### Fournisseur de fond cartographique

Le rendu utilise des tuiles raster XYZ chargées uniquement pour la zone visible. La configuration navigateur accepte :

- `VITE_MAP_TILE_URL` : modèle URL avec les placeholders `{z}`, `{x}`, `{y}` ;
- `VITE_MAP_ATTRIBUTION` : attribution textuelle visible dans le coin de la carte.

Sans configuration, le mode de développement utilise `https://tile.openstreetmap.org/{z}/{x}/{y}.png` et affiche l'attribution OpenStreetMap ainsi que le lien de signalement d'erreur. Le client respecte le cache normal du navigateur et ne précharge pas de zones hors écran. Consulter la [politique officielle d'utilisation des tuiles OSM](https://operations.osmfoundation.org/policies/tiles/) avant d'exploiter ce fournisseur : son service est best-effort, sans SLA, avec des règles d'attribution, de cache, d'identification et d'usage. Pour un trafic de production important, configurer un fournisseur adapté ou un hébergement de tuiles maîtrisé, et définir son attribution exacte dans `VITE_MAP_ATTRIBUTION`.

## Organisation réelle du code

- `src/app` : contexte d'authentification, navigation, shell et gardes de routes.
- `src/features/accounts` : administration des comptes et rôles.
- `src/features/dashboard` : vue d'ensemble, centre de commandement et carte interactive.
- `src/features/qualification` : file et décisions de qualification.
- `src/features/cases` : liste et gestion des dossiers.
- `src/features/referentials` : types de déchets, équipes, appartenances et compétences.
- `src/features/assignments` : création, suivi et réaffectation des affectations.
- `src/features/interventions` : espace Agent terrain, preuves privées et comptes rendus.
- `src/features/verification` : file et décisions de vérification indépendante.
- `src/lib` : client API et configuration Supabase.
- `src/pages` : connexion, téléchargement et page d'accès refusé.

## Limites restantes

Les principaux parcours métier Web sont intégrés. Le centre de commandement affiche les entités géolocalisées connues et actualise les compteurs périodiquement. Les positions GPS temps réel, les notifications d'événements et les données de couverture territoriale restent à réaliser. La consultation des photos de qualification et l'upload des preuves d'intervention sont couverts par les parcours concernés. Le dépôt de photos de signalement depuis le back-office citoyen n'est pas un parcours Web livré : le dépôt citoyen est porté par l'application Mobile. Il n'existe pas d'écran d'audit personnel, de liste globale d'événements, de détail d'événement ni d'historique des rôles par compte. La recherche multi-critères de comptes n'est pas non plus exposée dans l'interface. La recette utilisateur, l'accessibilité et la couverture média des écrans secondaires restent à compléter.
