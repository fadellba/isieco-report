# Feature Template

---

# Informations générales

## Identifiant

<!-- FEAT-001 -->

---

## Nom

<!-- Exemple : Création d'un signalement -->

---

## Module

* Citizen
* Agent
* Admin
* Shared

---

## Description

Décrire la fonctionnalité en termes métier.

Ne pas décrire l'implémentation technique.

---

# Objectif

Quel besoin utilisateur cette fonctionnalité satisfait-elle ?

Quelle valeur apporte-t-elle ?

---

# Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Priorité

* Critique
* Haute
* Moyenne
* Faible

---

# Dépendances

## Fonctionnelles

Lister les fonctionnalités nécessaires avant celle-ci.

Exemple :

* Authentification
* Gestion des profils

---

## Techniques

Lister les dépendances techniques :

* Endpoint(s)
* Composant(s)
* Service(s)
* Librairie(s)

---

# Références

## Business Rules

* BR-...

---

## Endpoints

* API-...

---

## Screens

* SCR-...

---

## Components

* CMP-...

---

## Décisions

* ADR-...

---

# Fonctionnement

Décrire le comportement attendu de bout en bout.

Le texte doit être compréhensible par une personne non technique.

---

# Flux utilisateur

Décrire le parcours complet.

Exemple :

1. L'utilisateur ouvre l'écran.
2. Il saisit les informations.
3. Il valide.
4. L'application appelle l'API.
5. Le résultat est affiché.

---

# Cas d'utilisation

## Cas nominal

Décrire le scénario principal.

---

## Cas alternatifs

Décrire les scénarios secondaires.

---

## Cas d'erreur

Décrire les scénarios d'échec.

---

# API

| Endpoint | Méthode | Utilisation |
| -------- | ------- | ----------- |

Uniquement les endpoints existants.

---

# Interface utilisateur

Écrans concernés :

* ...

Composants utilisés :

* ...

---

# États

Prévoir :

* Loading
* Success
* Empty
* Error
* No Results (si applicable)
* Offline (si applicable)

---

# Validation

Lister les validations visibles côté utilisateur.

Les validations métier restent côté backend.

---

# Messages utilisateur

Lister les messages :

* succès ;
* erreur ;
* confirmation ;
* avertissement.

---

# Responsive

Comportement attendu sur :

* Mobile
* Tablet
* Desktop

---

# Accessibilité

Préciser les exigences particulières.

---

# Performance

Contraintes éventuelles :

* pagination ;
* lazy loading ;
* virtualisation ;
* cache.

---

# Sécurité

Décrire :

* authentification requise ;
* rôles autorisés ;
* permissions.

Le backend reste la source de vérité.

---

# Critères d'acceptation

* [ ] La fonctionnalité répond au besoin métier.
* [ ] Les écrans sont conformes à Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Les règles métier sont respectées.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] L'accessibilité est respectée.
* [ ] Les performances sont acceptables.
* [ ] Aucun comportement non documenté n'a été ajouté.

---

# Tests

## Tests fonctionnels

Lister les scénarios à vérifier.

---

## Tests d'intégration

Décrire les interactions avec le backend.

---

## Tests de régression

Identifier les fonctionnalités susceptibles d'être impactées.

---

# Livrables

* Code Angular
* Tests
* Documentation
* Mise à jour des références si nécessaire

---

# Historique

Auteur :

Version :

Date :

---

# Statut

* À faire
* En cours
* À revoir
* Validé
* Livré
