# Workflow 04 — Development

Version : 1.0

---

# Objectif

Implémenter les fonctionnalités conformément aux spécifications fonctionnelles, aux décisions d'architecture et aux règles du projet.

Ce workflow est destiné aux agents :

* Citizen Developer
* Agent Developer
* Admin Developer

---

# Prérequis

Les workflows suivants doivent être terminés :

* Workflow 00 — Bootstrap
* Workflow 01 — Analysis
* Workflow 02 — Design
* Workflow 03 — Architecture

Toutes les spécifications nécessaires doivent être disponibles.

---

# Entrées

L'agent reçoit :

* Feature Specifications
* Screen Specifications
* Component Specifications
* Architecture Documentation
* Endpoints Documentation
* Business Rules
* Maquettes Figma
* AI SDK

---

# Résultat attendu

À la fin de cette phase, la fonctionnalité est entièrement implémentée, testée et documentée.

---

# Étape 1 — Comprendre la fonctionnalité

Lire :

* Feature Specification
* Business Rules
* Screen Specification
* Component Specification

Identifier :

* le besoin métier ;
* les dépendances ;
* les critères d'acceptation.

Ne jamais commencer le développement sans comprendre complètement la fonctionnalité.

---

# Étape 2 — Vérifier les dépendances

Contrôler que :

* les endpoints existent ;
* les composants nécessaires sont disponibles ;
* les décisions d'architecture sont documentées ;
* les maquettes sont validées.

En cas de dépendance manquante, arrêter immédiatement la mission.

---

# Étape 3 — Préparer l'implémentation

Identifier :

* composants à créer ;
* composants à réutiliser ;
* services à utiliser ;
* routes concernées ;
* modèles nécessaires.

Limiter les modifications au périmètre de la fonctionnalité.

---

# Étape 4 — Implémenter la fonctionnalité

Développer en respectant :

* les spécifications fonctionnelles ;
* les maquettes Figma ;
* l'architecture définie ;
* les conventions de codage.

Ne jamais modifier le comportement métier du backend.

---

# Étape 5 — Gérer les états de l'interface

Implémenter tous les états définis dans les spécifications :

* Loading
* Success
* Empty
* Error
* No Results (si applicable)
* Offline (si applicable)

---

# Étape 6 — Intégrer les API

Utiliser exclusivement les endpoints documentés.

Respecter :

* le contrat API ;
* les validations ;
* les formats de données ;
* la gestion des erreurs.

Ne jamais supposer le comportement d'une API.

---

# Étape 7 — Vérifier la qualité

Contrôler que :

* les composants sont réutilisables ;
* aucune duplication inutile n'est introduite ;
* les règles métier sont respectées ;
* le responsive est conforme ;
* l'accessibilité est respectée.

---

# Étape 8 — Mettre à jour les livrables

Mettre à jour si nécessaire :

* documentation technique ;
* références de la fonctionnalité ;
* traçabilité.

Ne jamais modifier les documents d'analyse ou de conception sans justification.

---

# Livrables

Selon la mission :

* Code Angular
* Composants
* Services
* Routes
* Tests
* Documentation mise à jour

---

# Critères de réussite

* [ ] La fonctionnalité respecte les spécifications.
* [ ] Les maquettes sont fidèlement implémentées.
* [ ] Les endpoints sont correctement intégrés.
* [ ] Les règles métier sont respectées.
* [ ] Tous les états sont gérés.
* [ ] Le responsive est conforme.
* [ ] Les tests sont réalisés.
* [ ] Le code respecte les conventions du projet.

---

# Règles obligatoires

L'agent ne doit jamais :

* modifier le backend ;
* inventer un endpoint ;
* modifier une règle métier ;
* modifier une décision d'architecture ;
* développer une fonctionnalité non documentée.

Toute anomalie doit être signalée avant de poursuivre.

---

# Sortie

À l'issue de ce workflow, la fonctionnalité est prête à être auditée par le QA Reviewer avant validation finale.
