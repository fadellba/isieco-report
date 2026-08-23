# Architecture Decision Record

## Identifiant

ADR-001

---

## Titre

Angular 22 — Standalone Components et Signals comme standard

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

Le frontend utilise exclusivement les Standalone Components d'Angular 22 et les Signals comme solution par défaut de gestion d'état ; RxJS est réservé à HTTP, streams et interopérabilité.

---

# Contexte

Le projet impose une architecture moderne (`PROJECT_RULES/angular-guidelines.md`) : Standalone Components obligatoires, Signals par défaut. Le backend expose une API stateless (Sanctum) : la gestion de session (token, utilisateur courant) doit être centralisée dans un service avec état réactif. L'application compte 17 écrans — un store global de type NgRx serait surdimensionné.

---

# Problème

Comment gérer l'état (session, données d'écran, listes) sans introduire de complexité inutile, tout en respectant Angular 22 et la règle projet ?

---

# Objectifs

* respecter les conventions du SDK (Standalone, Signals) ;
* maintenir une architecture simple et maintenable ;
* centraliser la session (token + utilisateur courant) ;
* minimiser le boilerplate.

---

# Options étudiées

## NgRx (Store + Effects + Entity)

### Description

Bibliothèque de gestion d'état global avec actions/réducers/effects.

### Avantages

* écosystème mature ; DevTools ; testabilité.

### Inconvénients

* boilerplate important ; courbe d'apprentissage ; surdimensionné pour 17 écrans.

### Pourquoi cette option n'a pas été retenue

La majorité de l'état est locale aux écrans (formulaires, listes). Un store global n'apporte rien pour la session seule, couverte par un simple service à signaux.

---

## Signaux dans des services injectables

### Description

État réactif via `signal()`/`computed()` dans des services dédiés (`SessionService`, services de features) ; RxJS utilisé uniquement par `HttpClient`.

### Avantages

* natif Angular 22 ; peu de code ; typé ; performant (OnPush).

### Inconvénients

* pas de DevTools dédiés (débogage via inspecteur) ; écosystème d'extensions plus jeune.

### Pourquoi cette option a été retenue

La décision est cohérente avec la règle projet, suffisante pour l'échelle de l'application et recommandée par Angular 22.

---

# Décision retenue

Utiliser les Standalone Components pour tous les composants, directives et pipes ; l'état réactif est géré par des Signals (services et composants) ; RxJS reste utilisé par `HttpClient` et pour les éventuels streams (WebSocket, interop). Le token est persisté dans `TokenStorage` (localStorage) et l'état de session est exposé par `SessionService` via signaux (`user`, `isAuthenticated`).

---

# Justification

C'est l'approche native et recommandée d'Angular 22, imposée par les règles du projet, et suffisante pour l'échelle (17 écrans, session simple). Elle réduit le boilerplate et améliore la maintenabilité.

---

# Conséquences

## Positives

* code plus court et lisible ;
* changement de détection OnPush naturel ;
* session centralisée et réactive.

---

## Négatives

* pas d'outillage DevTools de type Redux ;
* dépendance à l'API Signals (stable dès Angular 19+).

---

## Risques

* Sécurité du token en localStorage (XSS) — atténué par les bonnes pratiques Angular (échappement automatique du DOM, CSP) ; compromis documenté.

---

# Impacts

## Backend

Aucun.

---

## Frontend

Structure `core/auth/` (AuthService, SessionService, TokenStorage), `core/api/`, composants Standalone partout.

---

## UX

Aucun impact direct.

---

## Documentation

* `docs/03-architecture/frontend-architecture.md` (ARCH-002)
* `PROJECT_RULES/angular-guidelines.md` (source)

---

# Traçabilité

## Business Rules

* BR-AUTH-001 à BR-AUTH-005

---

## Endpoints

* API-001 (POST /api/auth/login), API-002 (POST /api/auth/register), API-004 (POST /api/auth/logout), API-005 (GET /api/user)

---

## Screens

* SCR-001, SCR-002, SCR-014, SCR-016, SCR-017

---

## Components

* CMP-001 à CMP-005 (implémentés en Standalone)

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

* Aucun NgModule créé dans le code de l'application.
* Tous les composants déclarent `standalone: true` (défaut Angular 22).
* Aucun `BehaviorSubject` de remplacement de signal sans justification.

---

# Références

Documentation : `PROJECT_RULES/angular-guidelines.md`, `PROJECT_RULES/architecture-principles.md` (§ 5), `docs/03-architecture/frontend-architecture.md`.

Maquette Figma : sans objet.

Issues : sans objet.

Liens utiles : documentation officielle Angular — Signals.

---

# Historique

Version : 1.0
Auteur : Frontend Architect
Date : 2026-08-06
Commentaires : Création initiale.
