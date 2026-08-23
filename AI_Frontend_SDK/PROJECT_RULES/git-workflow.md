# PROJECT RULES — Git Workflow

Version : 1.0

---

# Objectif

Ce document définit les règles de versionnement et de travail collaboratif applicables à tous les agents IA intervenant sur le projet.

Ces règles sont obligatoires.

---

# Principes

Chaque modification doit être :

* limitée au périmètre de la mission ;
* traçable ;
* versionnée ;
* réversible.

Le dépôt Git est la mémoire du projet.

---

# Branches

## Branches permanentes

* `main` : version stable, prête à être livrée ;
* `develop` : intégration des fonctionnalités validées.

## Branches de travail

Chaque mission s'effectue sur une branche dédiée :

* `feature/<périmètre>-<sujet>` pour les fonctionnalités ;
* `fix/<périmètre>-<sujet>` pour les corrections ;
* `docs/<sujet>` pour la documentation.

Une branche de travail est créée à partir de `develop`.

---

# Messages de commit

Les messages de commit respectent le format :

```
<type>(<périmètre>): <description courte>
```

Types autorisés :

* `feat` : nouvelle fonctionnalité ;
* `fix` : correction ;
* `docs` : documentation ;
* `refactor` : refactorisation ;
* `test` : tests ;
* `chore` : tâche technique.

La description est :

* en français ;
* courte ;
* explicite ;
* sans détail d'implémentation.

Exemple :

```
feat(citizen): ajouter l'écran de création d'un signalement
```

---

# Règles obligatoires

L'agent ne doit jamais :

* committer sans mission explicite ;
* committer des fichiers hors périmètre ;
* committer des secrets ou informations sensibles ;
* committer directement sur `main` ;
* pousser une branche non validée ;
* modifier l'historique public ;
* committer du code non fonctionnel ou des livrables incomplets.

---

# Processus de revue

Avant toute fusion :

1. la mission doit être terminée ;
2. la revue (Workflow 05) doit avoir été réalisée ;
3. aucune anomalie bloquante ne doit être ouverte ;
4. la branche doit être à jour avec `develop`.

La fusion sur `develop` intervient après validation.

La fusion sur `main` intervient uniquement lors d'une release (Workflow 06).

---

# Étiquettes et versionnement

Les releases suivent la convention de versionnement du SDK.

Chaque release produit :

* un numéro de version ;
* une entrée dans le CHANGELOG ;
* des notes de version.

---

# Interdictions

Il est interdit de :

* forcer une fusion sans validation ;
* contourner une revue ;
* masquer un état de travail par un commit incomplet ;
* committer des fichiers générés ou temporaires.

---

# Definition of Done

Une modification Git est considérée comme terminée lorsque :

* la branche respecte la convention de nommage ;
* les messages de commit sont conformes ;
* le périmètre de la mission est respecté ;
* la revue est validée ;
* la fusion est tracée.
