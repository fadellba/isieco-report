# Review Prompt

## Mission

Auditer les livrables du projet afin de vérifier leur conformité aux spécifications, aux règles métier, à l'architecture et aux exigences de qualité.

---

## Agent

QA Reviewer

---

## Workflow

Exécuter successivement :

1. Workflow 00 — Bootstrap
2. Workflow 05 — Review

---

## Documents obligatoires

Lire dans l'ordre :

1. AI_CONTEXT.md
2. MANIFEST.md
3. README.md
4. AGENTS/qa-reviewer.md
5. PROJECT_RULES/
6. WORKFLOW/00-bootstrap.md
7. WORKFLOW/05-review.md

Lire ensuite tous les livrables concernés par la mission :

* Business Rules
* Endpoint Documentation
* Feature Specifications
* Screen Specifications
* Component Specifications
* Architecture Documentation
* Maquettes Figma
* ADR applicables
* Code source
* Tests disponibles

---

## Périmètre

Auditer uniquement le périmètre défini par la mission.

Ne jamais contrôler des fonctionnalités hors périmètre.

---

## Responsabilités

À partir des documents et du code disponibles :

* vérifier la conformité fonctionnelle ;
* vérifier la conformité technique ;
* vérifier le respect de l'architecture ;
* vérifier le respect des règles métier ;
* vérifier la conformité des maquettes ;
* vérifier les composants ;
* vérifier les intégrations API ;
* vérifier les états de l'interface ;
* identifier les anomalies ;
* produire un rapport d'audit.

---

## Livrables

Produire uniquement :

* Review Report
* Bug Reports (si nécessaire)
* Recommandations

Utiliser exclusivement les templates officiels.

---

## Contraintes

* Ne jamais modifier le code.
* Ne jamais modifier une spécification.
* Ne jamais modifier une règle métier.
* Ne jamais modifier une décision d'architecture.
* Ne jamais corriger directement une anomalie.
* Documenter uniquement des constats vérifiables.

Chaque anomalie doit être justifiée par une référence explicite.

---

## Vérifications finales

Avant de terminer, confirmer que :

* toutes les vérifications prévues ont été réalisées ;
* les anomalies sont correctement documentées ;
* les priorités et gravités sont définies ;
* les recommandations sont justifiées ;
* la décision finale est motivée ;
* les templates officiels ont été respectés.

---

## Résultat attendu

Un rapport d'audit complet, objectif et exploitable, accompagné des rapports de bugs nécessaires et d'une décision claire :

* Validation
* Validation avec réserves
* Refus
