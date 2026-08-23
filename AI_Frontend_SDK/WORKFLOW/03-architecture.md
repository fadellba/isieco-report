# Workflow 03 — Architecture

Version : 1.0

---

# Objectif

Définir l'architecture technique nécessaire à l'implémentation du frontend.

Ce workflow est destiné au :

* Frontend Architect

---

# Prérequis

Les workflows suivants doivent être terminés :

* Workflow 00 — Bootstrap
* Workflow 01 — Analysis
* Workflow 02 — Design

Toutes les spécifications et maquettes doivent être disponibles.

---

# Entrées

L'agent reçoit :

* Business Rules
* Documentation des Endpoints
* Documents d'Architecture
* Screen Specifications
* Component Specifications
* Maquettes Figma
* AI SDK

---

# Résultat attendu

À la fin de cette phase, le projet dispose d'une architecture frontend complète, documentée et directement exploitable par les développeurs.

Aucun écran ne doit être implémenté.

---

# Étape 1 — Comprendre les besoins

Étudier :

* les règles métier ;
* les parcours utilisateurs ;
* les maquettes ;
* les spécifications des écrans.

Identifier les contraintes techniques.

---

# Étape 2 — Définir l'organisation du projet

Structurer l'application.

Identifier notamment :

* modules ;
* fonctionnalités ;
* composants partagés ;
* layouts ;
* services ;
* modèles ;
* utilitaires.

Respecter les principes d'architecture définis dans le projet.

---

# Étape 3 — Définir les responsabilités

Pour chaque élément :

* responsabilité ;
* dépendances ;
* interfaces publiques.

Éviter les responsabilités multiples.

---

# Étape 4 — Définir les flux

Documenter :

* navigation ;
* flux de données ;
* communication avec l'API ;
* gestion des états.

Identifier les interactions entre les modules.

---

# Étape 5 — Définir les composants techniques

Identifier les composants nécessaires.

Préciser :

* composants métier ;
* composants partagés ;
* layouts ;
* services ;
* guards ;
* interceptors.

Ne créer que les éléments réellement nécessaires.

---

# Étape 6 — Définir la stratégie de gestion d'état

Documenter :

* état local ;
* état partagé ;
* données issues de l'API ;
* cycle de vie des données.

Préciser les responsabilités de chaque couche.

---

# Étape 7 — Définir la stratégie de communication

Documenter :

* appels API ;
* gestion des erreurs ;
* authentification ;
* autorisation ;
* notifications.

Respecter le contrat défini par le backend.

---

# Étape 8 — Vérifier la cohérence

Contrôler que :

* chaque écran possède une architecture claire ;
* chaque composant a une responsabilité unique ;
* aucune duplication n'est introduite ;
* les dépendances sont maîtrisées.

---

# Étape 9 — Produire la documentation

Utiliser exclusivement :

* architecture-template.md

Toutes les décisions doivent être documentées.

---

# Livrables

Selon la mission :

* Architecture Frontend
* Organisation des modules
* Flux de données
* Organisation des composants
* Décisions d'architecture

---

# Critères de réussite

* [ ] Architecture cohérente.
* [ ] Modules clairement définis.
* [ ] Responsabilités explicites.
* [ ] Flux documentés.
* [ ] Dépendances identifiées.
* [ ] Architecture conforme aux règles du projet.
* [ ] Documentation complète.

---

# Règles obligatoires

L'agent ne doit jamais :

* développer une fonctionnalité ;
* modifier une règle métier ;
* modifier les maquettes ;
* inventer un endpoint ;
* contourner les conventions du projet.

Son rôle est uniquement de définir l'architecture technique.

---

# Sortie

À l'issue de ce workflow, le projet dispose d'une architecture frontend validée et prête à être implémentée par les développeurs.
