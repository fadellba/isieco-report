# AI Frontend SDK - COMPATIBILITY

Version: 1.1.0

---

# Objectif

Ce document définit les environnements, technologies et contraintes compatibles avec AI Frontend SDK.

Le SDK est spécialisé pour la production d'applications Angular sur backend Laravel dans le domaine Smart City.

---

# Support IA

Le SDK est conçu pour fonctionner avec des agents IA capables de :

- lire une structure documentaire ;
- suivre des instructions markdown ;
- appliquer des workflows ;
- produire des livrables structurés.

---

# Support frontend

Le SDK est compatible exclusivement avec Angular :

| Composant | Version supportée |
|---|---|
| Angular | 22 |
| Standalone Components | Oui |
| Angular Signals | Oui |
| RxJS | Utilisé uniquement si nécessaire (HTTP, streams, interop) |
| NgModules | Interdits, sauf exception documentée |

---

# Support backend

Le backend cible est Laravel (API REST), source de vérité fonctionnelle :

- endpoints authentifiés par Sanctum ;
- ressources normalisées (JSON) ;
- rôles : Citizen, Agent, Administrator.

---

# Domaine métier

Le SDK est orienté Smart City :

- signalement de dépôts d'ordures sauvages ;
- géolocalisation ;
- carte interactive des zones à collecter ;
- suivi de statut des signalements ;
- tableau de bord administrateur ;
- gamification citoyenne.

---

# Prérequis projet

Un projet utilisant le SDK doit disposer :

- d'une documentation accessible ;
- d'une API Laravel documentée ;
- d'une séparation frontend/backend ;
- d'un système de versionnement ;
- d'un Design System Figma comme référence visuelle.

---

# Compatibilité documentaire

Formats supportés :

- Markdown (.md) ;
- arborescences fichiers ;
- documents techniques structurés ;
- maquettes Figma.

---

# Limites V1.1.0

Cette version ne fournit pas :

- génération automatique complète d'application ;
- remplacement complet d'une équipe technique ;
- gestion automatique du déploiement ;
- support d'autres frameworks frontend (React, Vue).

---

AI Frontend SDK  
Compatibility V1.1.0
