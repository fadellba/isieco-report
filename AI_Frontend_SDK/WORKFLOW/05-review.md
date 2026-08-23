# Workflow 05 — Review

Version : 1.0

---

# Objectif

Vérifier que les livrables sont conformes aux spécifications, aux règles du projet et aux critères de qualité avant leur validation.

Ce workflow est destiné au :

* QA Reviewer

---

# Prérequis

Les workflows suivants doivent être terminés :

* Workflow 00 — Bootstrap
* Workflow 01 — Analysis
* Workflow 02 — Design
* Workflow 03 — Architecture
* Workflow 04 — Development

Tous les livrables doivent être disponibles.

---

# Entrées

L'agent reçoit :

* Feature Specifications
* Screen Specifications
* Component Specifications
* Architecture Documentation
* Business Rules
* Documentation des Endpoints
* Code source
* Tests
* AI SDK

---

# Résultat attendu

À la fin de cette phase, chaque livrable est :

* validé ;
* validé avec réserves ; ou
* refusé.

Les anomalies sont documentées et priorisées.

---

# Étape 1 — Définir le périmètre

Identifier précisément :

* les fonctionnalités ;
* les écrans ;
* les composants ;
* les APIs ;
* les documents concernés.

Ne jamais auditer un élément hors périmètre.

---

# Étape 2 — Vérifier la conformité fonctionnelle

Comparer le résultat obtenu avec :

* Business Rules ;
* Feature Specifications ;
* Screen Specifications.

Contrôler que le comportement est conforme.

---

# Étape 3 — Vérifier la conformité technique

Contrôler notamment :

* architecture ;
* organisation du code ;
* réutilisation des composants ;
* respect des conventions ;
* intégration des APIs.

---

# Étape 4 — Vérifier l'expérience utilisateur

Contrôler :

* conformité aux maquettes Figma ;
* navigation ;
* responsive ;
* accessibilité ;
* cohérence visuelle.

---

# Étape 5 — Vérifier les cas limites

Contrôler tous les états documentés :

* Loading
* Success
* Empty
* Error
* No Results
* Offline

Vérifier également les cas d'erreur et les validations.

---

# Étape 6 — Identifier les anomalies

Pour chaque anomalie :

* documenter le problème ;
* attribuer une gravité ;
* identifier les références concernées ;
* utiliser le Bug Report Template.

Ne jamais corriger directement le code.

---

# Étape 7 — Produire la revue

Utiliser exclusivement :

* review-template.md
* bug-report-template.md

Le rapport doit être factuel et vérifiable.

---

# Étape 8 — Décision

Choisir une décision :

* Validation
* Validation avec réserves
* Refus

Justifier systématiquement la décision.

---

# Étape 9 — Runbook de synchronisation avec le backend

Déclencheurs : toute modification du backend Laravel qui touche le contrat d'intégration.

## Déclencheurs typiques

* `routes/api.php` (endpoints ajoutés, supprimés, renommés, middleware changés) ;
* `app/Enums/*` (valeurs de `statut`, `priorite`, `dangerosite`, `role`) ;
* `app/Policies/*` (règles d'accès) ;
* `database/migrations/*` (colonnes, contraintes, pivots) ;
* `app/Http/Resources/*` (champs exposés — ex. `UserResource`) ;
* `database/seeders/*` (référentiels : zones, types de déchets).

## Procédure

1. Lancer `tools/check-consistency.ps1` (cohérence des versions, références internes, identifiants BR/SCR/CMP/UF/RG, placeholders) — le script doit passer avant toute re-analyse.
2. Re-scanner les routes : `php artisan route:list` — comparer avec la liste des endpoints de `docs/01-analysis/api-analysis.md`.
3. Mettre à jour `api-analysis.md` : sections endpoints, § 7 (colonnes/resources), § 8 (ambiguïtés) et § 9 bis (contrat d'intégration).
4. Vérifier `docs/01-analysis/business-rules.md` : règles `BR-*` et correspondance `RG ↔ BR` ; tout changement d'enum ou de transition doit être répercuté.
5. Vérifier les specs écrans et composants concernés (`Dépendances`, `Hypothèses`, `Critères d'acceptation`).
6. Si une exigence du cahier des charges est impactée : relancer la vérification tripartite (cahier des charges ↔ backend ↔ SDK) et mettre à jour le rapport de conformité.
7. Re-auditer les livrables touchés (voir Étape 6) — ne jamais corriger directement le code.

---

# Livrables

Selon la mission :

* Rapport de revue
* Rapports de bugs
* Recommandations

---

# Critères de réussite

* [ ] Toutes les fonctionnalités ont été vérifiées.
* [ ] Les spécifications sont respectées.
* [ ] Les règles métier sont respectées.
* [ ] Les anomalies sont documentées.
* [ ] Les recommandations sont justifiées.
* [ ] La décision finale est motivée.

---

# Règles obligatoires

L'agent ne doit jamais :

* modifier le code ;
* modifier une spécification ;
* modifier une règle métier ;
* approuver un comportement non documenté ;
* ignorer une anomalie critique.

Son rôle est exclusivement de contrôler et documenter.

---

# Sortie

À l'issue de ce workflow, le projet dispose d'une décision de validation accompagnée des rapports de revue et des éventuels rapports de bugs.
