# Architecture Document

## Identifiant

ARCH-002

---

## Titre

Architecture Frontend Angular — Application ISI-Eco-Report

---

## Version

1.0

---

## Auteur

Nom : Frontend Architect
Rôle : Architecture (Workflow 03 — Architecture)
Date : 2026-08-06

---

# Objectif

Définir l'architecture technique du frontend Angular 22 de ISI-Eco-Report : organisation des modules, responsabilités, flux de données, communication avec l'API Laravel (ARCH-001) et stratégies transverses (état, erreurs, sécurité, performance).

Cette architecture est directement exploitable par les développeurs (Workflow 04 — Development) et par le QA (Workflow 05 — Review).

Périmètre : frontend uniquement. Aucun écran n'est implémenté dans cette phase ; aucun endpoint n'est inventé — uniquement les 44 endpoints vérifiés (`docs/01-analysis/endpoints.md`).

---

# Périmètre

Domaines concernés :

* [x] Frontend
* [x] API (consommation)
* [x] Authentification (côté client)
* [ ] Backend
* [ ] Infrastructure
* [ ] Base de données
* [ ] Intégration
* [x] Design System (consommation des composants Figma)
* [ ] Déploiement
* [ ] Autre

---

# Contexte

L'application frontend Angular consomme l'API REST Laravel 12 de ISI-Eco-Report (signalement de dépôts sauvages, brigades de collecte, interventions, points de fidélité citoyens).

Éléments d'entrée :

* **Backend** : 44 endpoints (4 publics, 40 protégés), authentification Sanctum par token Bearer, rôles Spatie `admin` / `agent` / `citizen`, pagination serveur fixe (15/page), réponses enveloppées `data/links/meta`, erreurs JSON normalisées (401, 403, 404, 422). Détails : `docs/01-analysis/` (ARCH-001, endpoints.md, api-analysis.md, business-rules.md).
* **Design** : 17 écrans spécifiés (SCR-001 à SCR-017), 16 parcours (UF-001 à UF-016), navigation par rôle et guards définis dans `docs/02-design/navigation.md`.
* **Ambiguïtés backend actives** : n° 1 (historique de points non filtré par l'API), n° 11 (auto-édition du profil réservée aux Admin) — des contournements UI sont documentés dans les specs concernées (SCR-014, SCR-015) ; non bloquantes pour l'architecture.

Contraintes techniques :

* Angular 22 uniquement : Standalone Components exclusifs, Signals par défaut, RxJS réservé à HTTP/streams (`PROJECT_RULES/angular-guidelines.md`).
* Architecture Feature-Based obligatoire (`PROJECT_RULES/architecture-principles.md`) : `core/`, `shared/`, `layouts/`, `features/`.
* Design System Figma unique — interdiction de recréer les composants UI de base.
* Responsive : Mobile First (Citizen, Agent) ; Desktop First (Admin).
* `config('app.frontend_url')` côté backend pointe sur `http://localhost:4200` (port de dev Angular par défaut) — CORS backend à confirmer au branchement.

---

# Principes d'architecture

* Backend = source de vérité métier : le frontend présente les données et gère les interactions ; aucune logique métier n'est reproduite (transitions de statut, éligibilité, points).
* Architecture Feature-Based : chaque fonctionnalité appartient à une seule feature ; aucune dépendance directe entre features.
* Standalone Components exclusifs et Signals pour l'état local ; RxJS uniquement pour HTTP et flux.
* Responsabilité unique : Smart Components (état, orchestration) + Presentational Components (affichage) + Services spécialisés.
* Design System unique : tous les composants UI proviennent de `shared/` (implémentations des composants Figma).
* Couche de communication centralisée : aucun `HttpClient` dans un composant ; tout passe par des services puis `core/api`.
* Interceptors transverses : injection du token Bearer, normalisation des erreurs, gestion 401 (session expirée — UF-016).
* Routage lazy : un routeur parent par espace (auth, citizen, agent, admin) avec guards de rôle.
* Typage strict : interface TypeScript pour chaque ressource API et chaque réponse paginée ; aucun `any` sans justification.
* Traitement 422 comme états attendus : les messages d'exception métier backend sont affichés tels quels.
* Enum mappings centralisés : `statut`, `priorite`, `dangerosite`, `role` traduits en libellés UI via des pipes/mappings constants (recommandation `docs/01-analysis/api-analysis.md` § 9).
* Qualité avant rapidité : OnPush, `track`, lazy loading — pas d'optimisation prématurée.

---

# Vue d'ensemble

```
Navigateur — SPA Angular 22
│
├── App Shell (bootstrap, routeur racine)
│
├── core/        authentification, session, guards, interceptors, API, config, modèles
├── shared/      composants UI (Design System), pipes, directives, utilitaires
├── layouts/     structures d'écran par espace (Auth / Citizen / Agent / Admin)
└── features/    auth · citizen · agent · admin · profile (lazy)
│
▼
HTTPS — JSON — Bearer token (Authorization: Bearer <token>)
│
▼
API Laravel 12 (ARCH-001) — 44 endpoints, pagination 15, erreurs 401/403/404/422
│
▼
Base de données MySQL (côté backend)
```

Blocs principaux :

* **Sessions & rôles** : `SessionService` (signal `user`), guards `AuthGuard` / `GuestGuard` / `RoleGuard`, redirections post-connexion par rôle (`docs/02-design/navigation.md`).
* **Cartographie** : Leaflet dans `shared/` (composants carte génériques) ; consommation de `GET /api/signalements` (cartes citoyen/agent/admin) et `GET /api/dashboard/heatmap` (admin uniquement — SCR-007).
* **Communication** : `core/api` (client HTTP typé) + `AuthInterceptor` + `ErrorInterceptor`.
* **Formulaires** : réactifs Angular (`ReactiveFormsModule`) avec gestion champ par champ des 422.
* **Photos** : upload via un service de stockage externe (l'API n'accepte que des URLs — ADR-005).

---

# Composants principaux

| Composant | Responsabilité |
| --------- | -------------- |
| `core/auth/AuthService` | Connexion, inscription, mot de passe oublié/réinitialisé, déconnexion ; émission/purge du token |
| `core/auth/SessionService` | Restauration de session via `GET /api/user`, signal `user` courant (rôle, nom, email), signal `isAuthenticated` |
| `core/auth/TokenStorage` | Persistance du token (localStorage), lecture/écriture/purge sécurisée |
| `core/guards/AuthGuard` | Autorise l'accès aux routes protégées (token valide), sinon redirection `/auth/login?returnUrl=…` |
| `core/guards/GuestGuard` | Bloque l'accès aux pages publiques si déjà connecté (redirection par rôle) |
| `core/guards/RoleGuard` | Autorise selon le rôle (citizen/agent/admin), sinon redirection vers l'accueil du rôle |
| `core/interceptors/AuthInterceptor` | Injection du header `Authorization: Bearer` sur chaque requête sortante |
| `core/interceptors/ErrorInterceptor` | Normalisation des erreurs en `ApiError` ; 401 → purge session + redirect (UF-016) ; 0 → état hors ligne |
| `core/api/ApiService` | Client HTTP typé générique (get/post/put/delete) : enveloppe `data/links/meta`, mapping pagination, conversion des 422 |
| `core/config` | Configuration applicative (API_URL, storage provider, clés Leaflet) injectée depuis `environments/` |
| `core/models` | Interfaces TypeScript des ressources API (User, Signalement, Affectation, Intervention, Equipe, Zone, TypeDechet, HistoriquePoint, Heatmap, Paginated\<T\>) |
| `shared/components` | Implémentations des composants du Design System Figma (Button, Input, Select, Card, Badge, Table, Modal, Snackbar, Banner, EmptyState, Skeleton, StatCard, Tabs, SearchBar, PhotoUploader, MapView, BottomNavigation…) |
| `shared/pipes` | Mappings d'affichage : `statutLabel`, `prioriteLabel`, `dangerositeLabel`, `roleLabel`, `dateFormat`, `pointsSign` |
| `shared/directives` | Directives transverses (focus trap, click-outside, debounce) |
| `layouts/*` | Shells par espace : `AuthLayout` (centré), `CitizenLayout` (Bottom Navigation), `AgentLayout`, `AdminLayout` (sidebar desktop) |
| `features/auth` | SCR-001, SCR-002, SCR-016, SCR-017 (écrans publics + guards associés) |
| `features/citizen` | SCR-003 (carte), SCR-004 (création), SCR-005 (liste), SCR-006 (détail), SCR-015 (points) |
| `features/agent` | SCR-010 (interventions), SCR-006 (détail signalement — vision agent) |
| `features/admin` | SCR-007 (dashboard), SCR-008 (validation), SCR-009 (affectations), SCR-011 (équipes), SCR-012 (référentiels), SCR-013 (utilisateurs), SCR-006 (détail — vision admin) |
| `features/profile` | SCR-014 (profil — commun aux trois rôles, chargé en lazy par tous les shells) |

---

# Flux de données

Utilisateur

↓

Composant présentational (template, événements UI)

↓

Smart Component (signals locaux, orchestration des actions)

↓

Service de feature (AuthService, SignalementService, InterventionService, …)

↓

`core/api/ApiService` (URLs, types, pagination)

↓

Interceptors (Bearer, erreurs)

↓

`HttpClient` → HTTPS

↓

API Laravel (Sanctum → Policies → Services → Repositories → MySQL)

↓

Réponse JSON (`data/links/meta` ou ressource)

↓

Mapping typé (modèles TS) → signals

↓

Mise à jour du template (OnPush)

Cycle de vie des données :

* Lecture : au chargement de l'écran (ou accès API), données stockées dans les signals de la feature ; rafraîchissement explicite après écriture (les listes sont rechargées depuis l'API — pas de cache métier dans cette version).
* Écriture : les mutations passent par les endpoints ; en cas de succès, message Snackbar + rechargement local ; en cas de 422, erreurs champ par champ.

---

# Organisation des modules

```
src/
├── app/
│   ├── core/
│   │   ├── auth/              AuthService, SessionService, TokenStorage
│   │   ├── guards/            AuthGuard, GuestGuard, RoleGuard
│   │   ├── interceptors/      AuthInterceptor, ErrorInterceptor
│   │   ├── api/               ApiService, ApiError, pagination
│   │   ├── config/            application config
│   │   ├── storage/           StorageProvider (photos)
│   │   └── models/            interfaces API (User, Signalement, …)
│   ├── shared/
│   │   ├── components/        Design System (ui/*) + métier réutilisable (map/, status/*)
│   │   ├── pipes/             mappings statut/priorité/rôle/dates
│   │   ├── directives/        focus-trap, click-outside, debounce
│   │   └── utils/             helpers purs (formatage, enum mapping)
│   ├── layouts/
│   │   ├── auth-layout/       centré, mobile/desktop
│   │   ├── citizen-layout/    header + Bottom Navigation
│   │   ├── agent-layout/      header + onglets
│   │   └── admin-layout/      sidebar + header desktop
│   └── features/
│       ├── auth/              login, register, forgot-password, reset-password
│       ├── citizen/           map, report-create, report-list, report-details, points
│       ├── agent/             interventions (liste/détail), report-view
│       ├── admin/             dashboard, validation-queue, affectations, equipes, referentiels, users, report-detail
│       └── profile/           profile
├── assets/                    icônes, logos, tuiles cartographiques statiques
└── environments/              environment.ts / environment.prod.ts (API_URL, …)
```

Chaque dossier de feature contient : `pages/` (Smart Components par route), `components/` (composants de la feature), `services/`, `models/` (si spécifiques), `routes.ts` (définition de routes lazy), `signals/` (état local si nécessaire).

---

# Dépendances

| Dépendance | Usage | Statut |
| ---------- | ----- | ------ |
| Angular 22 | Framework (Standalone, Signals, Router, Forms, HttpClient) | Standard projet |
| Leaflet (+ typings `@types/leaflet`) | Cartes citoyen/agent/admin + heatmap admin (SCR-003, SCR-006, SCR-007) | ADR-002 |
| `leaflet.heat` (plugin) | Rendu heatmap SCR-007 | ADR-002 |
| Storage provider externe (interface) | Upload des photos → URLs (SCR-004, SCR-010) | ADR-005 |
| Design System Figma | Composants UI (`shared/components`) | À livrer par l'UI Designer (Workflow 02, étape 6) |

Non utilisés : NgRx (ADR-001), Google Maps API (ADR-002), librairie d'état tierce, Material (les composants UI sont implémentés depuis le Design System Figma).

---

# Communication

* Frontend ↔ API : HTTPS, JSON, header `Authorization: Bearer <token>` sur toutes les routes protégées.
* Conventions consommées : enveloppe `data/links/meta` (listes), ressources nues (détails), pagination fixe 15 (paramètres `page` uniquement), codes 401/403/404/422, messages d'erreur métier dans le champ `message` (à confirmer par le développement contre `docs/01-analysis/api-analysis.md`).
* Authentification : token émis à login/register, restauré via `GET /api/user`, révoqué via `POST /api/auth/logout`.
* Photos : upload → stockage externe → URL persistée dans les payloads des signalements/interventions (ADR-005).
* Email (reset mot de passe) : lien construit avec `frontend_url` côté backend → route `/auth/reset-password?token=…&email=…` (SCR-017).

---

# Sécurité

* Authentification : token Bearer jamais loggé ; stockage localStorage (compromis documenté — ADR-001) ; purge systématique sur 401 et à la déconnexion.
* Autorisation : double garde frontend — guards de route (docs/02-design/navigation.md) + masquage des actions selon le rôle ; l'autorité finale reste le backend (Policies).
* Session expirée : UF-016 — tout 401 purge la session et redirige vers `/auth/login?returnUrl=…` avec retour à l'écran initial après reconnexion.
* Validation : validation locale (formulaires réactifs) pour l'expérience utilisateur uniquement ; toute validation métier reste serveur (422 affichés tels quels).
* Données personnelles : la heatmap et les listes citoyennes n'exposent que ce que l'API renvoie ; aucun stockage client de données d'autres utilisateurs.
* CORS : à confirmer côté backend pour l'origine frontend (défaut `http://localhost:4200`).

---

# Performance

* Lazy Loading par feature et par écran (routeurs par espace).
* ChangeDetection OnPush sur tous les composants ; `track` systématique dans les boucles.
* Signals : aucune subscription manuelle inutile ; `computed()` pour les dérivations.
* Pagination API respectée (15/page) — aucune liste chargée en entier.
* Cartes Leaflet : chargement lazy (module importé à la demande), heatmap chargée uniquement sur SCR-007.
* Images/photos : dimensions limitées à l'upload (client), pas de rechargement des tuiles hors écran.
* Squelettes de chargement (Skeleton) sur toutes les listes (spécifications écrans).

---

# Gestion des erreurs

* **Capture** : `ErrorInterceptor` centralise toutes les réponses HTTP en erreur et les transforme en `ApiError` typé (`status`, `message`, `errors`).
* **Transformation** :
  * 401 → purge session + redirection `/auth/login` avec `returnUrl` (UF-016).
  * 403 → redirection vers l'accueil du rôle courant ou message d'accès refusé.
  * 404 → état « introuvable » (Empty/Error State de l'écran).
  * 422 → erreurs champ par champ (formulaires) + message global si présent.
  * 0 / réseau → bannière « hors ligne » ; réessai disponible ; écritures désactivées.
  * Autres (5xx) → bannière générique + « Réessayer ».
* **Affichage** : formulaires (champs), `Banner` (global), `Snackbar` (actions réussies), `EmptyState`/`ErrorState` (contenus). Les composants ne contiennent pas de logique complexe de traitement des erreurs.
* Les messages d'erreur métier backend (422) sont affichés sans modification de leur signification (règle projet).

---

# Contraintes

* Angular 22 — Standalone Components exclusifs ; NgModules interdits sauf exception justifiée.
* Signals par défaut ; RxJS réservé à HTTP/streams/interop.
* Architecture Feature-Based (core/shared/layouts/features) ; aucune dépendance entre features.
* API fixe : 44 endpoints, pagination 15, aucun paramètre de filtrage/tri serveur (filtres clients uniquement).
* Mobile First (Citizen, Agent) ; Desktop First (Admin).
* Design System Figma unique ; interdiction de recréer Button/Input/Modal/Card/… .
* Photos : URLs uniquement (pas d'endpoint d'upload backend).
* Ambiguïtés backend actives : n° 1 (historique points), n° 11 (profil) — contournements UI définis (SCR-014, SCR-015) ; à répercuter si résolues côté backend.

---

# Hypothèses

* Le Design System Figma (composants UI) sera fourni par l'UI Designer ; `shared/components` l'implémente ensuite.
* CORS activé côté backend pour l'origine du frontend.
* Le service de stockage des photos est disponible/configurable via l'environnement (ADR-005) — aucun backend d'upload dans le périmètre.
* Les réponses d'erreur exposent un `message` exploitable et un objet `errors` pour les 422 (à vérifier lors du branchement — `docs/01-analysis/api-analysis.md` § 8).
* Leaflet fonctionne sans clé API ; la heatmap utilise le plugin `leaflet.heat`.

---

# Alternatives étudiées

| Alternative | Avantages | Inconvénients | Raison du rejet |
| ----------- | --------- | ------------- | --------------- |
| NgRx (Store) pour l'état global | Écosystème mature, DevTools | Boilerplate important, surdimensionné pour 17 écrans | ADR-001 : Signals suffisent (état principalement local aux features) |
| NgModules classiques | Habitude d'équipe | Contraire à la règle projet, plus verbeux | Règle `PROJECT_RULES/angular-guidelines.md` : Standalone obligatoire |
| Google Maps JavaScript API | Riche en fonctionnalités | Clé API obligatoire, quota payant, poids | ADR-002 : Leaflet open source, léger, plugin heatmap |
| Angular Material | Composants prêts | Style non conforme au Design System Figma, surcharge CSS | Design System unique imposé (`PROJECT_RULES/architecture-principles.md`) |
| Call HTTP direct dans les composants | Rapidité d'écriture | Duplication interceptor/auth, non testable | Règle projet : services dédiés + interceptors obligatoires |

---

# Décisions associées

* ADR-001 — Angular 22 : Standalone Components et Signals comme standard (état, injection, style).
* ADR-002 — Leaflet pour la cartographie (cartes citoyen/agent/admin + heatmap admin).
* ADR-003 — Architecture Feature-Based core/shared/layouts/features.
* ADR-004 — Communication HTTP centralisée (ApiService + AuthInterceptor + ErrorInterceptor).
* ADR-005 — Stockage des photos via un provider externe (upload → URL).
* ADR-006 — Contrat API/UI de gestion des utilisateurs : `prenom` obligatoire + confirmation du mot de passe (filtres liste user).

ADR-001 à ADR-006 : `docs/03-architecture/adr/` (format `TEMPLATES/review/decision-record-template.md`).

---

# Traçabilité

## Business Rules

* BR-AUTH-001 à BR-AUTH-005, BR-SIG-001 à BR-SIG-008, BR-AFF-001/002, BR-INT-001 à BR-INT-003, BR-PTS-001/002, BR-EQP-001 à BR-EQP-003, BR-REF-001, BR-DASH-001, BR-USR-001/002, BR-GAM-001 à BR-GAM-004 (`docs/01-analysis/business-rules.md`)

---

## Endpoints

* API-001 à API-044 (`docs/01-analysis/endpoints.md`) — aucune invention ; consommation directe des routes vérifiées.

---

## Features

* FEAT-001 Signalement citoyen — FEAT-002 Cycle de vie du signalement — FEAT-003 Équipes de collecte — FEAT-004 Points de fidélité — FEAT-005 Administration — FEAT-006 Carte des zones critiques.

---

## Screens

* SCR-001 à SCR-017 (`docs/02-design/screen-specifications/`)

---

## Components

* CMP-001 Carte interactive (Leaflet, heatmap) → `shared/components/map/`
* CMP-002 Formulaire de signalement → `features/citizen/report-create/`
* CMP-003 Fiche signalement (statuts, transitions) → `shared/components/status/` + `features/*/report-details`
* CMP-004 Liste paginée générique → `shared/components/ui/data-list/`
* CMP-005 Badge de points / fidélité → `shared/components/ui/` + `features/citizen/points`

---

# Diagrammes

* Vue d'ensemble : section « Vue d'ensemble » ci-dessus (blocs et flux).
* Navigation et guards : `docs/02-design/navigation.md` (table des routes par espace).
* Parcours utilisateurs : `docs/02-design/user-flows.md` (UF-001 à UF-016).
* Flux de données : section « Flux de données » ci-dessus.
* Organisation des modules : section « Organisation des modules » ci-dessus (arbre `src/`).

---

# Critères d'acceptation

* [ ] L'architecture couvre l'ensemble du périmètre (17 écrans, 44 endpoints, 3 rôles).
* [ ] Les responsabilités sont clairement définies (composants principaux).
* [ ] Les dépendances sont identifiées (faible : Angular + Leaflet + provider photos).
* [ ] Les principes d'architecture du projet sont respectés (Feature-Based, Standalone, Signals, Design System).
* [ ] Les flux de données sont documentés (lecture, écriture, session).
* [ ] Les contraintes sont explicites (Angular 22, mobile/desktop, API fixe, ambiguïtés).
* [ ] Les décisions sont traçables (ADR-001 à ADR-006).
* [ ] Aucun endpoint inventé ; aucun écran implémenté.
* [ ] La documentation est prête pour le Workflow 04 (Development).

---

# Historique

Version : 1.0
Auteur : Frontend Architect
Date : 2026-08-06
Commentaires : Création initiale — Architecture Frontend Angular de ISI-Eco-Report.

---

# Statut

Validé
