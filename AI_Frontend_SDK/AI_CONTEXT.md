# AI Frontend SDK - AI_CONTEXT

Version: 1.1.0

---

# Mission du SDK

AI Frontend SDK est un framework de conception et de développement frontend assisté par intelligence artificielle.

Son objectif est de permettre à une équipe humaine ou à des agents IA de construire des applications frontend structurées, cohérentes et maintenables à partir d'une approche basée sur :

- l'analyse avant implémentation ;
- la documentation comme source de vérité ;
- la séparation stricte des responsabilités ;
- des workflows contrôlés ;
- des rôles spécialisés ;
- des validations systématiques.

Le SDK n'est pas un générateur automatique de code.

Il fournit une méthode de travail permettant aux IA et aux développeurs de produire du logiciel de manière prévisible.

---

# Philosophie

## Documentation First

Aucun développement ne commence sans compréhension préalable.

Le processus obligatoire est :

Comprendre → Documenter → Concevoir → Implémenter → Vérifier

La documentation précède toujours le code.

---

## Backend Source of Truth

Le backend représente la source de vérité fonctionnelle.

Le frontend :

- consomme les API existantes ;
- présente les données ;
- applique les règles d'affichage ;
- gère les interactions utilisateur.

Le frontend ne doit pas :

- reproduire une logique métier backend ;
- inventer des règles fonctionnelles ;
- modifier le sens des données reçues.

---

## Separation of Concerns

Chaque élément possède une responsabilité claire.

Les rôles, workflows, templates et documents doivent rester spécialisés.

Un agent ne remplace pas un autre agent.

---

## Quality Before Speed

La rapidité d'exécution ne doit jamais compromettre :

- la compréhension ;
- la cohérence ;
- la maintenabilité ;
- la qualité finale.

---

# Principes fondamentaux

## 1. Un responsable par étape

Chaque phase possède un agent responsable.

Exemple :

Analysis:
Backend Analyst + Product Architect

Design:
Product Architect + UI Designer

Architecture:
Frontend Architect

Development:
Developer Agents

Review:
QA Reviewer

Release:
Release Manager

---

## 2. Aucun développement sans spécification

Avant toute implémentation doivent exister :

- analyse fonctionnelle ;
- analyse API ;
- règles métier ;
- flux utilisateur ;
- spécifications écrans ;
- architecture frontend.

---

## 3. Les documents sont hiérarchiques

Ordre de référence :

```
MASTER.md — couche d'orchestration (point d'entrée unique d'une mission)

↓

README.md

↓

AI_CONTEXT.md

↓

PROJECT_RULES/

↓

WORKFLOW/

↓

TEMPLATES/

↓

PROMPTS/

↓

AGENTS/

↓

docs/

↓

RELEASE/

↓

tools/ — scripts de contrôle de cohérence (check-consistency.ps1)

↓

knowledge-base/ — source de vérité métier amont (RG1→RG35, MCD/MLD ; hors périmètre SDK, référence normative)

```

En cas de contradiction, le document supérieur prévaut.

La base de connaissance Merise du backend (`knowledge-base/` — règles de gestion RG1→RG35, MCD, MLD) est la source de vérité métier amont. Elle n'appartient pas au SDK mais ses identifiants `RG*` sont référencés par `docs/01-analysis/business-rules.md` (mapping `RG ↔ BR`).

---

# Workflow obligatoire

Toute mission frontend doit suivre ce cycle (piloté par `MASTER.md`) :

```

00 Bootstrap

↓

01 Analysis

↓

02 Design

↓

03 Architecture

↓

04 Development

↓

05 Review

↓

06 Release

```

Une étape ne peut être ignorée sans justification documentée.

---

# Rôle des agents

## Backend Analyst

Responsable de :

- comprendre les API ;
- identifier les données disponibles ;
- analyser les règles backend ;
- détecter les contraintes techniques.

---

## Product Architect

Responsable de :

- transformer les besoins en fonctionnalités ;
- définir les parcours utilisateurs ;
- structurer l'expérience produit.

---

## UI Designer

Responsable de :

- concevoir les interfaces ;
- définir les composants visuels ;
- garantir la cohérence UX/UI.

---

## Frontend Architect

Responsable de :

- définir l'architecture frontend ;
- organiser les modules ;
- choisir les patterns techniques.

---

## Citizen Developer

Responsable des interfaces destinées aux citoyens/utilisateurs finaux.

Priorité :

- simplicité ;
- mobile first ;
- accessibilité.

---

## Agent Developer

Responsable des interfaces agents opérationnels.

Priorité :

- efficacité ;
- actions rapides ;
- utilisation mobile.

---

## Admin Developer

Responsable des interfaces administrateurs.

Priorité :

- tableaux de bord ;
- gestion ;
- desktop first.

---

## QA Reviewer

Responsable de :

- contrôler la qualité ;
- vérifier les règles ;
- détecter les incohérences ;
- valider les releases.

---

## Release Manager

Responsable de :

- vérifier les livrables ;
- contrôler la traçabilité ;
- préparer la version ;
- produire le dossier de livraison.

---

# Règles absolues

## Ne jamais :

- coder avant analyse ;
- ignorer une étape du workflow ;
- ajouter une règle métier frontend ;
- créer une documentation contradictoire ;
- contourner les templates officiels ;
- modifier l'architecture sans décision documentée.

---

# Convention documentaire

Chaque production doit être :

- traçable ;
- versionnée ;
- localisée dans le dossier approprié ;
- référencée dans les documents concernés.

---

# Objectif final

Permettre à une équipe hybride humain + IA de produire des applications frontend professionnelles avec :

- une méthode reproductible ;
- une architecture cohérente ;
- une qualité contrôlée ;
- une évolution maîtrisée.
