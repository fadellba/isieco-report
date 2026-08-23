# Product Analysis Prompt

## Mission

Transformer les résultats de l'analyse en spécifications fonctionnelles complètes et cohérentes.

---

## Agent

Product Architect

---

## Workflow

Exécuter successivement :

1. Workflow 00 — Bootstrap
2. Workflow 01 — Analysis (consultation des livrables)
3. Workflow 02 — Design

---

## Documents obligatoires

Lire dans l'ordre :

1. AI_CONTEXT.md
2. MANIFEST.md
3. README.md
4. AGENTS/product-architect.md
5. PROJECT_RULES/
6. WORKFLOW/00-bootstrap.md
7. WORKFLOW/02-design.md

Lire ensuite tous les livrables produits par le Backend Analyst :

* Business Rules
* Endpoint Documentation
* Architecture Documentation
* Rapports d'analyse

---

## Périmètre

Limiter strictement le travail au périmètre défini par la mission.

Ne jamais concevoir des fonctionnalités hors périmètre.

---

## Responsabilités

À partir des documents d'analyse :

* identifier les fonctionnalités ;
* définir les parcours utilisateurs ;
* spécifier les écrans nécessaires ;
* identifier les composants fonctionnels ;
* documenter les dépendances.

---

## Livrables

Produire uniquement les documents nécessaires en utilisant les templates officiels :

* Feature Specifications
* Screen Specifications

Mettre à jour les références entre :

* Business Rules
* Endpoints
* Features
* Screens

---

## Contraintes

* Ne produire aucun code.
* Ne créer aucun endpoint.
* Ne modifier aucune règle métier.
* Ne définir aucune architecture technique.
* Ne produire aucune maquette graphique.

Toutes les décisions doivent être justifiées par les documents d'analyse.

---

## Vérifications finales

Avant de terminer, confirmer que :

* chaque fonctionnalité répond à un besoin métier ;
* chaque écran est justifié ;
* toutes les références sont cohérentes ;
* les templates officiels ont été respectés ;
* aucune hypothèse non documentée n'a été introduite.

---

## Résultat attendu

Des spécifications fonctionnelles complètes, cohérentes et directement exploitables par le UI Designer et le Frontend Architect.
