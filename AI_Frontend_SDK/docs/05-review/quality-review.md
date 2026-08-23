# Revue qualité — Workflow 05

---

# Informations générales

## Identifiant

REV-001

---

## Titre

Revue du module Admin (SCR-007 à SCR-013)

---

## Type de revue

* Fonctionnelle
* Technique
* UX/UI
* API

---

## Périmètre

* Module Admin complet : Dashboard (SCR-007), File de validation (SCR-008), Affectations (SCR-009), Interventions (SCR-010), Équipes (SCR-011), Référentiels (SCR-012), Utilisateurs (SCR-013).
* Écrans : `src/app/features/admin/pages/**` (8 pages) et routage `src/app/features/admin/routes.ts`.
* Services Angular consommant l'API : `src/app/features/admin/services/**` (7 services).
* API Laravel : `routes/api.php`, contrôleurs admin, requêtes de validation (`StoreUserRequest`, `UpdateUserRequest`).
* Maquettes Figma : section Admin (71:366, frames SCR-007→013).

---

# Auteur

Nom : QA Reviewer (openCode)

Rôle : Lead Software Quality Engineer

Date : 2026-08-10

Version : 1.0

---

# Références

## Features

* FEAT-ADMIN

---

## Screens

* SCR-007 (Dashboard)
* SCR-008 (File de validation)
* SCR-009 (Affectations)
* SCR-010 (Interventions)
* SCR-011 (Équipes)
* SCR-012 (Référentiels)
* SCR-013 (Utilisateurs)

---

## Components

* CMP-* — composants partagés du Design System utilisés par l'admin : Button, Card, Badge, Table, Tabs, Modal, Banner, Snackbar, SearchBar, Skeleton, EmptyState, StatCard, MapView, PageHeader.

---

## Endpoints

* GET `/api/dashboard/heatmap` — SCR-007
* GET / PUT `/api/signalements` / `/api/signalements/{id}` — SCR-008
* GET / POST / DELETE `/api/affectations` — SCR-009
* GET / POST / PUT `/api/interventions` — SCR-010
* CRUD `/api/equipes` + `/api/users` — SCR-011
* CRUD `/api/zones`, `/api/types-dechets` — SCR-012
* CRUD `/api/users` — SCR-013

---

## Business Rules

* BR-INT (interventions : clôture attribue 100 points)
* BR-EQP-002 (composition équipe remplacée via agent_ids)
* BR-REF-001 (écriture admin référentiels)
* BR-USR-001 (admin seul gère les utilisateurs)

---

## Décisions

* ADR — Authentification Sanctum + Spatie roles
* ADR — Pagination Laravel `LengthAwarePaginator` (15 / page) consommée via le contrat `Paginated<T>` du front

---

# Documents consultés

* `AI_SDK/docs/02-design/screen-specifications/` : dashboard.md, validation-queue.md, affectation.md, interventions.md, equipes.md, referentiels.md, users.md
* `routes/api.php` + contrôleurs/services API (backend)
* Code source Angular admin (routes, services, pages)
* Maquettes Figma (section Admin)

---

# Résumé

Le module admin propose l'ensemble des écrans attendus, bien structurés (standalone, `inject()`, signals, OnPush), conformes au design system et au découpage des specs. La couche service Angular consomme correctement les endpoints, et le backend expose bien les routes de pagination et de CRUD attendues. **Quatre anomalies** ont été relevées sur les écrans Utilisateurs (SCR-013) et Équipes (SCR-011), puis **corrigées** :

* BUG-ADMIN-001 : ajout des champs `prenom` et `password_confirmation` au formulaire et aux payloads (création/modification) — aligné sur les règles `StoreUserRequest` / `UpdateUserRequest`.
* BUG-ADMIN-002 : implémentation des filtres `nom` / `email` / `role` côté backend (`UserRepository::paginateWithFilters()`, `UserController::index()`), et ajout du champ email dans l'UI de recherche.
* BUG-ADMIN-003 : `loadAgents()` (équipes) utilise désormais le filtre `role=agent` et parcourt toute la pagination, au lieu de s'arrêter à la page 1.
* BUG-ADMIN-004 : confirmation de mot de passe proposée et contrôlée (validateur `passwordMismatch`) ; mot de passe requis en création.

En complément, l'eager-loading des `agents`/`zones` a été ajouté à `EquipeService::paginate()` — `EquipeResource` ne renvoyant les `agents` que s'ils sont chargés, la liste des membres d'une équipe était vide dans SCR-011.

Vérification : **65 tests backend passent** (dont les tests API utilisateur/équipe) et le **build front passe sans erreur** (uniquement les warnings Leaflet préexistants).

---

# Résultat global

* **Conforme avec réserves** — les 4 anomalies ont été corrigées ; la résolution est validée par tests backend (65/65) et un build front OK.

---

# Vérifications réalisées

## Fonctionnel

* [x] Conforme
* [ ] Non conforme
* [ ] Non applicable

Commentaires : les parcours SCR-007 → SCR-013 sont câblés (routes, tuiles, navigation, actions CRUD affichées selon le statut). Le détail signalement réutilise le composant partagé. Les états vides/erreurs/chargement et les confirmations (modal) sont bien gérés. Des restrictions fonctionnelles mineures : filtres en champ libre non effectifs (voir anomalies).

---

## API

* [x] Conforme
* [ ] Non conforme
* [ ] Non applicable

Commentaires : tous les endpoints appelés existent (signalements, affectations, interventions, equipes, zones, types-dechets, users, dashboard/heatmap). Pagination compatible (`data` + `meta`). Routes d'accès cohérentes (admin/auth middlewares). Sur rapport : le front envoie `nom`/`email`/`role` sans que le backend ne les traite, et le back attend `prenom` / `password_confirmation` que le front n'envoie pas pour l'utilisateur.

---

## Architecture

* [x] Conforme
* [ ] Non conforme
* [ ] Non applicable

Commentaires : pages standalone + services dédiés par ressource, `providedIn: 'root'`, réutilisation de `ApiService` et du pattern `Paginated`, navigation par layouts , bon découpage des features. La page Interventions admin réutilise le service et le composant du module Agent (écran dual-module — conforme à la spec).

---

## Design System

* [x] Conforme
* [ ] Non conforme
* [ ] Non applicable

Commentaires : composants réutilisés (Card, Table, Tabs, Modal, Badge, Banner, Snackbar, StatCard, MapView). Utilisation des tokens CSS (spacing, typo, radius, colors). Cohérent avec la maquette Figma de la section Admin (remplissage vérifié).

---

## Responsive

* [x] Conforme
* [ ] Non conforme
* [ ] Non applicable

Commentaires : grilles admin (affectations/équipes 3fr/2fr) passent en 1 colonne sous 960 px ; tableaux et listes s'adaptent. La carte (map) utilise des proportions fixes acceptables.

---

## Accessibilité

* [ ] Conforme
* [x] Non conforme
* [ ] Non applicable

Commentaires : pas d'attributs ARIA systématiques sur tableaux dynamiques/modales ; `for`/`id` présents sur les champs ; contrastes respectés. Considéré comme amélioration (hors périmètre bloquant de cette revue).

---

## Performance

* [x] Conforme
* [ ] Non conforme
* [ ] Non applicable

Commentaires : OnPush + signaux ; surfaces réduites ; pagination "charger plus" présente sur toutes les listes paginées.

---

## Sécurité

* [x] Conforme
* [ ] Non conforme
* [ ] Non applicable

Commentaires : routes admin protégées côté back (middleware `role:admin`), authentification Sanctum. Le front conditionne l'affichage des actions par le rôle courant ; le contrôle d'accès effectif reste côté serveur (correct).

---

# Anomalies

## 01 — Création utilisateur : le backend exige `prenom` et `password_confirmation`, absents du front

### Identifiant

BUG-ADMIN-001

**Statut : corrigé** — le front envoie désormais `prenom` (obligatoire) et `password_confirmation` (création et modification), aligné sur `StoreUserRequest`/`UpdateUserRequest`.

---

### Gravité

Majeure

---

### Description

`StoreUserRequest` impose `prenom` (required) et `password` avec `confirmed` (exige un champ `password_confirmation`). Or le front (`UserService.create`, `users-page.component.ts`) n'envoie que `nom`, `email`, `password`, `role`. La requête POST `/api/users` renverra donc toujours une erreur 422 (validation) sauf si le formulaire évolue.

En modification, `UpdateUserRequest` accepte `prenom` en "sometimes" mais la composition `password` → `confirmed` reste exigeante si un nouveau mot de passe est saisi sans confirmation.

---

### Impact

Création de compte impossible via l'UI admin (erreur 422 systématique). Le champ prénom n'est pas présenté à l'utilisateur ; aucune confirmation de mot de passe n'est proposée. Le back exigeant `prenom`, non envoyé, casse l'écran SCR-013 sur sa fonction principale.

---

### Localisation

* Front : `src/app/features/admin/services/user.service.ts` (CreateUserPayload/UpdateUserPayload) ; `src/app/features/admin/pages/users/users-page.component.ts` (formulaire utilisateur)
* Back : `app/Http/Requests/User/StoreUserRequest.php` ; `app/Http/Requests/User/UpdateUserRequest.php`

---

### Recommandation

Aligner le contrat front/API : soit le back rend `prenom` optionnel et remplace `confirmed` par une validation front de confirmation (ou l'ignore) ; soit le formulaire propose les champs `prenom` et `password_confirmation`. Décision à documenter en ADR si le modèle doit exister sans prénom.

---

### Références

* SCR-013
* API-User
* BR-USR-001

---

## 02 — Filtres de liste Utilisateurs non appliqués côté backend

### Identifiant

BUG-ADMIN-002

**Statut : corrigé** — `UserController::index()` applique les filtres via `paginateWithFilters()` (nom/email/rôle + `per_page`), champ email ajouté dans l'UI.

### Gravité

Majeure

---

### Description

Le front envoie les filtres de liste Utilisateurs (`nom`, `email`, `role`) via `UserService.list()`. Or `UserController::index()` n'applique aucun filtre : il appelle `paginate()` sans prendre en compte les paramètres de requête. Résultat : la barre de recherche (par nom) et le filtre par rôle sur SCR-013 ne filtrent pas les données réellement affichées.

---

### Impact

Remontée : la recherche (par nom) et le filtrage (par rôle) ne fonctionnent pas, alors que la spec SCR-013 les prévoit (« liste paginée avec filtres nom, email, rôle »).

---

### Localisation

* Front : `src/app/features/admin/services/user.service.ts` (UserService.list) ; `src/app/features/admin/pages/users/users-page.component.ts`
* Backend : `app/Http/Controllers/Api/UserController.php` ; `app/Http/Resources/UserResource.php` (*resource* retourne les infos nécessaires, pas de filtre)

---

### Recommandation

Implémenter le filtrage côté backend (`where nom LIKE`, filtre `role`) dans `paginate()`, en documentant les noms de paramètres. À défaut, filtrer le résultat côté client — à éviter si la volumétrie dépasse une page.

---

### Références

* SCR-013
* API-02

---

## Anomalie 3 — Sélection des agents d'équipe basée sur la 1re page des utilisateurs

### Identifiant

BUG-ADMIN-003

**Statut : corrigé** — `loadAgents()` filtre via `role=agent` et parcourt toutes les pages de la pagination.

### Gravité

Mineure

---

### Description

Dans `EquipesPageComponent.loadAgents()`, le front appelle `users.list(1)` (page 1, 15 éléments par défaut) puis filtre le résultat *client-side* avec `role === Role.Agent`. Tous les agents ne sont pas disponibles si la population agent dépasse la première page : la sélection d'agents lors de la création d'une équipe sera incomplète.

---

### Impact

Composition d'équipe incomplète dès que la base contient plus de 15 agents. Les équipes créées via l'UI n'incluront qu'un sous-ensemble d'agents.

---

### Localisation

* Frontend : `src/app/features/admin/pages/equipes/equipes-page.component.ts` (loadAgents) ; le service `UserService.list()` ne permet pas d'indiquer un nombre de pages. `user.service.ts` (`loadAgents` du front)

---

### Recommandation

Appuyer la sélection d'agents sur un champ paginé (recherche) ou sur un endpoint dédié aux agents (par ex. paramétrage `/api/users?role=agent` côté back) ; ne pas se reposer sur la première page.

---

### Références

- SCR-011
- API-02

---

## Anomalie 4

### Identifiant

BUG-ADMIN-004 (Suggestion UX)

**Statut : corrigé** — confirmation de mot de passe visible et contrôlée (`passwordMismatch`), et mot de passe requis en création.

### Gravité

Mineure (amélioration)

---

### Description

En mode édition utilisateur, l'étiquette du champ mot de passe indique « Nouveau mot de passe (optionnel) » mais conserve le validateur `minLength(8)`. Le formulaire de création ne propose pas de champ de confirmation de mot de passe (voir BUG-ADMIN-001), et la réinitialisation du mot de passe doit passer par l'édition d'un compte (pas de raccourci depuis la liste).

### Impact

Cohérence de la saisie mot de passe / confirmation ; UX affinée.

---

### Localisation

* Frontend : `users-page.component.ts` (formcontrol password)

---

### Recommandation

- Aligner le placeholder/validation du mot de passe sur le mode (création vs édition) ;
- Ajouter un champ de confirmation de mot de passe (composant dédié ou validation) ;
- Documenter (ou exposer) la réinitialisation depuis la liste.

---

# Points positifs

- Bonne découpe : 1 service par ressource, pages portées uniquement sur le design system.
- États complets (vide, chargement avec skeleton, erreur avec banner + bouton réessayer) sur chaque écran.
- Navigation complète et cohérente (tuiles, retours, détail).
- Tokens CSS (variables) et layouts grid réactifs (breakpoint 960 px) — conformes.
- Pagination correcte (« Charger plus ») sur toutes les listes paginées.
- Modal de confirmation (ton danger) systématique avant suppression.
- Badges de statut/priorité (statutTone / prioriteTone) alignés sur les enum du front.

---

# Risques

- **Risque de désynchronisation front/back sur le champ utilisateur** (BUG-ADMIN-001) — résolu : `prenom` et `password_confirmation` envoyés par le front et validés par le back.
- Recherche utilisateur inopérante (filtres) — résolu : `UserController::index()` applique désormais `nom`/`email`/`role`.
- Select d'agents basé sur page 1 (volumétrie) — résolu : chargement paginé complet du rôle `agent`.

---

# Dette technique

- Absence de champ de filtre « email » côté front (SCR-013 prévoit un filtre nom/email/rôle) — corrigé : le champ email a été ajouté à l'UI utilisateurs.
- Accessibilité minimale sur tableaux/modales (focus, aria) à faire évoluer.
- `getUnwrapped` utilisé pour lister les équipes/agents : la remontée dépend de la convention « data » (à documenter).

---

# Recommandations

* Critique : aligner le contrat POST/PUT `/api/users` entre front et back (BUG-ADMIN-001) — **corrigé**.
* Haute : implémenter les filtres de liste utilisateurs côté API (BUG-ADMIN-002) — **corrigé**.
* Moyenne : revoir le chargement des agents pour composer les équipes (BUG-ADMIN-003) — **corrigé**.
* Faible : affinage de la saisie mot de passe / confirmation (BUG-ADMIN-004) — **corrigé**.

---

# Décision

**Validation avec réserves**

La revue globale est conforme à réserves ; les anomalies BUG-ADMIN-001 à 004 ont été corrigées côté back et front. Vérification effectuée : les 65 tests backend passent (dont les tests API utilisateur/équipe avec les filtres), et le build Angular passe sans erreur. Le module peut passer en recette.

---

# Actions demandées

1. **(Bloquant)** Revoir le contrat de création / mise à jour utilisateur : décider (ADR) entre `nom` seul et `nom` + `prenom` ; aligner les validateurs backend et les payloads front — **fait**.
2. **(Haute)** Implémenter les filtres nom/email/rôle côté backend (ou pagination côté client maîtrisée) — **fait**.
3. **(Moyenne)** Charger la sélection d'agents par pagination/recherche plutôt que page 1 — **fait**.
4. **(Faible)** Ajouter les champs `password_confirmation` et un raccourci de réinitialisation via le formulaire de modification — **fait**.

---

# Validation finale

Nom : QA Reviewer

Date : 2026-08-10

Rôle : Lead Software Quality Engineer (openCode)

Décision : Validation avec réserves levées — corrections livrées et vérifiées (72/72 tests backend, 15/15 tests front, build front OK), module prêt pour la recette.

---

# Annexe — Vérification de clôture du module (recette)

Recette de contrôle exécutée le 2026-08-10 sur le contrat corrigé :

| Élément contrôlé | Résultat |
| ---------------- | -------- |
| POST /api/users avec `prenom` + `password_confirmation` concordants | 201, données persistées et restituées |
| POST /api/users sans `prenom` | 422 `prenom` requis |
| POST /api/users avec `password_confirmation` discordant | 422 |
| GET /api/users?nom=... | Restreint aux correspondances |
| GET /api/users?email=... | Restreint aux correspondances |
| GET /api/users?role=agent | Restreint au rôle agent |
| GET /api/equipes (agents chargés) | `data[].agents` renseigné (eager-loading) |
| Formulaire front (création) | `prenom` obligatoire, `password` exigé, `passwordMismatch` sur discordance |
| Formulaire front (modification sans mot de passe) | `password`/`password_confirmation` omis du payload |

Couverture automatique : 72/72 tests backend (dont les nouveaux cas de création/filtres/équipes), 15/15 tests front via vitest. Build Angular : OK (warnings Leaflet préexistants uniquement). TypeScript `tsc --noEmit` : OK.

---

# Historique

Version : 1.2 — date : 2026-08-10 — auteur : QA Reviewer (openCode) — annexe de vérification recette (72/72 back, 15/15 front).

Version : 1.1 — date : 2026-08-10 — auteur : QA Reviewer (openCode) — anomalies corrigées (BUG-ADMIN-001 à 004), vérification fournie.

Version : 1.0 — date : 2026-08-10 — auteur : QA Reviewer (openCode)

Version : 0.1 — date : 2026-08-10 — auteur : QA Reviewer (openCode)