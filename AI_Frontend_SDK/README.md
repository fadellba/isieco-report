# AI Frontend SDK

Version: 1.1.0

Framework de conception et de développement frontend assisté par intelligence artificielle.

---

# Présentation

AI Frontend SDK est un cadre de travail permettant de construire des applications frontend modernes avec l'aide d'agents IA spécialisés.

Il fournit :

- une organisation par rôles ;
- des workflows contrôlés ;
- des règles communes ;
- des templates normalisés ;
- une documentation structurée ;
- un processus de validation qualité.

Le SDK transforme un besoin applicatif en une chaîne de production frontend documentée et reproductible.

---

# Objectifs

Les objectifs principaux sont :

- réduire les erreurs de conception ;
- améliorer la collaboration humain/IA ;
- garantir une architecture cohérente ;
- éviter le développement sans analyse préalable ;
- standardiser la production frontend.

---

# Architecture du SDK

Le SDK est organisé autour de plusieurs couches :

```

AI Frontend SDK

├── MASTER.md
│   Couche d'orchestration (point d'entrée unique d'une mission)

├── AGENTS
│   Agents spécialisés par responsabilité

├── PROJECT_RULES
│   Règles globales de développement

├── WORKFLOW
│   Processus obligatoire de production

├── TEMPLATES
│   Modèles documentaires

├── PROMPTS
│   Instructions spécialisées pour les agents IA

├── docs
│   Documentation générée pendant les missions

├── RELEASE
│   Package de livraison (version, changelog, compatibilité)

├── OUTPUT
│   Résultats finaux et rapports

```

---

# Cycle complet

Chaque projet suit obligatoirement ce cycle :

```

Bootstrap

↓

Analysis

↓

Design

↓

Architecture

↓

Development

↓

Review

↓

Release

```

Chaque phase possède :

- un objectif ;
- un workflow ;
- des agents responsables ;
- des livrables attendus.

---

# Les agents

## Backend Analyst

Analyse les API, les données disponibles et les contraintes backend.

---

## Product Architect

Transforme les besoins métier en fonctionnalités et parcours utilisateurs.

---

## UI Designer

Conçoit les interfaces et les composants visuels.

---

## Frontend Architect

Définit la structure technique frontend.

---

## Citizen Developer

Développe les interfaces utilisateur finales orientées citoyen.

Approche :

- mobile first ;
- simplicité ;
- accessibilité.

---

## Agent Developer

Développe les interfaces destinées aux agents opérationnels.

Approche :

- rapidité d'action ;
- usage terrain ;
- mobile first.

---

## Admin Developer

Développe les interfaces administratives.

Approche :

- desktop first ;
- gestion ;
- supervision.

---

## QA Reviewer

Contrôle la qualité globale avant validation.

---

## Release Manager

Prépare la livraison et produit le dossier de release.

---

# Workflow de travail

Une mission démarre toujours par :

```

00-bootstrap

```

Puis :

```

01-analysis
02-design
03-architecture
04-development
05-review
06-release

```

Chaque étape produit des documents servant de référence aux étapes suivantes.

---

# Démarrage rapide

## 0. Lancer la mission

Lire :

```
MASTER.md

```

puis laisser l'orchestrateur piloter la mission (choix des agents, respect des workflows, production des livrables, arrêt sur dépendance manquante).

---

## 1. Initialiser une mission

Lire :

```

AI_CONTEXT.md

```

Puis identifier :

- le type d'application ;
- les utilisateurs concernés ;
- les contraintes techniques.

---

## 2. Lancer l'analyse

Utiliser :

```

WORKFLOW/01-analysis

```

avec les agents :

```

backend-analyst
product-architect

```

---

## 3. Concevoir

Produire :

- parcours utilisateurs ;
- spécifications écrans ;
- architecture UX.

---

## 4. Développer

Suivre :

```

WORKFLOW/04-development

```

en utilisant les templates et règles associées.

---

## 5. Valider

Terminer par :

```

WORKFLOW/05-review

```

puis préparer la release.

---

# Structure complète du dépôt

```

.
├── README.md
├── MASTER.md
├── AI_CONTEXT.md
├── MANIFEST.md
│
├── AGENTS
├── PROJECT_RULES
├── WORKFLOW
├── TEMPLATES
├── PROMPTS
├── docs
├── RELEASE
└── OUTPUT

```

---

# Principes importants

Le SDK applique les règles suivantes :

- documentation avant développement ;
- backend comme source de vérité ;
- séparation stricte frontend/métier ;
- responsabilité claire par agent ;
- validation avant livraison.

---

# Version

```

AI Frontend SDK
Version 1.1.0
Status: Stable

```

---

# Licence

À définir selon le mode de distribution choisi.
