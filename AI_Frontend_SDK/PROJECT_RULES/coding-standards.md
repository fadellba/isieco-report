# PROJECT RULES — Coding Standards

Version : 1.0

---

# Objectif

Ce document définit les règles générales de qualité applicables à tous les agents IA intervenant sur le projet.

Ces règles sont obligatoires.

En cas de conflit entre plusieurs documents, l'ordre de priorité est :

1. README.md
2. AI_CONTEXT.md
3. PROJECT_RULES/
4. WORKFLOW/
5. TEMPLATES/
6. PROMPTS/
7. AGENTS/
8. docs/

---

# Principes

Chaque modification doit être :

* simple ;
* lisible ;
* cohérente ;
* maintenable ;
* documentée lorsque nécessaire.

Toujours privilégier la simplicité.

---

# Responsabilité

Chaque agent est responsable uniquement de son périmètre.

Un agent ne doit jamais modifier le travail d'un autre agent sauf si cela fait explicitement partie de sa mission.

---

# Lisibilité

Le code doit être :

* explicite ;
* auto-documenté ;
* facilement compréhensible.

Éviter les abréviations.

Utiliser des noms explicites.

---

# Duplication

Ne jamais dupliquer une logique existante.

Toujours rechercher un composant, un service ou une fonction existante avant d'en créer un nouveau.

---

# Réutilisation

Privilégier :

* composants réutilisables ;
* fonctions réutilisables ;
* services partagés.

Éviter les implémentations spécifiques lorsqu'une solution générique existe.

---

# Cohérence

Respecter :

* l'architecture existante ;
* les conventions du projet ;
* le Design System ;
* les règles métier.

Ne jamais introduire un second style de développement.

---

# Documentation

Toute décision importante doit être documentée.

Les hypothèses doivent être explicitement indiquées.

Aucune hypothèse ne doit être présentée comme un fait.

---

# Gestion des erreurs

Ne jamais masquer une erreur.

Les erreurs doivent :

* être propagées correctement ;
* être traitées au niveau approprié ;
* conserver leur sens métier.

Ne jamais remplacer une erreur métier par une erreur générique.

---

# Performance

Éviter :

* les traitements inutiles ;
* les appels API redondants ;
* les re-rendus inutiles ;
* les composants surchargés.

La lisibilité reste prioritaire sur une optimisation prématurée.

---

# Sécurité

Ne jamais :

* contourner une règle métier ;
* contourner une autorisation ;
* exposer une information sensible.

Le backend est la source de vérité.

---

# Évolutivité

Toute nouvelle implémentation doit pouvoir être étendue sans réécriture importante.

Privilégier les solutions modulaires.

---

# Tests

Lorsqu'ils sont prévus :

* écrire des tests lisibles ;
* tester les comportements ;
* éviter les tests fragiles.

---

# Revue

Avant de considérer une tâche terminée, vérifier :

* conformité avec AI_CONTEXT.md ;
* respect des conventions ;
* absence de duplication ;
* absence de code mort ;
* absence de TODO oubliés.

---

# Interdictions

Il est interdit de :

* inventer un endpoint ;
* inventer une règle métier ;
* modifier le backend sans mission explicite ;
* modifier les maquettes Figma sans mission explicite ;
* contourner une règle définie dans PROJECT_RULES.

---

# Definition of Done

Une tâche est considérée comme terminée uniquement si :

* les conventions sont respectées ;
* le code est lisible ;
* aucune régression connue n'a été introduite ;
* les livrables demandés sont complets ;
* les hypothèses sont documentées ;
* les modifications restent dans le périmètre de la mission.
