# PROJECT RULES — Architecture Principles

Version : 1.0

---

# Objectif

Ce document définit les principes d'architecture obligatoires applicables à l'ensemble du projet frontend.

Ces principes s'appliquent à toute décision d'architecture, toute organisation de code et toute évolution technique.

En cas de conflit, l'ordre de priorité documentaire défini dans `PROJECT_RULES/coding-standards.md` s'applique.

---

# Principes fondamentaux

## 1. Backend source de vérité

Le backend Laravel est l'unique source de vérité métier.

Le frontend :

* consomme les API existantes ;
* présente les données ;
* applique les règles d'affichage ;
* gère les interactions utilisateur.

Le frontend ne doit jamais :

* reproduire une logique métier ;
* inventer une règle fonctionnelle ;
* recalculer une donnée métier ;
* modifier le sens des données reçues.

---

## 2. Documentation first

Aucune implémentation ne commence sans documentation préalable.

L'ordre est :

Comprendre → Documenter → Concevoir → Implémenter → Vérifier

Toute fonctionnalité non documentée est considérée comme inexistante.

---

## 3. Architecture Feature-Based

L'application est découpée par fonctionnalités :

* core/ (technique, sans métier)
* shared/ (réutilisable, sans métier)
* layouts/ (structures d'écran)
* features/ (fonctionnalités métier)

Chaque fonctionnalité appartient à une seule Feature.

Les fonctionnalités ne dépendent pas directement les unes des autres.

---

## 4. Responsabilité unique

Chaque élément (composant, service, module, dossier) possède une responsabilité unique et explicite.

Éviter :

* les composants surchargés ;
* les services "fourre-tout" ;
* les responsabilités multiples.

---

## 5. Standalone et Signaux

Le projet utilise exclusivement :

* Standalone Components ;
* Angular Signals pour l'état local ;
* RxJS uniquement lorsque nécessaire (HTTP, streams, interop).

Les NgModules sont interdits, sauf exception documentée.

---

## 6. Design System unique

Tous les composants UI proviennent du Design System Figma.

Il est interdit de recréer un composant existant.

Le Design System est la source de vérité visuelle.

---

## 7. Réutilisation systématique

Toujours rechercher un composant, un service ou une fonction existante avant d'en créer un nouveau.

Ne jamais dupliquer une logique existante.

---

## 8. Séparation stricte des rôles

Chaque agent intervient uniquement dans son périmètre.

Un agent ne remplace jamais un autre agent.

Toute évolution hors périmètre est proposée et documentée, jamais implémentée directement.

---

## 9. Responsive par espace

Citizen et Agent : Mobile First.

Admin : Desktop First.

Le responsive est obligatoire sur l'ensemble de l'application.

---

## 10. Qualité avant rapidité

La rapidité d'exécution ne compromet jamais :

* la compréhension ;
* la cohérence ;
* la maintenabilité ;
* la qualité finale.

---

# Décisions d'architecture

Toute décision d'architecture significative doit être :

* justifiée ;
* documentée (ADR) ;
* traçable (références FEAT, SCR, API, BR).

Utiliser `TEMPLATES/review/decision-record-template.md`.

---

# Interdictions

Il est interdit de :

* modifier l'architecture sans décision documentée ;
* déplacer une logique métier dans le frontend ;
* créer un couplage entre fonctionnalités ;
* introduire un second style d'architecture ;
* contourner un principe défini dans ce document.

---

# Definition of Done

Une décision d'architecture est considérée comme terminée lorsque :

* elle respecte les principes de ce document ;
* elle est documentée et justifiée ;
* elle est compatible avec l'existant ;
* elle est traçable ;
* elle ne crée aucune régression.
