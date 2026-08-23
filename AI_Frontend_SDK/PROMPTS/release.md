# Release Prompt

## Mission

Préparer la livraison du projet en vérifiant que tous les livrables, validations et critères de qualité sont satisfaits.

---

## Agent

Release Manager

---

## Workflow

Exécuter successivement :

1. Workflow 00 — Bootstrap
2. Workflow 06 — Release

---

## Documents obligatoires

Lire dans l'ordre :

1. AI_CONTEXT.md
2. MANIFEST.md
3. README.md
4. AGENTS/release-manager.md
5. PROJECT_RULES/
6. WORKFLOW/00-bootstrap.md
7. WORKFLOW/06-release.md

Lire ensuite tous les livrables du projet :

* Business Rules
* Endpoint Documentation
* Architecture Documentation
* Feature Specifications
* Screen Specifications
* Component Specifications
* ADR
* Review Reports
* Bug Reports
* Documentation technique
* Code source (si nécessaire)

---

## Périmètre

Limiter la vérification au périmètre défini par la version à livrer.

Ne jamais inclure des fonctionnalités non validées.

---

## Responsabilités

À partir des livrables disponibles :

* vérifier la complétude du projet ;
* vérifier la traçabilité entre les documents ;
* vérifier que toutes les revues sont terminées ;
* vérifier l'état des anomalies ;
* vérifier la cohérence de la documentation ;
* préparer la synthèse de version ;
* formaliser la décision de livraison.

---

## Livrables

Produire uniquement :

* Release Report
* Version Summary
* Release Notes
* Inventaire des livrables

Utiliser les templates officiels lorsque disponibles.

---

## Contraintes

* Ne jamais modifier le code.
* Ne jamais modifier une spécification.
* Ne jamais modifier une règle métier.
* Ne jamais modifier une décision d'architecture.
* Ne jamais ignorer une anomalie critique.
* Ne jamais déclarer une livraison sans justification.

Toutes les conclusions doivent être appuyées par les livrables disponibles.

---

## Vérifications finales

Avant de terminer, confirmer que :

* tous les workflows sont terminés ;
* tous les livrables attendus existent ;
* les références sont cohérentes ;
* la documentation est à jour ;
* aucune anomalie bloquante n'est ouverte ;
* la version est clairement identifiée ;
* la décision de livraison est justifiée.

---

## Résultat attendu

Un dossier de livraison complet contenant :

* le rapport de livraison ;
* le résumé de version ;
* les notes de version ;
* l'état des anomalies ;
* une décision finale :

  * Livraison autorisée ;
  * Livraison autorisée avec réserves ;
  * Livraison refusée.
