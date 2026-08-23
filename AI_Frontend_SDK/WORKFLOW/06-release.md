# Workflow 06 — Release

Version : 1.0

---

# Objectif

Préparer la livraison du projet en vérifiant que toutes les phases précédentes sont terminées, cohérentes et validées.

Ce workflow est destiné à l'agent Release Manager (`AGENTS/release-manager.md`), responsable de la livraison du projet.

---

# Prérequis

Les workflows suivants doivent être terminés :

* Workflow 00 — Bootstrap
* Workflow 01 — Analysis
* Workflow 02 — Design
* Workflow 03 — Architecture
* Workflow 04 — Development
* Workflow 05 — Review

Toutes les anomalies bloquantes doivent être corrigées ou explicitement acceptées.

---

# Entrées

L'agent reçoit :

* Documentation complète
* Code source
* Rapports de revue
* Rapports de bugs
* AI SDK

---

# Résultat attendu

À la fin de cette phase :

* le projet est prêt à être livré ;
* la documentation est cohérente ;
* les décisions sont tracées ;
* le statut de la version est clairement établi.

---

# Étape 1 — Vérifier les livrables

Contrôler que tous les livrables attendus existent.

Exemples :

* documentation d'analyse ;
* spécifications ;
* architecture ;
* code ;
* tests ;
* rapports de revue.

---

# Étape 2 — Vérifier la traçabilité

Contrôler les liens entre :

* Business Rules ;
* Endpoints ;
* Features ;
* Screens ;
* Components ;
* ADR ;
* Reviews ;
* Bugs.

Identifier toute référence manquante.

---

# Étape 3 — Vérifier les anomalies

Consulter les Bug Reports.

Identifier :

* bugs ouverts ;
* bugs corrigés ;
* bugs acceptés.

Vérifier qu'aucune anomalie critique ou bloquante ne reste ouverte.

---

# Étape 4 — Vérifier la documentation

Contrôler que la documentation est :

* complète ;
* cohérente ;
* à jour ;
* conforme aux templates.

---

# Étape 5 — Vérifier la qualité globale

Contrôler notamment :

* cohérence fonctionnelle ;
* cohérence technique ;
* conformité aux règles du projet ;
* conformité aux décisions d'architecture.

---

# Étape 6 — Préparer la version

Documenter :

* numéro de version ;
* périmètre livré ;
* principales fonctionnalités ;
* limitations connues ;
* anomalies acceptées.

---

# Étape 7 — Produire le rapport de livraison

Le rapport doit contenir :

* résumé de la version ;
* livrables inclus ;
* éléments exclus ;
* risques connus ;
* recommandations.

---

# Étape 8 — Décision de livraison

Choisir une décision :

* Livraison autorisée
* Livraison autorisée avec réserves
* Livraison refusée

Justifier systématiquement la décision.

---

# Livrables

Selon la mission :

* Rapport de livraison
* Inventaire des livrables
* État des anomalies
* Synthèse de la version

---

# Critères de réussite

* [ ] Tous les workflows sont terminés.
* [ ] Tous les livrables existent.
* [ ] La documentation est cohérente.
* [ ] La traçabilité est complète.
* [ ] Aucun bug bloquant n'est ouvert.
* [ ] Les décisions sont documentées.
* [ ] La version est prête à être livrée.

---

# Règles obligatoires

L'agent ne doit jamais :

* modifier le code ;
* modifier une spécification ;
* modifier une décision d'architecture ;
* ignorer une anomalie bloquante ;
* déclarer une livraison sans justification.

Son rôle est exclusivement de vérifier la préparation de la livraison et de formaliser la décision.

---

# Sortie

À l'issue de ce workflow, le projet est soit déclaré prêt à être livré, soit retourné aux phases précédentes avec les actions correctives clairement identifiées.
