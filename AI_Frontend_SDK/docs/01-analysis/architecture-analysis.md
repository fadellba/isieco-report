# Architecture Document

## Identifiant

ARCH-001

## Titre

Architecture Backend Laravel — API ISI-Eco-Report

## Version

1.0

## Auteur

Nom : Backend Analyst
Rôle : Analyse du backend (Workflow 01 — Analysis)
Date : 2026-08-06

---

# Objectif

Documenter l'architecture réelle du backend Laravel de ISI-Eco-Report, telle qu'observée dans le code source, afin de :

* fournir une référence factuelle aux phases suivantes (Design, Development) ;
* décrire les couches, le flux des données et les mécanismes transverses (authentification, autorisation, transactions, erreurs) ;
* servir de socle à l'architecture frontend Angular (ARCH-002, Frontend Architect — `docs/03-architecture/frontend-architecture.md`).

Périmètre : analyse d'existant, aucune décision de refonte backend.

---

# Périmètre

Domaines concernés :

* [x] Backend
* [x] API
* [x] Authentification
* [x] Base de données
* [ ] Frontend
* [ ] Infrastructure
* [ ] Intégration
* [ ] Design System
* [ ] Déploiement
* [ ] Autre

---

# Contexte

Le backend est une application Laravel 12 exposant une API JSON pour l'application « ISI-Eco-Report » (signalement de dépôts sauvages de déchets, gestion des brigades de collecte, interventions et points de fidélité citoyens).

Contraintes observées :

* API stateless JSON, préfixe `/api` ;
* authentification par tokens Bearer (Laravel Sanctum) ;
* gestion des rôles par Spatie Permission (`admin`, `agent`, `citizen`) ;
* base de données MySQL (migrations Laravel, schéma relationnel) ;
* documentation OpenAPI embarquée sous forme d'attributs dans `app/Http/Controllers/Api/OpenApi.php` (titre « ISI-Eco-Report API », version 1.0.0) ;
* une seule page web classique (`routes/web.php` minimal, route health `/up`) ;
* URL frontend configurée via `config('app.frontend_url')` (défaut `http://localhost:4200`), utilisée pour construire les liens de réinitialisation de mot de passe.

---

# Principes d'architecture

* Backend = source de vérité métier : toutes les règles (transitions de statut, éligibilité, points) sont validées côté serveur.
* Pattern Repository : accès données centralisé derrière des interfaces (`Repositories/Contracts`), implémentations Eloquent, bindings dans `AppServiceProvider`.
* Pattern Service : logique métier orchestrée dans des Services (injection de dépendances, classes `readonly` en PHP 8.4).
* DTO pour les entrées : chaque Request produit un DTO typé (valeurs validées) consommé par les Services.
* Policy pour l'autorisation : contrôle d'accès par modèle via `Gate::policy`, complété par un middleware `role` Spatie sur les routes sensibles.
* Transactions explicites (`DB::transaction`) sur les flux multi-écritures.
* API Resources pour les sorties : sérialisation contrôlée des réponses.
* Exceptions métier rendues en JSON avec des statuts HTTP explicites (401, 422).

---

# Vue d'ensemble

```
Client (Angular à venir)
        │
        ▼
API Laravel 12  ── routes/api.php ── middleware: auth:sanctum, role:admin
        │
        ├── Controllers  ── FormRequests (validation) ── DTO
        │         │
        │         ├── authorize() → Policies (Gate)
        │         ▼
        ├── Services (règles métier, transactions)
        │         ▼
        ├── Repositories (Eloquent)
        │         ▼
        └── Base de données (MySQL)
        │
        ▼
API Resources (sérialisation) ── réponses JSON
```

Blocs principaux :

* API REST : 44 endpoints (4 publics, 40 protégés), voir `endpoints.md`.
* Authentification : Sanctum (tokens `auth_token`) + flux mot de passe (broker `Password`).
* Autorisation : Policies par modèle + middleware `role` (Spatie) pour `users` et `dashboard/heatmap`.
* Données : 12 tables métier + tables Sanctum/Spatie (voir `api-analysis.md`).
* Exceptions : rendues dans `bootstrap/app.php` pour les erreurs métier.

---

# Composants principaux

| Composant | Responsabilité |
| --------- | -------------- |
| `routes/api.php` | Déclaration des routes (5 groupes : auth public, auth protégé, ressources, dashboard, historique-points) |
| Controllers API (`app/Http/Controllers/Api/`) | Point d'entrée HTTP : `authorize()` (policies), appel des Services, construction des Resources |
| FormRequests (`app/Http/Requests/`) | Validation des entrées + fabrication des DTO (`toDTO()`) |
| DTOs (`app/DTOs/`) | Structures typées (lecture seule) transportant les données validées |
| Services (`app/Services/`) | Règles métier, transactions, orchestrations (Auth, User, Signalement, Affectation, Intervention, Equipe, Zone, TypeDechet, HistoriquePoint, Dashboard) |
| Repositories (`app/Repositories/`) | Accès données : `Contracts/` (interfaces) + `Eloquent/` (implémentations), `BaseRepository` (paginate, findOrFail, CRUD) |
| Policies (`app/Policies/`) | Autorisations par modèle (Signalement, Affectation, Intervention, Equipe, Zone, TypeDechet, User, HistoriquePoint) |
| API Resources (`app/Http/Resources/`) | Sérialisation des modèles (Auth, User, Signalement, Affectation, Intervention, Equipe, Zone, TypeDechet, HistoriquePoint, Heatmap) |
| Enums (`app/Enums/`) | Domaines typés : rôles, statuts, priorités, dangerosité — porteurs des règles de transitions (RG15/RG16) |
| Exceptions (`app/Exceptions/`) | Exceptions métier (Auth + Business) rendues en JSON |
| `AppServiceProvider` | Bindings Repository→Interface, Policies (Gate), URL de reset personnalisée |
| `bootstrap/app.php` | Aliases middleware (role/permission), rendu JSON des exceptions |
| `OpenApi.php` | Spécification OpenAPI par attributs (source documentaire) |

---

# Flux de données

Requête HTTP

↓

Middleware : `auth:sanctum` (token) puis éventuellement `role:admin`

↓

Controller (`authorize()` → Policy)

↓

FormRequest (validation) → DTO

↓

Service (règles métier, `DB::transaction`)

↓

Repository (Eloquent)

↓

Base de données

↓

Résultat chargé (relations) → API Resource

↓

Réponse JSON

---

# Organisation des modules

```
app/
├── Http/
│   ├── Controllers/Api/        → 10 controllers + OpenApi
│   ├── Requests/               → 14 FormRequests (par ressource)
│   └── Resources/              → 10 API Resources
├── DTOs/                       → 15 DTO (par flux : Auth, User, Signalement, ...)
├── Services/                   → 10 Services
├── Repositories/
│   ├── Contracts/              → interfaces
│   └── Eloquent/               → implémentations + BaseRepository
├── Policies/                   → 8 Policies
├── Models/                     → 11 modèles Eloquent
├── Enums/                      → 6 enums métier
└── Exceptions/
    ├── Auth/                   → 5 exceptions
    └── Business/               → 3 exceptions
routes/
├── api.php                     → routes API
├── web.php                     → page minimale
└── console.php
database/
├── migrations/                 → 17 migrations
└── seeders/                    → RoleSeeder, DatabaseSeeder
tests/
├── Feature/                    → tests API (Auth, Signalement, Intervention, ...)
└── Unit/                       → tests unitaires
```

---

# Dépendances

| Dépendance | Usage |
| ---------- | ----- |
| Laravel 12 | Framework |
| laravel/sanctum | Tokens d'API personnels (`auth_token`) |
| spatie/laravel-permission | Rôles `admin` / `agent` / `citizen` + middlewares `role`, `permission`, `role_or_permission` |
| illuminate/database (Eloquent) | ORM, migrations, transactions |
| darkaonline/l5-swagger (attributs) | Génération OpenAPI (annotations) |
| PHP 8.4 | `final readonly class`, `enum`, `declare(strict_types=1)` |

---

# Communication

Frontend ↔ API : HTTP JSON (Bearer token).

API ↔ Base de données : Eloquent.

API ↔ Email : broker `Password` + notification `ResetPassword` (URL frontend personnalisée).

Aucun service externe supplémentaire (pas de queue, pas de cache métier).

---

# Sécurité

* Authentification : Sanctum, token par en-tête `Authorization: Bearer` ; chaque connexion émet un nouveau token ; la déconnexion révoque le token courant.
* Autorisation : double niveau — middleware `role` (routes `users`, `dashboard/heatmap`) + Policies (contrôles fins par modèle et par statut).
* Validation serveur : toutes les entrées passent par des FormRequests (règles typées, enums, `exists`).
* Confidentialité : filtrage des listes de signalements pour les citoyens ; la heatmap n'expose aucune donnée personnelle.
* Gestion des erreurs : réponses JSON normalisées (401, 403, 404, 422) ; messages d'erreurs d'authentification non discriminants (pas d'énumération d'emails).
* Points d'attention relevés : mot de passe (hash Bcrypt par défaut Laravel), CORS non observé dans l'analyse (à vérifier au moment du branchement frontend), token brut retourné uniquement à la connexion/inscription.

---

# Performance

Mécanismes observés :

* Pagination serveur systématique (`paginate(15)`) sur tous les `index` — pas de chargement complet.
* `Eager loading` ciblé via `load([...])` sur les détails (relations chargées à la demande).
* Agrégation SQL (heatmap) : `AVG`, `COUNT`, `GROUP BY`, tri côté base — pas de calcul en PHP.
* Chargement des relations en liste non effectué (resources minimalistes en liste).

Non utilisé : cache, queue, compression explicite.

---

# Gestion des erreurs

* Capture : rendu global configuré dans `bootstrap/app.php` via `withExceptions`.
* Transformation : `InvalidCredentialsException` → 401 ; `InvalidTransitionException` et `SignalementNotValidatedException` → 422 ; erreurs de validation FormRequest → 422 avec `errors` ; refus de policy → 403 (framework).
* Affichage : JSON uniquement (les rendus vérifient `$request->expectsJson()`).
* Limite observée : les exceptions `PasswordResetTokenInvalidException`, `PasswordResetTokenExpiredException`, `PasswordResetLinkException`, `EmailAlreadyExistsException` existent mais ne sont pas levées par les flux actuels.

---

# Contraintes

* API JSON seule (aucune rendu Blade des ressources métier).
* Laravel 12 + Sanctum + Spatie Permission.
* PHP 8.4 (types stricts, readonly, enums).
* MySQL (contraintes d'unicité composites dans les pivots : RG8, RG22, RG23).
* `frontend_url` configurable (défaut `http://localhost:4200` — port Angular par défaut).
* Pagination fixe à 15 éléments ; aucun paramètre de filtrage/tri exposé par l'API.

---

# Hypothèses

* Le frontend cible est Angular 22 (défini dans `RELEASE/COMPATIBILITY.md` du SDK) ; le backend n'impose aucune contrainte frontend au-delà de l'URL de reset et des tokens Bearer.
* Les photos sont stockées sous forme d'URLs : le stockage/upload des fichiers est une responsabilité frontend ou d'un service externe (l'API n'accepte que des URLs).
* Le schéma de base et les règles de transition (RG15/RG16) sont stables pour la phase Design.

---

# Alternatives étudiées

Architecture existante fournie par le projet — aucune alternative n'a été étudiée au cours de cette phase d'analyse (documentation d'un existant).

---

# Décisions associées

Aucune ADR émise dans cette phase. Les ambiguïtés relevées sont listées dans `api-analysis.md` (section « Ambiguïtés et décisions à trancher ») pour les décideurs du projet.

---

# Traçabilité

## Business Rules

* BR-AUTH-001 à BR-AUTH-005, BR-SIG-001 à BR-SIG-008, BR-AFF-001/002, BR-INT-001 à BR-INT-003, BR-PTS-001/002, BR-EQP-001 à BR-EQP-003, BR-REF-001, BR-DASH-001, BR-USR-001/002 (détaillées dans `business-rules.md`)

## Endpoints

* API-001 à API-044 (détaillés dans `endpoints.md`)

## Features

* FEAT-001 Signalement citoyen (géolocalisation, déchets, photos)
* FEAT-002 Suivi et cycle de vie du signalement (validation, priorisation, affectation, intervention, clôture)
* FEAT-003 Gestion des équipes de collecte
* FEAT-004 Points de fidélité citoyens
* FEAT-005 Administration (utilisateurs, zones, types de déchets)
* FEAT-006 Carte des zones critiques (heatmap admin)

## Screens

Liste finale (phase Design — `docs/02-design/`) — voir `docs/02-design/screen-specifications/` :

* SCR-001 Connexion (`docs/02-design/screen-specifications/auth-login.md`)
* SCR-002 Inscription (`docs/02-design/screen-specifications/auth-register.md`)
* SCR-003 Carte citoyen — mes signalements (`docs/02-design/screen-specifications/map-citizen.md`)
* SCR-004 Création de signalement (`docs/02-design/screen-specifications/report-create.md`)
* SCR-005 Liste de mes signalements (`docs/02-design/screen-specifications/report-list.md`)
* SCR-006 Détail d'un signalement (Citizen / Agent / Admin) (`docs/02-design/screen-specifications/report-details.md`)
* SCR-007 Dashboard admin — carte des zones critiques (`docs/02-design/screen-specifications/dashboard.md`)
* SCR-008 File de validation et priorisation (Admin) (`docs/02-design/screen-specifications/validation-queue.md`)
* SCR-009 Affectation des signalements (Admin) (`docs/02-design/screen-specifications/affectation.md`)
* SCR-010 Interventions (Agent / Admin) (`docs/02-design/screen-specifications/interventions.md`)
* SCR-011 Gestion des équipes (Admin) (`docs/02-design/screen-specifications/equipes.md`)
* SCR-012 Gestion des référentiels : zones et types de déchets (Admin) (`docs/02-design/screen-specifications/referentiels.md`)
* SCR-013 Gestion des utilisateurs (Admin) (`docs/02-design/screen-specifications/users.md`)
* SCR-014 Profil utilisateur (tous rôles) (`docs/02-design/screen-specifications/profile.md`)
* SCR-015 Points citoyen — solde, historique, classement (`docs/02-design/screen-specifications/points.md`)
* SCR-016 Mot de passe oublié (`docs/02-design/screen-specifications/auth-forgot-password.md`)
* SCR-017 Réinitialisation du mot de passe (`docs/02-design/screen-specifications/auth-reset-password.md`)

## Components

* CMP-001 Carte interactive (Leaflet/équivalent, heatmap)
* CMP-002 Formulaire de signalement
* CMP-003 Fiche signalement (statuts, transitions)
* CMP-004 Liste paginée générique
* CMP-005 Badge de points / fidélité

---

# Diagrammes

* Diagramme de flux : section « Flux de données » ci-dessus.
* Diagramme de composants : section « Vue d'ensemble ».
* Schéma de données : `api-analysis.md` (section « Modèle de données »).

---

# Critères d'acceptation

* [x] L'architecture couvre l'ensemble du périmètre (backend complet observé).
* [x] Les responsabilités sont clairement définies (Controller / Service / Repository / Policy / Resource / DTO).
* [x] Les dépendances sont identifiées.
* [x] Les principes d'architecture sont respectés (source de vérité serveur, pattern Repository, transactions).
* [x] Les flux de données sont documentés.
* [x] Les contraintes sont explicites.
* [x] Les décisions sont traçables (ambiguïtés listées pour décision).

---

# Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06 — Commentaires : Analyse d'existant, phase 01.

---

# Statut

Validé (analyse d'existant)
