# AI Frontend SDK - VERSION

Version: 1.1.0

---

# Informations de release

Nom :

AI Frontend SDK

Version :

1.1.0

Statut :

Stable

Type :

Feature Release

---

# Objectif

Cette version ajoute la **couche d'orchestration** (`MASTER.md`) : le mode d'exécution permettant à une IA de piloter l'ensemble du SDK à partir d'une seule demande utilisateur (choix des agents, respect des workflows, production des livrables, arrêt sur dépendance manquante).

Elle formalise également le **test de dogfooding** (critères d'acceptation en 5 comportements observables, rapport dans `OUTPUT/`).

Elle conserve l'architecture et les principes des versions 1.0.x.

---

# Contenu inclus

Cette release inclut :

- création de `MASTER.md` (orchestrateur) : boucle de pilotage 00→06, matrice de sélection des agents, gates de phase, règles d'arrêt, critères d'acceptation du dogfooding, journal de mission ;
- MASTER.md intégré comme point d'entrée unique dans la hiérarchie documentaire (README, AI_CONTEXT, MANIFEST) ;
- mise à jour du script `tools/check-consistency.ps1` (version 1.1.0, audit de MASTER.md).

---

# Philosophie de cette version

La version 1.1.0 maintient les principes fondamentaux :

- documentation avant développement ;
- backend comme source de vérité ;
- séparation des responsabilités ;
- workflows obligatoires ;
- validation avant livraison.

Elle ajoute :

- pilotage automatique du framework depuis une demande utilisateur unique ;
- arrêt systématique sur dépendance manquante (aucune improvisation).

---

# Date

2026-08-06

---

AI Frontend SDK  
Version 1.1.0
