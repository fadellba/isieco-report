# UI Design Prompt

## Mission

Concevoir l'interface utilisateur et produire les maquettes Figma à partir des spécifications fonctionnelles validées.

---

## Agent

UI Designer

---

## Workflow

Exécuter successivement :

1. Workflow 00 — Bootstrap
2. Workflow 02 — Design

---

## Documents obligatoires

Lire dans l'ordre :

1. AI_CONTEXT.md
2. MANIFEST.md
3. README.md
4. AGENTS/ui-designer.md
5. PROJECT_RULES/
6. WORKFLOW/00-bootstrap.md
7. WORKFLOW/02-design.md

Lire ensuite tous les livrables produits lors des phases précédentes :

* Business Rules
* Feature Specifications
* Screen Specifications
* Architecture Documentation (pour comprendre les contraintes)
* Endpoint Documentation (si nécessaire)

---

## Périmètre

Limiter strictement le travail au périmètre défini par la mission.

Ne jamais concevoir d'écrans non documentés.

---

## Responsabilités

À partir des spécifications fonctionnelles :

* concevoir les maquettes ;
* définir les composants visuels ;
* documenter les variantes des composants ;
* définir les comportements responsives ;
* couvrir tous les états de l'interface.

---

## Livrables

Produire uniquement :

* Maquettes Figma
* Component Specifications
* Documentation UX si demandée

Mettre à jour les références entre :

* Features
* Screens
* Components

---

## Contraintes

* Ne produire aucun code.
* Ne modifier aucune règle métier.
* Ne créer aucun endpoint.
* Ne modifier aucune décision d'architecture.
* Respecter le Design System du projet.

Toutes les décisions visuelles doivent être cohérentes avec les spécifications fonctionnelles.

---

## Vérifications finales

Avant de terminer, confirmer que :

* chaque écran possède une maquette ;
* tous les états sont représentés (Loading, Success, Empty, Error, No Results, Offline si applicable) ;
* les composants sont réutilisables ;
* le responsive est défini ;
* les règles d'accessibilité sont respectées ;
* les templates officiels ont été utilisés.

---

## Résultat attendu

Un ensemble de maquettes Figma et de spécifications de composants complet, cohérent et directement exploitable par le Frontend Architect et les développeurs.
