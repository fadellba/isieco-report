# AI Frontend SDK - MANIFEST

Version: 1.1.0

---

# Description

Ce document répertorie les composants disponibles dans AI Frontend SDK.

Il sert d'index rapide permettant aux développeurs et agents IA de découvrir :

- les agents disponibles ;
- les workflows existants ;
- les règles applicables ;
- les templates disponibles ;
- les prompts spécialisés ;
- la documentation associée.

---

# Structure générale

```

AI Frontend SDK

├── AGENTS/
├── PROJECT_RULES/
├── WORKFLOW/
├── TEMPLATES/
├── PROMPTS/
├── docs/
├── RELEASE/
└── OUTPUT/

```

---

# Agents

Emplacement :

```

AGENTS/

```

## backend-analyst.md

Responsabilité :

- analyse des APIs ;
- compréhension backend ;
- identification des données disponibles ;
- analyse des contraintes techniques.

---

## product-architect.md

Responsabilité :

- analyse fonctionnelle ;
- définition des fonctionnalités ;
- conception des parcours utilisateurs.

---

## ui-designer.md

Responsabilité :

- conception UX/UI ;
- composants visuels ;
- cohérence interface.

---

## frontend-architect.md

Responsabilité :

- architecture frontend ;
- organisation applicative ;
- décisions techniques.

---

## citizen-developer.md

Responsabilité :

- développement des interfaces citoyen ;
- approche mobile first.

---

## agent-developer.md

Responsabilité :

- développement des interfaces agents ;
- optimisation des actions terrain.

---

## admin-developer.md

Responsabilité :

- développement des interfaces administrateur ;
- dashboards ;
- gestion desktop.

---

## qa-reviewer.md

Responsabilité :

- contrôle qualité ;
- validation ;
- audit.

---

## release-manager.md

Responsabilité :

- préparation de la livraison ;
- vérification des livrables ;
- production du dossier de release.

---

# Workflows

Emplacement :

```

WORKFLOW/

```

## 00-bootstrap

Initialisation d'une nouvelle mission.

Objectifs :

- comprendre le contexte ;
- préparer l'environnement ;
- identifier les acteurs.

---

## 01-analysis

Analyse avant conception.

Livrables :

- analyse API ;
- règles métier ;
- besoins fonctionnels.

---

## 02-design

Conception produit et interface.

Livrables :

- user flows ;
- navigation ;
- spécifications écrans.

---

## 03-architecture

Définition technique frontend.

Livrables :

- architecture applicative ;
- structure modules ;
- décisions techniques.

---

## 04-development

Implémentation.

Livrables :

- composants ;
- services ;
- interfaces.

---

## 05-review

Contrôle qualité.

Livrables :

- rapport de revue ;
- corrections nécessaires.

---

## 06-release

Préparation livraison.

Livrables :

- version ;
- changelog ;
- validation finale.

---

# Project Rules

Emplacement :

```

PROJECT_RULES/

```

Contient les règles globales :

- conventions techniques ;
- standards frontend ;
- règles architecture ;
- règles documentation ;
- règles qualité.

---

# Templates

Emplacement :

```

TEMPLATES/

```

Contient les modèles utilisés pendant les workflows.

Catégories :

```

analysis/
design/
development/
review/
release/

```

Types de documents :

- analyses ;
- spécifications ;
- décisions techniques ;
- rapports ;
- validations.

---

# Prompts

Emplacement :

```

PROMPTS/

```

Contient les instructions spécialisées destinées aux agents IA.

Exemples :

- analyse backend ;
- conception produit ;
- architecture frontend ;
- génération composants ;
- revue qualité.

---

# Documentation

Emplacement :

```

docs/

```

Organisation :

```

docs/

├── 01-analysis
│
├── 02-design
│
├── 03-architecture
│
├── 04-development
│
├── 05-review
│
└── 06-release

```

Contient les documents produits pendant les différentes phases.

---

# Output

Emplacement :

```

OUTPUT/

```

Contient :

- rapports finaux ;
- audits ;
- exports ;
- livrables de release.

---

# Release

Emplacement :

```

RELEASE/

```

Contient le package de livraison :

- VERSION.md ;
- CHANGELOG.md ;
- COMPATIBILITY.md ;
- ROADMAP.md.

---

# Documents racines

| Document | Rôle |
|---|---|
| MASTER.md | Couche d'orchestration — point d'entrée unique d'une mission (pilotage de l'ensemble du SDK) |
| README.md | Présentation générale du SDK |
| AI_CONTEXT.md | Contexte permanent pour les IA |
| MANIFEST.md | Inventaire du SDK |

---

# Hiérarchie documentaire

```

MASTER.md

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

```

---

# Version actuelle

```

AI Frontend SDK
Version: 1.1.0
Status: Stable

```

---

End of MANIFEST
