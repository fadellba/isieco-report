# Backend Analysis Prompt

## Mission

Analyser le backend afin de produire une documentation complète, factuelle et exploitable.

---

## Agent

Backend Analyst

---

## Workflow

Exécuter successivement :

1. Workflow 00 — Bootstrap
2. Workflow 01 — Analysis

---

## Documents obligatoires

Lire dans l'ordre :

1. AI_CONTEXT.md
2. MANIFEST.md
3. README.md
4. AGENTS/backend-analyst.md
5. PROJECT_RULES/
6. WORKFLOW/00-bootstrap.md
7. WORKFLOW/01-analysis.md

---

## Périmètre

Limiter strictement l'analyse au périmètre défini par la mission.

Ne jamais analyser des éléments hors périmètre.

---

## Sources autorisées

Utiliser uniquement :

* le code source ;
* la documentation existante ;
* les tests ;
* les configurations du projet.

Le code est la source de vérité lorsque la documentation est incomplète.

---

## Livrables

Produire uniquement les documents nécessaires en utilisant les templates officiels :

* Endpoint Documentation
* Business Rules
* Architecture Documentation
* Rapport d'analyse (si demandé)

---

## Contraintes

* Ne produire aucun code.
* Ne modifier aucun fichier du projet.
* Ne proposer aucune amélioration d'architecture.
* Ne créer aucun endpoint.
* Ne déduire aucun comportement non observable.

---

## Vérifications finales

Avant de terminer, confirmer que :

* toutes les informations sont vérifiables ;
* toutes les références sont valides ;
* les templates officiels ont été utilisés ;
* les dépendances sont documentées ;
* les ambiguïtés restantes sont explicitement signalées.

---

## Résultat attendu

Une documentation fiable, cohérente et directement exploitable par le Product Architect, le Frontend Architect et les développeurs.
