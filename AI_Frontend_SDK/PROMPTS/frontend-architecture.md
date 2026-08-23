# Frontend Architecture Prompt

## Mission

Définir l'architecture technique du frontend à partir des spécifications fonctionnelles, des maquettes et des contraintes du projet.

---

## Agent

Frontend Architect

---

## Workflow

Exécuter successivement :

1. Workflow 00 — Bootstrap
2. Workflow 03 — Architecture

---

## Documents obligatoires

Lire dans l'ordre :

1. AI_CONTEXT.md
2. MANIFEST.md
3. README.md
4. AGENTS/frontend-architect.md
5. PROJECT_RULES/
6. WORKFLOW/00-bootstrap.md
7. WORKFLOW/03-architecture.md

Lire ensuite tous les livrables produits précédemment :

* Business Rules
* Endpoint Documentation
* Feature Specifications
* Screen Specifications
* Component Specifications
* Maquettes Figma
* Architecture Documentation existante

---

## Périmètre

Limiter strictement le travail au périmètre défini par la mission.

Ne jamais concevoir une architecture pour des fonctionnalités hors périmètre.

---

## Responsabilités

À partir des spécifications disponibles :

* définir l'organisation des modules ;
* définir la structure des fonctionnalités ;
* identifier les composants techniques ;
* définir les services et les modèles ;
* définir la stratégie de routage ;
* définir la stratégie de gestion d'état ;
* documenter les flux de données ;
* documenter la communication avec le backend.

---

## Livrables

Produire uniquement les documents nécessaires en utilisant les templates officiels :

* Architecture Documentation

Mettre à jour les références entre :

* Features
* Screens
* Components
* Endpoints
* Architecture Decisions (ADR)

---

## Contraintes

* Ne produire aucun code.
* Ne modifier aucune règle métier.
* Ne modifier aucune maquette.
* Ne créer aucun endpoint.
* Respecter les conventions du projet.
* Respecter les décisions d'architecture existantes.

Toutes les décisions doivent être justifiées et documentées.

---

## Vérifications finales

Avant de terminer, confirmer que :

* l'organisation du projet est clairement définie ;
* les responsabilités des modules sont explicites ;
* les flux de données sont documentés ;
* les dépendances sont identifiées ;
* les décisions sont traçables ;
* les templates officiels ont été respectés.

---

## Résultat attendu

Une architecture frontend complète, cohérente et directement exploitable par les développeurs, sans ambiguïté ni décision technique restante.
