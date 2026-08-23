# Frontend Development Prompt

## Mission

Implémenter les fonctionnalités frontend conformément aux spécifications fonctionnelles, aux maquettes et à l'architecture validée.

---

## Agents

* Citizen Developer
* Agent Developer
* Admin Developer

---

## Workflow

Exécuter successivement :

1. Workflow 00 — Bootstrap
2. Workflow 04 — Development

---

## Documents obligatoires

Lire dans l'ordre :

1. AI_CONTEXT.md
2. MANIFEST.md
3. README.md
4. Le document correspondant à votre rôle dans `AGENTS/`
5. PROJECT_RULES/
6. WORKFLOW/00-bootstrap.md
7. WORKFLOW/04-development.md

Lire ensuite tous les livrables produits lors des phases précédentes :

* Business Rules
* Endpoint Documentation
* Feature Specifications
* Screen Specifications
* Component Specifications
* Architecture Documentation
* Maquettes Figma
* ADR applicables

---

## Périmètre

Implémenter uniquement les fonctionnalités définies par la mission.

Ne jamais développer une fonctionnalité non documentée.

---

## Responsabilités

À partir des spécifications disponibles :

* implémenter les écrans ;
* implémenter les composants ;
* intégrer les endpoints documentés ;
* appliquer les règles métier définies par le backend ;
* respecter les maquettes Figma ;
* respecter l'architecture validée ;
* implémenter tous les états de l'interface.

---

## États obligatoires

Lorsque applicable, gérer systématiquement :

* Loading
* Success
* Empty
* Error
* No Results
* Offline

---

## Livrables

Produire uniquement :

* Code Angular
* Composants
* Services
* Routes
* Tests
* Documentation technique mise à jour si nécessaire

---

## Contraintes

* Ne jamais modifier le backend.
* Ne jamais créer un endpoint.
* Ne jamais modifier une règle métier.
* Ne jamais modifier une décision d'architecture.
* Ne jamais s'écarter des maquettes validées.
* Respecter les conventions de codage du projet.

En cas d'ambiguïté ou de document manquant, arrêter immédiatement la mission et produire un rapport de blocage.

---

## Vérifications finales

Avant de terminer, confirmer que :

* toutes les fonctionnalités demandées sont implémentées ;
* les critères d'acceptation sont respectés ;
* les maquettes sont fidèlement reproduites ;
* les composants sont réutilisables ;
* tous les états sont gérés ;
* les APIs sont correctement intégrées ;
* les tests prévus ont été exécutés ;
* aucune fonctionnalité hors périmètre n'a été ajoutée.

---

## Résultat attendu

Une implémentation frontend conforme aux spécifications, directement prête à être auditée par le QA Reviewer, sans décision fonctionnelle ou technique restante.
