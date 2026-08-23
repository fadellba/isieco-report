# Architecture Decision Record

## Identifiant

ADR-006

---

## Titre

Contrat API/UI de gestion des utilisateurs — `prenom` obligatoire et confirmation du mot de passe

---

## Statut

* Accepté

---

## Date

Date de la décision : 2026-08-10

---

## Auteur

Nom : QA Reviewer
Rôle : Lead Software Quality Engineer (openCode)

---

# Résumé

Le payload de création et de modification utilisateur (`POST`/`PUT /api/users`) transporte désormais systématiquement `prenom` (obligatoire, cohérent avec le backend) et `password_confirmation` (obligatoire à la création, optionnelle à la modification quand aucun nouveau mot de passe n'est saisi). Le frontend envoie et valide ce contrat ; le backend le persiste et le restitue.

---

# Contexte

La revue REV-001 a relevé une désynchronisation du contrat : `StoreUserRequest` imposait `prenom` et `password` (with `confirmed`) alors que le front n'envoyait que `nom`, `email`, `password`, `role`. En conséquence, la création d'un compte via l'UI admin échouait systématiquement en 422 (BUG-ADMIN-001), et aucun champ de confirmation ne permettait de satisfaire la règle `confirmed`.

---

# Problème

Comment réconcilier le contrat de création/modification utilisateur entre le front (Angular) et l'API (Laravel) pour : (1) garantir « prénom + nom » du modèle métier, (2) imposer une confirmation du mot de passe à la création, (3) éviter de bloquer la modification quand aucun nouveau mot de passe n'est saisi ?

---

# Objectifs

* rendre la création de compte fonctionnelle via l'UI admin ;
* conserver le prénom obligatoire au niveau de l'API (règle métier existante) ;
* garantir la concordance du mot de passe et de sa confirmation ;
* maintenir une modification optionnelle du mot de passe.

---

# Options étudiées

## Option A — Repasser à `nom` seul (sans prénom)

### Description

Retirer l'exigence `prenom` côté API et n'utiliser qu'un nom complet.

### Avantages

* payload minimal ; ZÉRO changement de validation.

### Inconvénients

* perd la segmentation `nom` / `prenom` déjà présente en base, dans le modèle (`User::$fillable`, access writer `name`, `nom_complet`) et dans les factory/test ;
* casse le format d'affichage « Prénom Nom ».

### Pourquoi cette option

Elle respecte l'existant : le backend a toujours exigé `prenom` ; la base de données et le domaine logiciel reposent sur cette séparation. Revenir à « nom seul » imposerait une migration de données et de code plus risquée sans gain identifié.

---

## Option B — Aligner le front sur le backend existant (retenue)

### Description

Faire évoluer le front (formulaire + payload et validation) pour envoyer `prenom` et `password_confirmation` conformément aux règles déjà en place côté API.

### Avantages

- aucun changement de contrat API (contrat conservé) ;
- la validation `confirmed` du backend est satisfaite à la création ;
- la modification reste possible sans nouveau mot de passe (champs `password`/`password_confirmation` facultatifs, validés par `UpdateUserRequest` en « sometimes ») ;
- aligné sur SCR-013 (filtre nom/email/rôle) et sur le domaine métier (personne physique).

### Inconvénients

- modification du formulaire et des payloads du front ;
- coût de tests (validateur de concordance `passwordMismatch`).

### Pourquoi cette option a été retenue

Elle est la moins perturbatrice pour le backend, respecte la règle métier, et satisfait l'UI attendue (mot de passe + confirmation) en cohérence avec les conventions du SDK.

---

# Décision retenue

Conserver le contrat backend tel quel (`nom`, `prenom`, `email`, `password` + `password_confirmation`, `role`) et faire évoluer l'UI (`users-page.component.ts`) ainsi que les payloads `CreateUserPayload`/`UpdateUserPayload` (TypeScript) pour :
- envoyer `prenom` (obligatoire) à la création et à la modification ;
- envoyer `password_confirmation` à la création (et toujours quand un nouveau mot de passe est fourni en modification) ;
- afficher un champ de confirmation, contrôlé par un validateur au niveau du formulaire (`passwordMismatch`) ;
- exiger un mot de passe en mode création (pas de compte sans mot de passe).

En complément, l'implémentation des filtres nom/email/rôle côté backend (`UserRepository::paginateWithFilters()`, `UserController::index()`) et l'ajout du champ email dans l'UI ont été entérinés (conformes à la spécification SCR-013).

---

# Justification

Le backend est source de vérité du domaine. L'UI doit se conformer au contrat API (et non l'inverse) dès lors que ce contrat reflète une règle métier valide. Cette décision rétablit la création de comptes (erreur 422 disparue), fiabilise la saisie du mot de passe, et limite la superficie du diff au front + aux tests.

---

# Conséquences

## Positives

- création et modification de comptes opérationnelles dans l'UI (contrat API/UI réconcilié) ;
- protection contre les fautes de frappe de mot de passe à la création ;
- champ `prenom` cohérent de bout en bout (print, table, formulaire).

---

## Négatives

- complexité du formulaire augmentée d'un champ (confirmation) ;
- deux sources de validation (TS + Laravel) à maintenir en cohérence.

---

## Risques

- Si le backend évolue vers `nom` seul (hypothèse non priorisée), il faudra réduire le formulaire ; le risque est faible et documenté ici.

---

# Impacts

## Backend

Aucun changement de contrat ; meilleure implémentation des filtres (nom/email/rôle) ajoutée et testée.

---

## Frontend

`UserService` (payloads), `UsersPageComponent` (formulaire + validation + filtres), tests unitaires correspondants (création/modification/filtres/concordance).

---

## UX

Saisie de mot de passe sécurisée à la création ; la modification propose un mot de passe optionnel en concordance.

---

## Documentation

- Rapport de revue REV-001 (BUG-ADMIN-001, -002, -004) — dette du module admin.

---

# Traçabilité

## Business Rules

- BR-ADMIN-* (gestion des comptes agents/administrateurs) — module Admin.

---

## Endpoints

- API POST `/api/users`, PUT `/api/users/{id}` , GET `/api/users`.

---

## Screens

- SCR-013 (Utilisateurs), SCR-011 (Équipes — sélection d'agents).

---

## Components

- `UsersPageComponent`, `EquipesPageComponent` (source).

---

## Features

- FEAT-ADMIN-USER (gestion des comptes), FEAT-ADMIN-EQUIPE.

---

## Proposals

« Sans objet »

---

## Reviews

- REV-001 (2026-08-10) — anomalies BUG-ADMIN-001 à 004, corrigées (voir `docs/05-review/quality-review.md`).

---

# Plan de migration

Aucun (corrections déjà livrées avec REV-001).

---

# Critères de validation

- `POST /api/users` réussit avec `prenom` + `password_confirmation` conformes (tests).
- `GET /api/users?nom=&email=&role=` filtre correctement (tests).
- Formulaire : l'erreur `passwordMismatch` n'apparaît que si le mot de passe et la confirmation diffèrent.
- La création exige un `password` non vide.
- La modification sans nouveau mot de passe ne renvoie ni `password` ni `password_confirmation` au backend (payloads optionnels).

---

# Références

Documentation : `docs/05-review/quality-review.md` (REV-001).

Maquette Figma : sans objet.

Issues : sans objet.

Liens utiles : modèle de validation Laravel (`confirmed`) et la documentation Angular Forms (validateurs).

---

# Historique

Version : 1.0
Auteur : QA Reviewer
Date : 2026-08-10
Commentaires : Création initiale — suite à la revue REV-001 et à la réconciliation du contrat utilisateur.