# Business Rule Template

---

# Business Rule

## Identifiant

<!-- Exemple : BR-001 -->

---

## Nom

<!-- Nom court de la règle -->

---

## Domaine

<!--
Citizen
Agent
Administration
Signalement
Intervention
Authentification
Statistiques
... -->

---

## Description

Décrire la règle métier avec un langage fonctionnel.

Ne jamais décrire l'implémentation.

---

# Objectif

Pourquoi cette règle existe-t-elle ?

Quel besoin métier satisfait-elle ?

---

# Acteurs concernés

* Citizen
* Agent
* Administrator
* Système

Cocher uniquement les acteurs concernés.

---

# Déclencheur

À quel moment cette règle est-elle exécutée ?

Exemples :

* Création d'un signalement
* Affectation
* Validation
* Clôture
* Connexion

---

# Préconditions

Lister toutes les conditions nécessaires avant l'exécution.

Exemple :

* utilisateur authentifié ;
* signalement existant ;
* intervention assignée.

---

# Règle métier

Décrire précisément :

SI ...

ALORS ...

SINON ...

Une règle doit être compréhensible sans lire le code.

---

# Cas d'échec

Décrire :

* les situations invalides ;
* les exceptions levées ;
* les erreurs retournées.

Ne pas inventer de comportements.

---

# Résultat attendu

Décrire le résultat obtenu lorsque la règle est respectée.

---

# Exceptions métier

Lister les exceptions métier concernées.

Exemple :

* ReportAlreadyAssignedException
* InvalidStatusTransitionException

---

# Données concernées

Lister les entités impactées.

Exemple :

* Report
* User
* Intervention

---

# Services concernés

Lister les Services Laravel impliqués.

---

# Controllers concernés

Lister les Controllers concernés.

---

# Endpoints concernés

Lister les endpoints qui déclenchent cette règle.

---

# Écrans Frontend concernés

Lister les écrans qui dépendent directement de cette règle.

Exemple :

* Création d'un signalement
* Tableau de bord Agent
* Détail Intervention

---

# Cas de test

## Cas nominal

Décrire un scénario valide.

---

## Cas limite

Décrire les limites.

---

## Cas d'erreur

Décrire les scénarios invalides.

---

# Références

Controller :

Service :

Repository :

Policy :

Exception :

Tests :

Documentation :

---

# Impact

Décrire les impacts éventuels :

* fonctionnels ;
* techniques ;
* UX.

---

# Historique

Version :

Auteur :

Date :

---

# Statut

* Vérifiée
* À confirmer
* Obsolète

---

# Notes

Uniquement des informations vérifiées dans le backend.

Aucune supposition.
