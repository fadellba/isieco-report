# Workflow 00 — Bootstrap

Version : 1.0

---

# Objectif

Initialiser une mission avant toute analyse, conception, développement ou revue.

Ce workflow est obligatoire pour tous les agents.

Aucun travail ne doit commencer sans avoir exécuté cette procédure.

---

# Entrées

L'agent reçoit :

* une mission ;
* le dépôt du projet ;
* le framework AI SDK.

---

# Résultat attendu

À la fin du bootstrap, l'agent doit être capable de répondre à ces questions :

* Quel est l'objectif de la mission ?
* Quel est mon rôle ?
* Quels documents dois-je utiliser ?
* Quelles sont mes limites ?
* Quels livrables dois-je produire ?
* Puis-je commencer à travailler ?

---

# Étape 1 — Comprendre la mission

Lire entièrement la mission.

Identifier :

* l'objectif ;
* le périmètre ;
* les contraintes ;
* les livrables attendus.

Ne jamais faire d'hypothèse.

En cas d'ambiguïté, arrêter la mission et produire un rapport.

---

# Étape 2 — Identifier son rôle

Lire le document correspondant dans :

AGENTS/

Identifier :

* responsabilités ;
* limites ;
* livrables ;
* dépendances.

Ne jamais exécuter une responsabilité appartenant à un autre agent.

---

# Étape 3 — Charger le contexte

Lire :

* AI_CONTEXT.md
* MANIFEST.md
* README.md

Comprendre :

* le projet ;
* la stack technique ;
* l'architecture générale ;
* les conventions.

---

# Étape 4 — Charger les règles

Lire intégralement :

PROJECT_RULES/

Appliquer toutes les règles sans exception.

---

# Étape 5 — Vérifier les dépendances

Identifier tous les prérequis nécessaires.

Exemples :

* documentation ;
* endpoints ;
* maquettes ;
* décisions ;
* règles métier ;
* composants.

---

# Étape 6 — Vérifier les livrables existants

Consulter :

docs/

OUTPUT/

Identifier les documents déjà produits.

Ne jamais recréer un livrable existant.

---

# Étape 7 — Vérifier les blocages

Si une dépendance est absente :

* arrêter immédiatement la mission ;
* documenter le blocage ;
* ne produire aucun code ni document incomplet.

---

# Étape 8 — Préparer la mission

Identifier :

* documents à consulter ;
* templates à utiliser ;
* livrables à produire.

---

# Étape 9 — Validation avant exécution

Avant de commencer, confirmer que :

* toutes les dépendances sont disponibles ;
* le périmètre est clair ;
* les documents nécessaires existent ;
* aucun blocage n'est identifié.

---

# Étape 10 — Exécution

Commencer uniquement après validation des étapes précédentes.

Respecter :

* AI_CONTEXT.md
* AGENTS/
* PROJECT_RULES/
* TEMPLATES/

---

# Règles obligatoires

L'agent ne doit jamais :

* inventer une API ;
* inventer une règle métier ;
* modifier le périmètre ;
* ignorer une dépendance ;
* contourner une règle du framework.

---

# Sorties

Le bootstrap produit :

* une mission validée ; ou
* un rapport de blocage.

---

# Critères de réussite

* [ ] Mission comprise
* [ ] Rôle identifié
* [ ] Contexte chargé
* [ ] Règles appliquées
* [ ] Dépendances vérifiées
* [ ] Livrables identifiés
* [ ] Aucun blocage
* [ ] Mission autorisée à démarrer
