---
title: ISI-Eco Report Knowledge Base
version: 2.0
language: fr
methodology: Merise
project: ISI-Eco Report
type: Knowledge Base
target:
  - GPT
  - Claude
  - Gemini
  - Cursor
  - Copilot
  - RAG
---

# ISI-Eco Report — Base de connaissances

## Présentation

Cette base de connaissances rassemble l'ensemble de la documentation fonctionnelle et conceptuelle du projet **ISI-Eco Report**.

Elle est destinée à être utilisée comme source unique de référence par :

- les développeurs ;
- les analystes fonctionnels ;
- les concepteurs de bases de données ;
- les agents IA (GPT, Claude, Gemini, Cursor, Copilot, systèmes RAG).

Le contenu est organisé de manière modulaire afin de faciliter la recherche d'information, la génération de code et le raisonnement métier.

---

# À propos du projet

ISI-Eco Report est une plateforme numérique permettant aux citoyens de signaler des dépôts de déchets et aux services de collecte de gérer l'ensemble du cycle de traitement des signalements.

La plateforme poursuit plusieurs objectifs :

- centraliser les signalements ;
- améliorer le suivi des interventions ;
- faciliter l'affectation des équipes ;
- produire des statistiques d'aide à la décision ;
- encourager la participation citoyenne grâce à un système de gamification.

---

# Architecture documentaire

```
knowledge-base/
│
├── README.md
├── architecture.md
│
├── 01-contexte-general.md
├── 02-etude-prealable.md
├── 03-conception-des-donnees.md
│
├── models/
│   ├── acteurs.md
│   ├── regles-gestion.md
│   ├── regles-organisation.md
│   ├── mcd.md
│   ├── mld.md
│   ├── dictionnaire-des-donnees.md
│   └── schema-relationnel.md
│
├── glossary.md
├── faq.md
└── changelog.md
```

---

# Acteurs métier

Le système repose sur quatre concepts principaux.

## Citoyen

Le citoyen est un utilisateur authentifié capable de :

- créer des signalements ;
- consulter leur état ;
- consulter son historique ;
- recevoir des points.

---

## Agent

L'agent appartient à une ou plusieurs équipes.

Il réalise les interventions terrain.

---

## Administrateur

L'administrateur supervise :

- les signalements ;
- les équipes ;
- les zones ;
- les affectations ;
- les statistiques.

---

## Système

Le système automatise :

- les notifications ;
- l'attribution des points ;
- les tableaux de bord ;
- les statistiques.

---

# Cycle de vie d'un signalement

```
Création

        ↓

Validation / Rejet

        ↓

Priorisation

        ↓

Affectation

        ↓

Intervention

        ↓

Compte rendu

        ↓

Clôture
```

---

# Modules fonctionnels

Le projet est organisé autour des modules suivants :

- Authentification
- Gestion des utilisateurs
- Gestion des rôles
- Signalements
- Types de déchets
- Zones
- Affectations
- Équipes
- Interventions
- Photographies
- Gamification
- Tableaux de bord
- Statistiques

---

# Modélisation

La conception repose sur la méthode **Merise**.

Les modèles documentés sont :

- MCC
- MCT
- MCD
- MLD

---

# Source de vérité

Cette documentation constitue la référence officielle du projet.

En cas de divergence, les documents présents dans cette base de connaissances prévalent sur toute autre documentation.

Les éléments suivants sont considérés comme normatifs :

- règles de gestion ;
- règles d'organisation ;
- modèle conceptuel de données (MCD) ;
- modèle logique de données (MLD).

---

# Convention de nommage

Les entités métier sont écrites en majuscules.

Exemple :

- UTILISATEUR
- SIGNALEMENT
- EQUIPE
- INTERVENTION

Les associations Merise sont également écrites en majuscules.

Exemple :

- EMETTRE
- APPARTENANCE_EQUIPE
- CONTENU_SIGNALEMENT
- COUVERTURE_ZONE

---

# Version du modèle

Cette version intègre les évolutions suivantes :

- ajout de l'entité ROLE ;
- séparation ROLE / UTILISATEUR ;
- nouvelles règles de gestion RG1 à RG35 ;
- MCD mis à jour ;
- MLD mis à jour ;
- normalisation complète des cardinalités ;
- optimisation pour les agents IA.

---

# Objectif

Cette base de connaissances doit permettre à un agent IA de :

- comprendre le domaine métier ;
- répondre aux questions sur le projet ;
- générer du code cohérent ;
- produire des diagrammes Merise ;
- générer la documentation ;
- assister le développement sans ambiguïté.
