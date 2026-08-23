# Architecture Decision Record

## Identifiant

ADR-005

---

## Titre

Stockage des photos via un provider externe (upload → URL)

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

Les photos des signalements et interventions sont uploadées vers un service de stockage externe via une interface `StorageProvider` (`core/storage/`) ; seules les URLs résultantes sont envoyées à l'API Laravel (champs `photos`), conformément au contrat backend.

---

# Contexte

Le backend n'expose aucun endpoint d'upload : les champs `photos` (signalements, interventions) n'acceptent que des URLs (recommandation `docs/01-analysis/api-analysis.md` § 9.6). Le cahier des charges exige des photos pour les signalements (SCR-004, SCR-010). La stratégie de stockage est donc une responsabilité frontend ou d'un service tiers.

---

# Problème

Où stocker les photos, et comment garantir que le frontend produit des URLs stables et pérennes acceptées par l'API ?

---

# Objectifs

* produire des URLs publiques et durables pour l'API ;
* garder le flux simple (selection → upload → URL) dans les formulaires ;
* éviter de surcharger le bundle et les requêtes (dimensions limitées côté client).

---

# Options étudiées

## Upload vers le backend Laravel (nouvel endpoint)

### Description

Ajouter un endpoint d'upload côté Laravel (`POST /api/uploads`).

### Avantages

* stockage centralisé ; contrôle admin.

### Inconvénients

* hors périmètre API existant (44 endpoints vérifiés) ; implique une évolution backend (hors Workflow 03).

### Pourquoi cette option n'a pas été retenue

Le SDK interdit d'inventer un endpoint ; le backend doit être étendu par son propre processus. Alternative conservée : si le backend livre un jour un endpoint d'upload, `StorageProvider` l'implémentera sans toucher aux écrans.

---

## Base64 dans les payloads

### Description

Envoyer les photos encodées en base64 dans le JSON.

### Avantages

* aucun stockage externe.

### Inconvénients

* payloads énormes (env. +33 %) ; non conforme à la contrainte « URLs uniquement ».

### Pourquoi cette option n'a pas été retenue

Contraire au contrat de l'API et médiocre pour les performances.

---

## Provider de stockage externe via interface (retenue)

### Description

Interface `StorageProvider` (`core/storage/`) avec méthode `upload(file): Promise<string>` retournant l'URL ; implémentation configurable par environnement (bucket S3 compatible, CDN, etc.). Les écrans appellent `PhotoUploader` (shared) qui orchestre upload → URLs.

### Avantages

* conforme au contrat API ; URLs stables ; fournisseur interchangeable sans toucher aux écrans ; préparation à un futur endpoint backend.

### Inconvénients

* dépendance à un service externe (coût/configuration) ; URLs doivent rester publiques.

### Pourquoi cette option a été retenue

Unique option conforme au contrat backend existant, avec flexibilité maximale.

---

# Décision retenue

Créer `core/storage/StorageProvider` (interface + fabrique par environnement) et le composant `PhotoUploader` dans `shared/` (sélection, prévisualisation, limites de taille/format, progression). Les formulaires (SCR-004, SCR-010) envoient uniquement les URLs obtenues. Limitation client : images jpg/png, ~2 Mo, compression avant upload.

---

# Justification

Elle respecte le contrat API réel (URLs uniquement), évite toute invention d'endpoint, et isole le fournisseur de stockage derrière une interface.

---

# Conséquences

## Positives

* conformité API garantie ;
* fournisseur de stockage interchangeable ;
* flux photo identique sur SCR-004 et SCR-010.

---

## Négatives

* dépendance externe à provisionner (compte de stockage, variables d'environnement) ;
* les URLs doivent être publiquement accessibles par le backend.

---

## Risques

* URLs expirantes selon le fournisseur — mitigé par la configuration de durées de validité longues ou de bucket public en lecture ;
* coût de stockage — à surveiller au déploiement.

---

# Impacts

## Backend

Aucun. Si un endpoint d'upload est ajouté plus tard, implémenter `StorageProvider` en conséquence (aucune modification des écrans).

---

## Frontend

`core/storage/` (interface + implémentations), `shared/components/photo-uploader/`, intégration dans `features/citizen/report-create/` (SCR-004) et `features/agent/interventions/` (SCR-010).

---

## UX

Prévisualisation des photos avant soumission ; limites explicites (format, taille).

---

## Documentation

* `docs/03-architecture/frontend-architecture.md` (ARCH-002)
* `docs/01-analysis/api-analysis.md` (recommandation § 9.6)

---

# Traçabilité

## Business Rules

* BR-SIG-001 (photos dans le signalement)

---

## Endpoints

* API-008 (POST /api/signalements), API-024 (PUT /api/interventions/{id})

---

## Screens

* SCR-004, SCR-010

---

## Components

* CMP-002 (formulaire de signalement)

---

## Features

* FEAT-001

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

* Le flux « sélection → upload → URL envoyée à l'API » fonctionne sur SCR-004 et SCR-010.
* Le fournisseur de stockage est configurable par environnement sans modification de code.
* Aucun endpoint inventé ; l'API reçoit uniquement des URLs.

---

# Références

Documentation : `docs/01-analysis/api-analysis.md` (§ 8-9), `docs/02-design/screen-specifications/report-create.md`, `docs/02-design/screen-specifications/interventions.md`, `docs/03-architecture/frontend-architecture.md`.

Maquette Figma : à compléter par l'UI Designer.

Issues : sans objet.

Liens utiles : documentation des providers de stockage (bucket S3 compatible, CDN).

---

# Historique

Version : 1.0
Auteur : Frontend Architect
Date : 2026-08-06
Commentaires : Création initiale.
