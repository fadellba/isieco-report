# Architecture Decision Record

## Identifiant

ADR-003

---

## Titre

Architecture Feature-Based (core / shared / layouts / features)

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

L'application est organisée en quatre zones : `core/` (technique, sans métier), `shared/` (réutilisable, sans métier), `layouts/` (structures d'écran), `features/` (fonctionnalités métier indépendantes). Chaque écran appartient à une seule feature, chargée en lazy.

---

# Contexte

Le SDK impose une architecture Feature-Based (`PROJECT_RULES/architecture-principles.md` § 3) avec interdiction de couplage direct entre fonctionnalités. Les 17 écrans (SCR-001 à SCR-017) se répartissent en espaces : Auth, Citizen, Agent, Admin, Profil.

---

# Problème

Comment organiser le code pour garantir l'isolation des espaces (citizen/agent/admin), la réutilisation et l'évolutivité ?

---

# Objectifs

* séparer le technique (core) du réutilisable (shared) du métier (features) ;
* éviter les couplages entre features ;
* permettre le lazy loading par espace ;
* respecter les règles du SDK.

---

# Options étudiées

## Structure plate par type (components/, services/, models/ à la racine)

### Description

Organisation par type technique, sans notion de feature.

### Avantages

* simplicité initiale.

### Inconvénients

* couplages implicites ; le partage croise les espaces ; évolutions difficiles.

### Pourquoi cette option n'a pas été retenue

Contraire à la règle projet et source de couplage.

---

## Structure Feature-Based (retenue)

### Description

`core/` (auth, guards, interceptors, api, config, modèles), `shared/` (composants UI, pipes, directives, utils), `layouts/` (shells par espace), `features/` (auth, citizen, agent, admin, profile).

### Avantages

* responsabilités explicites ; isolation ; lazy loading par feature ; alignée sur la règle projet.

### Inconvénients

* un peu plus de structure au départ (réflexion sur l'emplacement de chaque élément).

### Pourquoi cette option a été retenue

Imposée par les règles du projet et adaptée aux trois espaces métier distincts.

---

# Décision retenue

Structure `src/app/` en quatre zones : `core/` (technique : authentification, session, guards, interceptors, client API, configuration, modèles globaux), `shared/` (composants UI du Design System, composants réutilisables, pipes, directives, utilitaires), `layouts/` (auth-layout, citizen-layout, agent-layout, admin-layout), `features/` (auth, citizen, agent, admin, profile). Les features ne dépendent que de `core` et `shared` — jamais entre elles.

---

# Justification

C'est la structure imposée par le SDK, et elle correspond naturellement aux trois espaces de l'application (citoyen mobile-first, agent mobile-first, admin desktop-first) plus les écrans transverses (auth, profil).

---

# Conséquences

## Positives

* isolation des espaces (règles d'affichage par rôle) ;
* lazy loading par feature ;
* réutilisation sans duplication (shared).

---

## Négatives

* effort de placement initial de chaque artefact ;
* les composants réellement partagés doivent être promus dans `shared/` explicitement.

---

## Risques

* Dérive : promouvoir dans `shared/` du code métier — contrôlé en revue (Workflow 05) via la checklist.

---

# Impacts

## Backend

Aucun.

---

## Frontend

Arborescence `src/app/` définie dans ARCH-002 (section « Organisation des modules ») ; chaque feature contient `pages/`, `components/`, `services/`, `models/`, `routes.ts`.

---

## UX

Aucun impact direct ; les layouts par espace portent les patterns responsive (Bottom Navigation citizen, sidebar admin).

---

## Documentation

* `docs/03-architecture/frontend-architecture.md` (ARCH-002)
* `PROJECT_RULES/architecture-principles.md` (source)

---

# Traçabilité

## Business Rules

* Toutes (BR-AUTH-*, BR-SIG-*, BR-AFF-*, BR-INT-*, BR-PTS-*, BR-EQP-*, BR-REF-*, BR-DASH-*, BR-USR-*, BR-GAM-*)

---

## Endpoints

* API-001 à API-044 (consommés par les services des features concernées)

---

## Screens

* SCR-001 à SCR-017

---

## Components

* CMP-001 à CMP-005 (shared/features)

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

* Aucun import entre deux dossiers de features.
* Chaque écran est localisé dans la feature de son espace.
* Les règles `core` sans métier et `shared` sans métier sont respectées.

---

# Références

Documentation : `PROJECT_RULES/architecture-principles.md`, `PROJECT_RULES/angular-guidelines.md`, `docs/03-architecture/frontend-architecture.md`.

Maquette Figma : sans objet.

Issues : sans objet.

Liens utiles : sans objet.

---

# Historique

Version : 1.0
Auteur : Frontend Architect
Date : 2026-08-06
Commentaires : Création initiale.
