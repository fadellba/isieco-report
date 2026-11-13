# Documentation API

## Source de vérité

Le contrat OpenAPI est généré depuis les contrôleurs NestJS, DTO et décorateurs Swagger. Les routes ci-dessous sont un index de navigation ; les annotations de code et le JSON généré restent la référence contractuelle.

Lorsque l'API tourne en local :

- Swagger UI : `http://localhost:3000/docs`
- OpenAPI JSON : `http://localhost:3000/docs-json`
- Préfixe : `http://localhost:3000/api/v1`
- Génération : `pnpm api:openapi` (écrit `docs/api/openapi.json`).

Ne jamais publier de secret, chemin privé Storage, jeton ou donnée réelle dans Swagger ou les exemples.

## Authentification et habilitations

Supabase Auth gère les identités et les sessions. Les routes protégées reçoivent `Authorization: Bearer <access-token>`. NestJS valide le jeton, résout le compte métier et applique les rôles et règles métier. Le client ne transmet jamais un rôle faisant autorité.

| Rôle | Responsabilité principale |
|---|---|
| `CITOYEN` | Créer et consulter ses signalements, photos et demandes de complément. |
| `AGENT_QUALIFICATION` | Qualifier les signalements, demander un complément ou décider. |
| `RESPONSABLE_TRAITEMENT` | Constituer et piloter les dossiers de traitement. |
| `GESTIONNAIRE_REFERENTIEL` | Gérer les types de déchets, les équipes, les appartenances et les compétences. |
| `RESPONSABLE_AFFECTATION` | Affecter les contenus de dossier aux équipes et réaffecter une mission éligible. |
| `AGENT_TERRAIN` | Consulter ses équipes, répondre aux affectations et réaliser les interventions. |
| `VERIFICATEUR_CLOTURE` | Vérifier indépendamment les comptes rendus et demander une reprise ou valider. |
| `ADMINISTRATEUR_COMPTES` | Administrer les comptes et leurs attributions de rôles. |

Le rôle est requis en plus des contrôles contextuels : propriété du signalement, appartenance active à une équipe, auteur de l'intervention, état courant et séparation des tâches. Une garde de route ne remplace pas la validation métier dans le service.

## Inventaire des routes implémentées

Les routes utilisent le préfixe commun `/api/v1`. Les paramètres UUID doivent être valides. Les détails des DTO, contraintes de pagination, codes de réponse et erreurs sont générés par Swagger.

### Comptes — `accounts`

| Méthode | Route | Accès |
|---|---|---|
| GET | `/accounts/me` | Compte authentifié ; crée ou récupère le profil métier. |
| PATCH | `/accounts/me` | Compte authentifié ; modifie son profil. |
| GET | `/accounts` | `ADMINISTRATEUR_COMPTES` ; liste paginée. |
| POST | `/accounts/:utilisateurId/roles` | `ADMINISTRATEUR_COMPTES` ; attribue un rôle. |
| DELETE | `/accounts/:utilisateurId/roles/:codeRole` | `ADMINISTRATEUR_COMPTES` ; révoque un rôle. |

### Référentiels — `referentials`

| Méthode | Route | Accès |
|---|---|---|
| GET | `/referentials/waste-types` | `GESTIONNAIRE_REFERENTIEL` ; option `includeInactive`. |
| POST | `/referentials/waste-types` | `GESTIONNAIRE_REFERENTIEL` ; crée un type de déchet. |
| PATCH | `/referentials/waste-types/:id` | `GESTIONNAIRE_REFERENTIEL` ; modifie les champs et l'état actif. |
| GET | `/referentials/teams` | `GESTIONNAIRE_REFERENTIEL` ; équipes, membres et compétences. |
| POST | `/referentials/teams` | `GESTIONNAIRE_REFERENTIEL` ; crée une équipe. |
| PATCH | `/referentials/teams/:teamId` | `GESTIONNAIRE_REFERENTIEL` ; modifie une équipe. |
| POST | `/referentials/teams/:teamId/memberships` | `GESTIONNAIRE_REFERENTIEL` ; ajoute un membre. |
| POST | `/referentials/teams/:teamId/memberships/close` | `GESTIONNAIRE_REFERENTIEL` ; termine une appartenance. |
| POST | `/referentials/teams/:teamId/skills` | `GESTIONNAIRE_REFERENTIEL` ; ajoute une compétence. |
| POST | `/referentials/teams/:teamId/skills/close` | `GESTIONNAIRE_REFERENTIEL` ; désactive une compétence. |

Le modèle simplifié ne comporte plus de référentiels région/département/commune, de délégation ni de périodes d'indisponibilité d'équipe. La documentation et les clients ne doivent pas supposer ces endpoints.

### Signalements citoyens — `reports`

| Méthode | Route | Accès |
|---|---|---|
| POST | `/reports` | `CITOYEN` ; dépôt JSON idempotent avec l'en-tête `Idempotency-Key`. |
| POST | `/reports/with-photo` | `CITOYEN` ; dépôt photo-first multipart avec photo obligatoire et métadonnées facultatives. |
| GET | `/reports/waste-types` | `CITOYEN` ; types de déchets actifs pour la déclaration. |
| GET | `/reports` | `CITOYEN` ; liste paginée appartenant au compte connecté. |
| GET | `/reports/:id` | `CITOYEN` propriétaire ; détail du signalement. |
| GET | `/reports/:id/history` | `CITOYEN` propriétaire ; chronologie filtrée des statuts et jalons opérationnels. |
| POST | `/reports/:id/photos` | `CITOYEN` propriétaire ; upload de photo privée. |
| GET | `/reports/:id/photos/:photoId/url` | `CITOYEN` propriétaire ; URL signée temporaire. |
| GET | `/reports/:id/supplements` | `CITOYEN` propriétaire ; demandes de complément. |
| POST | `/reports/:id/supplements/:demandeId/responses` | `CITOYEN` propriétaire ; réponse unique à une demande ouverte. |

Le dépôt JSON exige au moins un élément de contexte (description, catégorie ou localisation). La variante `/reports/with-photo` exige une image privée et rend la description et les catégories facultatives ; la création du signalement et l'ajout de sa première photo sont atomiques côté base, avec compensation Storage en cas d'échec. Une même clé idempotente, un même corps et le même contenu image retournent le dépôt initial ; la réutilisation de la clé avec un contenu différent est un conflit. La chronologie citoyenne expose uniquement les transitions d'état et les principaux jalons opérationnels du dossier associé, sans identifiants d'agents, raisons internes ou métadonnées d'audit.

### Qualification — `qualification`

| Méthode | Route | Accès |
|---|---|---|
| GET | `/qualification/queue` | `AGENT_QUALIFICATION` ; file paginée. |
| GET | `/qualification/:idSignalement` | `AGENT_QUALIFICATION` ; détail d'un signalement dans la file. |
| GET | `/qualification/:idSignalement/photos/:idPhotoSignalement/url` | `AGENT_QUALIFICATION` ; URL signée d'une photo éligible. |
| POST | `/qualification/:idSignalement/supplements` | `AGENT_QUALIFICATION` ; demande un complément au citoyen. |
| POST | `/qualification/:idSignalement/accept` | `AGENT_QUALIFICATION` ; accepte et enregistre les catégories retenues. |
| POST | `/qualification/:idSignalement/reject` | `AGENT_QUALIFICATION` ; rejette avec motif obligatoire. |

### Dossiers — `cases`

Toutes les routes ci-dessous exigent `RESPONSABLE_TRAITEMENT`.

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/cases/qualified-reports` | Liste les signalements qualifiés sans dossier. |
| GET | `/cases` | Liste paginée des dossiers, avec filtre de statut. |
| GET | `/cases/:idDossier` | Détail du dossier, de ses contenus et signalements. |
| GET | `/cases/:idDossier/history` | Chronologie des événements métier associés au dossier dans le journal d'audit : transitions de signalement, opérations sur le dossier et événements opérationnels couverts. |
| POST | `/cases/from-reports/:idSignalement` | Crée un dossier et le relie directement au signalement qualifié. |
| PATCH | `/cases/:idDossier/priority` | Modifie la priorité d'un dossier non clôturé. |
| PATCH | `/cases/:idDossier/location` | Modifie sa localisation. |
| POST | `/cases/:idDossier/reports/:idSignalement/attach` | Lie un signalement qualifié à un dossier existant. |
| POST | `/cases/:idDossier/reports/:idSignalement/detach` | Supprime ce lien direct. |

L'association courante est matérialisée par `signalement.id_dossier`. Aucun historique dédié de rattachement n'existe parmi les 18 modèles métier ; le motif fourni au rattachement/détachement est conservé comme `reason` dans l'événement du journal `audit.evenement_metier`, consultable via la chronologie du dossier.

### Affectations — `assignments`

| Méthode | Route | Accès |
|---|---|---|
| GET | `/assignments/pending-contents` | `RESPONSABLE_AFFECTATION` ; contenus disponibles, filtrables par dossier (`idDossier`). |
| GET | `/assignments/eligible-teams/:idTypeDechet` | `RESPONSABLE_AFFECTATION` ; équipes actives compétentes. |
| GET | `/assignments` | `RESPONSABLE_AFFECTATION` ; historique paginé, filtrable par dossier (`idDossier`), équipe et états. |
| POST | `/assignments` | `RESPONSABLE_AFFECTATION` ; nouvelle affectation idempotente. |
| GET | `/assignments/team/:idEquipe` | `AGENT_TERRAIN` membre actif de l'équipe ; ses affectations. |
| POST | `/assignments/:idAffectation/response` | `AGENT_TERRAIN` membre actif de l'équipe ; accepte ou refuse. |
| POST | `/assignments/:idAffectation/reassign` | `RESPONSABLE_AFFECTATION` ; réaffectation d'une mission éligible. |

La création référence directement un `ContenuDossier`, une équipe et une `CompetenceEquipe`. Le service revalide les états et l'éligibilité dans une transaction ; le header `Idempotency-Key` est requis pour créer ou réaffecter. Les réponses `GET /assignments/team/:idEquipe` exposent aussi les coordonnées et le libellé de localisation du dossier pour la navigation de l'agent ; les valeurs peuvent être nulles.

### Interventions — `interventions`

Toutes les routes exigent `AGENT_TERRAIN` ; l'appartenance active, l'auteur et l'état de la mission sont revalidés côté service.

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/interventions/my-teams` | Liste les équipes actives du compte. |
| GET | `/interventions/team/:idEquipe` | Consulte les interventions de son équipe. |
| POST | `/interventions/assignments/:idAffectation/start` | Démarre une intervention sur une affectation acceptée. |
| POST | `/interventions/:idIntervention/photos` | Ajoute une preuve photo avant soumission. |
| POST | `/interventions/:idIntervention/submit` | Soumet le compte rendu et le résultat terrain. |

Un résultat partiel ou impossible exige un motif d'exception. Seul l'agent ayant démarré l'intervention peut soumettre le compte rendu et joindre les preuves. Les réponses `GET /interventions/team/:idEquipe` incluent les coordonnées et le libellé de localisation du dossier lorsque disponibles.

### Vérification — `verification`

Toutes les routes exigent `VERIFICATEUR_CLOTURE`. L'auto-vérification est interdite.

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/verification/pending` | Liste paginée des interventions en attente. |
| GET | `/verification/assignments/:idAffectation` | Consulte le dernier compte rendu soumis. |
| GET | `/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url` | Crée une URL signée pour une preuve de l'intervention soumise. |
| POST | `/verification/assignments/:idAffectation/decision` | Valide ou demande une reprise motivée. |

Une décision conforme clôt l'affectation et termine le contenu ; le dossier n'est clôturé que lorsque tous ses contenus actifs sont terminés.

### Centre de commandement — `command-center`

| Méthode | Route | Accès |
|---|---|---|
| GET | `/command-center/overview` | Rôles back-office actifs : `AGENT_QUALIFICATION`, `RESPONSABLE_TRAITEMENT`, `RESPONSABLE_AFFECTATION`, `VERIFICATEUR_CLOTURE`, `GESTIONNAIRE_REFERENTIEL`, `ADMINISTRATEUR_COMPTES`. |

La réponse agrège les compteurs de signalements en attente, dossiers ouverts/prioritaires, affectations actives, interventions en cours, vérifications attendues et qualité de géolocalisation. La carte retourne les dossiers ouverts géolocalisés et les signalements actifs non encore associés à un dossier, avec un plafond de 250 éléments par réponse (paramètre `limit`, 150 par défaut). Les dossiers agrègent les noms d'équipes actives, le nombre d'interventions en cours et les catégories actives. Aucun nom de citoyen, téléphone, courriel, identifiant d'agent ou événement d'audit brut n'est exposé.

Les objets dépourvus de latitude ou de longitude sont comptabilisés dans `withoutLocation`, mais ne sont jamais placés sur la carte. Les marqueurs sont des données métier existantes, pas une approximation d'adresse. La date `generatedAt` décrit l'instant de lecture de l'API ; cet endpoint n'est pas un flux de suivi GPS ni un service temps réel.

## Contrats de réponse des uploads média

`POST /reports/:id/photos` renvoie `idPhotoSignalement`, tandis que `POST /interventions/:idIntervention/photos` renvoie `idPhotoIntervention`. Les deux réponses contiennent `description`, `dateAjout` et `etatPublication: PRIVEE`. Elles n'exposent jamais `referencePhoto`, un chemin Storage ou une URL signée. Les schémas OpenAPI utilisent deux DTO distincts pour préserver ces noms de propriété.

## Stockage de médias

Les uploads utilisent le stockage privé via le backend. Les formats acceptés sont JPEG, PNG et WebP ; la taille est limitée à 10 MiB. Les chemins Storage ne sont jamais retournés au client. L'API vérifie la propriété et le contexte métier avant de créer une URL signée de courte durée.

Le schéma simplifié ne contient plus de champs de publication/approbation publique des photos. Les références de stockage, dates d'expiration et métadonnées de purge sont conservées pour la rétention.

## Checklist de documentation d'un endpoint

Chaque endpoint doit documenter dans le code :
1. Son objectif via `@ApiOperation` et son groupe via `@ApiTags`.
2. Les paramètres de chemin et de requête ainsi que leurs contraintes.
3. Le DTO de requête et la validation effective.
4. Le schéma et le code de succès.
5. Les erreurs pertinentes et les habilitations.
6. Le comportement des contrôles métier contextuels.

## Versionnement et erreurs

Toutes les routes métier sont préfixées par `/api/v1`. Préférer les changements additifs et conserver la sémantique des réponses existantes. Les erreurs doivent utiliser des codes HTTP stables et des messages sûrs ; ne jamais retourner de stack trace, SQL, jeton ou secret fournisseur.

## Workflow de changement

Mettre à jour contrôleur, DTO, service, tests et annotations OpenAPI dans la même PR. La CI génère OpenAPI et valide le JSON produit. Ce fichier doit rester un index des routes réellement implémentées et ne doit pas réintroduire des endpoints supprimés du modèle.
