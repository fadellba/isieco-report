# Workflow 01 — Analysis

Version : 1.0

---

# Objectif

Analyser le système existant afin de produire une documentation fiable, complète et exploitable par les phases suivantes.

Ce workflow est destiné aux agents :

* Backend Analyst
* Product Architect

---

# Prérequis

Le Workflow 00 — Bootstrap doit avoir été exécuté avec succès.

---

# Entrées

L'agent reçoit :

* la mission d'analyse ;
* le dépôt du projet ;
* la documentation existante ;
* le framework AI SDK.

---

# Résultat attendu

À la fin de l'analyse, le projet doit disposer d'une documentation factuelle décrivant :

* les règles métier ;
* les endpoints ;
* l'architecture observée ;
* les dépendances ;
* les comportements du système.

Aucun code ne doit être produit.

---

# Étape 1 — Définir le périmètre

Identifier précisément :

* le module concerné ;
* les fonctionnalités concernées ;
* les limites de la mission.

Ne jamais analyser des éléments hors périmètre.

---

# Étape 2 — Collecter les sources

Identifier toutes les sources disponibles :

* code source ;
* documentation ;
* spécifications ;
* base de données ;
* API ;
* tests.

Considérer le code comme la source de vérité lorsqu'il est plus récent que la documentation.

---

# Étape 3 — Étudier le fonctionnement

Observer le comportement réel du système.

Identifier notamment :

* flux métier ;
* traitements ;
* validations ;
* dépendances ;
* exceptions ;
* événements.

Ne jamais interpréter un comportement non observé.

---

# Étape 4 — Identifier les artefacts

Recenser tous les éléments concernés :

* Business Rules (BR)
* Endpoints (API)
* Architectures (ARCH)
* Features (FEAT)
* Screens (SCR)
* Components (CMP)
* ADR existants

---

# Étape 5 — Produire la documentation

Utiliser exclusivement les templates appropriés :

* endpoint-template.md
* business-rule-template.md
* architecture-template.md

Ne jamais modifier un template.

---

# Étape 6 — Vérifier la cohérence

Contrôler que :

* chaque endpoint documenté existe ;
* chaque règle métier est observable ;
* les références sont valides ;
* les dépendances sont correctement identifiées.

---

# Étape 7 — Identifier les éléments manquants

Lister explicitement :

* documentation absente ;
* règles non documentées ;
* endpoints incomplets ;
* ambiguïtés détectées.

Ne jamais compléter les informations par déduction.

---

# Étape 8 — Préparer la phase suivante

Produire des livrables directement exploitables par :

* le Product Architect ;
* le Frontend Architect ;
* le UI Designer.

Les documents doivent être autonomes et compréhensibles sans relire le code.

---

# Livrables

Selon la mission :

* Business Rules
* Documentation des Endpoints
* Documents d'Architecture
* Rapport d'analyse

Tous les livrables doivent respecter les templates officiels.

---

# Critères de réussite

* [ ] Le périmètre est respecté.
* [ ] Les sources ont été analysées.
* [ ] Les informations sont vérifiables.
* [ ] Les templates sont correctement utilisés.
* [ ] Les dépendances sont identifiées.
* [ ] Les ambiguïtés sont signalées.
* [ ] Aucun code n'a été produit.

---

# Règles obligatoires

L'agent ne doit jamais :

* proposer une nouvelle architecture ;
* modifier le comportement observé ;
* inventer des règles métier ;
* créer des endpoints inexistants ;
* produire du code ;
* corriger le projet.

Son rôle est uniquement d'analyser et de documenter.

---

# Sortie

À l'issue de ce workflow, le projet dispose d'une documentation fiable servant de référence pour les phases de conception et de développement.
