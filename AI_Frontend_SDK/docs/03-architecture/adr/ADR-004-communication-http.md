# Architecture Decision Record

## Identifiant

ADR-004

---

## Titre

Communication HTTP centralisée (ApiService + Interceptors)

---

## Statut

* Accepté

---

## Date

Date de la décision : 2026-08-06

---

## Auteur

Nom : Frontend Architect
Rôle : Architecture (Workflow 03)

---

# Résumé

Tout appel API passe par `core/api/ApiService` (client typé, gestion de la pagination `data/links/meta`, conversion des erreurs) et par deux interceptors : `AuthInterceptor` (injection du token Bearer) et `ErrorInterceptor` (normalisation, gestion 401/403/422/hors-ligne).

---

# Contexte

Le backend expose 44 endpoints avec des conventions précises (`docs/01-analysis/api-analysis.md` § 2) : enveloppe paginée `data/links/meta`, erreurs JSON normalisées (401, 403, 404, 422), authentification Bearer. Les règles projet interdisent les appels `HttpClient` depuis les composants et imposent des interceptors centralisés.

---

# Problème

Comment garantir l'unicité des conventions HTTP (header, pagination, erreurs) sans duplication dans les services ?

---

# Objectifs

* injecter le token sur chaque requête protégée ;
* normaliser les erreurs en une structure unique (`ApiError`) ;
* gérer uniformément la session expirée (UF-016) ;
* typer les réponses et la pagination.

---

# Options étudiées

## Appels HttpClient directs dans les composants

### Description

Chaque composant consomme l'API directement.

### Avantages

* rapidité d'écriture immédiate.

### Inconvénients

* duplication du header, des traitements d'erreur et de la pagination ; non testable ; contraire aux règles.

### Pourquoi cette option n'a pas été retenue

Règle projet explicite et maintenabilité.

---

## Couche centralisée (retenue)

### Description

`core/api/ApiService` générique (méthodes `get`/`post`/`put`/`delete`, types, pagination, exceptions typées) + `AuthInterceptor` + `ErrorInterceptor`, consommé par les services de features (AuthService, SignalementService, InterventionService, etc.).

### Avantages

* conventions appliquées en un seul endroit ; services fins ; testable.

### Inconvénients

* légère abstraction à connaître par les développeurs.

### Pourquoi cette option a été retenue

Aligne les règles projet avec les conventions réelles de l'API.

---

# Décision retenue

Les services métier utilisent exclusivement `ApiService` ; `AuthInterceptor` ajoute `Authorization: Bearer <token>` ; `ErrorInterceptor` transforme chaque réponse en erreur en `ApiError { status, message, errors }` et applique les traitements globaux : 401 → purge de session + redirection `/auth/login` (UF-016), 0 → état hors ligne, autres codes → message générique ou métier conservé. Les composants restent simples (aucune logique d'erreur complexe).

---

# Justification

C'est la traduction directe des règles du projet (`PROJECT_RULES/angular-guidelines.md` : HTTP, gestion des erreurs) et des conventions de l'API vérifiées dans la phase d'analyse.

---

# Conséquences

## Positives

* unicité des traitements (header, 401, 422 champ par champ, hors ligne) ;
* services testables via mocks d'`ApiService`.

---

## Négatives

* abstraction supplémentaire au-dessus de `HttpClient`.

---

## Risques

* Messages d'erreur backend non normalisés — contrôlé au branchement contre `docs/01-analysis/api-analysis.md` (§ 8, ambiguïtés) ; le champ `message` est exposé tel quel.

---

# Impacts

## Backend

Aucun.

---

## Frontend

`core/api/` (ApiService, ApiError, pagination), `core/interceptors/` (AuthInterceptor, ErrorInterceptor), `core/auth/` (purge de session sur 401).

---

## UX

Affichage cohérent des erreurs (bannières, champs, états) conformément aux specs écrans.

---

## Documentation

* `docs/03-architecture/frontend-architecture.md` (ARCH-002)
* `docs/01-analysis/api-analysis.md` (conventions consommées)

---

# Traçabilité

## Business Rules

* BR-AUTH-003 (déconnexion/révocations), BR-USR-002 (session)

---

## Endpoints

* API-001 à API-044 (toutes les routes protégées via Bearer)

---

## Screens

* Tous (SCR-001 à SCR-017)

---

## Components

* CMP-001 à CMP-005 (états de chargement/erreur)

---

## Features

* FEAT-001 à FEAT-006

---

## Proposals

Sans objet.

---

## Reviews

Sans objet.

---

# Plan de migration

Sans objet (projet neuf).

---

# Critères de validation

* Aucun `HttpClient` importé hors de `core/api` et `core/interceptors`.
* Un 401 purge la session et redirige (UF-016) ; un 422 alimente les champs de formulaire.
* La pagination `data/links/meta` est mappée une seule fois dans `ApiService`.

---

# Références

Documentation : `PROJECT_RULES/angular-guidelines.md`, `docs/01-analysis/api-analysis.md`, `docs/02-design/navigation.md`, `docs/03-architecture/frontend-architecture.md`.

Maquette Figma : sans objet.

Issues : sans objet.

Liens utiles : sans objet.

---

# Historique

Version : 1.0
Auteur : Frontend Architect
Date : 2026-08-06
Commentaires : Création initiale.
