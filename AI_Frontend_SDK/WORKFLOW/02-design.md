# Workflow 02 — Design

Version : 1.0

---

# Objectif

Transformer les résultats de l'analyse en une conception fonctionnelle, UX et UI complète.

Ce workflow est destiné aux agents :

* Product Architect
* UI Designer

---

# Prérequis

Le Workflow 00 — Bootstrap doit avoir été exécuté.

Le Workflow 01 — Analysis doit être terminé.

Toute la documentation d'analyse doit être disponible.

---

# Entrées

L'agent reçoit :

* Business Rules
* Documentation des Endpoints
* Documents d'Architecture
* Documentation existante
* AI SDK

---

# Résultat attendu

À la fin de cette phase, le projet dispose :

* des spécifications d'écrans ;
* des parcours utilisateurs ;
* des composants UI nécessaires ;
* des maquettes Figma.

Aucun code ne doit être produit.

---

# Étape 1 — Comprendre le besoin

Lire :

* Business Rules
* Endpoints
* Architecture

Identifier :

* les objectifs métier ;
* les utilisateurs concernés ;
* les contraintes.

---

# Étape 2 — Identifier les fonctionnalités

Lister toutes les fonctionnalités à couvrir.

Pour chacune :

* objectif ;
* utilisateur ;
* priorité ;
* dépendances.

---

# Étape 3 — Définir les parcours utilisateurs

Pour chaque fonctionnalité :

Identifier :

* point d'entrée ;
* étapes principales ;
* cas alternatifs ;
* cas d'erreur ;
* point de sortie.

Les parcours doivent être cohérents avec les règles métier.

---

# Étape 4 — Concevoir les écrans

Identifier les écrans nécessaires.

Pour chaque écran :

* rôle ;
* données affichées ;
* actions utilisateur ;
* états ;
* navigation.

Utiliser exclusivement :

screen-specification-template.md

---

# Étape 5 — Concevoir les composants

Identifier les composants réutilisables.

Éviter toute duplication.

Utiliser exclusivement :

component-template.md

---

# Étape 6 — Produire les maquettes

Créer les maquettes Figma.

Respecter :

* Design System ;
* Responsive ;
* Accessibilité ;
* UX Guidelines.

Les maquettes doivent couvrir :

* état normal ;
* chargement ;
* erreur ;
* vide ;
* hors ligne (si applicable).

---

# Étape 7 — Vérifier la cohérence

Contrôler que :

* chaque écran répond à un besoin métier ;
* chaque composant est réutilisable ;
* tous les parcours sont couverts ;
* les maquettes correspondent aux spécifications.

---

# Étape 8 — Préparer la phase d'architecture

Produire une documentation directement exploitable par le Frontend Architect.

Les décisions de conception doivent être explicites.

---

# Livrables

Selon la mission :

* Screen Specifications
* Component Specifications
* Maquettes Figma
* Documentation UX

Tous les livrables doivent respecter les templates officiels.

---

# Critères de réussite

* [ ] Tous les parcours utilisateurs sont documentés.
* [ ] Les écrans sont spécifiés.
* [ ] Les composants sont identifiés.
* [ ] Les maquettes couvrent tous les états.
* [ ] Les règles métier sont respectées.
* [ ] Le Design System est appliqué.
* [ ] Les livrables sont exploitables sans clarification.

---

# Règles obligatoires

L'agent ne doit jamais :

* développer une fonctionnalité ;
* créer un endpoint ;
* modifier une règle métier ;
* contourner une contrainte technique documentée ;
* inventer un comportement non défini.

Son rôle est uniquement de concevoir.

---

# Sortie

À l'issue de ce workflow, le projet dispose d'une conception fonctionnelle et visuelle complète, prête pour la définition de l'architecture frontend.
