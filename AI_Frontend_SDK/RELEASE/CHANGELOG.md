# AI Frontend SDK - CHANGELOG

Toutes les modifications importantes du SDK sont documentées dans ce fichier.

---

# Version 1.1.0

Statut : Stable

Date : 2026-08-06

## Ajouté

### Orchestration

- création de `MASTER.md` : couche d'orchestration (point d'entrée unique d'une mission) — boucle de pilotage 00→06 (7 étapes), matrice de sélection des agents, gates de phase (prérequis d'entrée / livrables de sortie), règles d'arrêt sur dépendance manquante, critères d'acceptation du dogfooding (5 comportements observables), journal de mission (`docs/mission-log.md`).

### Hiérarchie

- `MASTER.md` intégré en tête de la hiérarchie documentaire (README, AI_CONTEXT, MANIFEST) et dans le démarrage rapide (étape 0).

### Outils

- `tools/check-consistency.ps1` : version passée à 1.1.0, `MASTER.md` ajouté aux fichiers audités.

---

# Version 1.0.1

Statut : Stable

Date : 2026-08-06

## Corrigé

### Agent

- création de l'agent Release Manager (`AGENTS/release-manager.md`) et ajout dans README, MANIFEST, AI_CONTEXT et Workflow 06.

### Documentation

- correction du MANIFEST : structure réelle de `docs/`, ajout de la section Release, fermeture du bloc final ;
- alignement des livrables des agents sur la structure réelle de `docs/` (Backend Analyst, Product Architect, QA Reviewer) ;
- correction des chemins de review et de navigation (désormais `docs/05-review/reviews/` et `docs/02-design/navigation.md`) ;
- renommage de `docs/04-review` → `docs/05-review`, `docs/05-release` → `docs/06-release`, création de `docs/04-development` ;
- uniformisation de la hiérarchie documentaire (README → AI_CONTEXT → PROJECT_RULES → WORKFLOW → TEMPLATES → PROMPTS → AGENTS → docs) ;
- correction de la casse `prompts/` → `PROMPTS/` ;
- suppression des décisions mission-spécifiques du fichier rôle UI Designer ;
- création de la section « Encapsulation des fonctionnalités appareil » dans Agent Developer ;
- complétion des placeholders de `docs/` et création de `TEMPLATES/release/`.

### Règles

- création de `PROJECT_RULES/architecture-principles.md` et `PROJECT_RULES/git-workflow.md`.

### Conventions

- `SCREEN-` → `SCR-` dans le template de spécification d'écran ;
- gravité « Cosmétique » → « Suggestion » dans le template de Bug Report.

### Compatibilité

- spécialisation du SDK : Angular 22, backend Laravel, domaine Smart City.

---

# Version 1.0.0

Statut : Stable

## Ajouté

### Architecture

- création de la structure complète du SDK ;
- définition des responsabilités des agents ;
- création des workflows de production.

### Documentation

- README.md ;
- AI_CONTEXT.md ;
- MANIFEST.md.

### Agents

Ajout des rôles :

- Backend Analyst ;
- Product Architect ;
- UI Designer ;
- Frontend Architect ;
- Citizen Developer ;
- Agent Developer ;
- Admin Developer ;
- QA Reviewer.

### Processus

Ajout du cycle :
Bootstrap
Analysis
Design
Architecture
Development
Review
Release


### Qualité

Ajout :

- règles projet ;
- templates ;
- processus de revue.

---

# Versions futures

Les évolutions seront ajoutées ici selon le principe :


Added
Changed
Deprecated
Removed
Fixed
Security