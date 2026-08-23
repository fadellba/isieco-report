# Screen Specification Template

---

# Informations générales

## Identifiant

<!-- SCR-001 -->

---

## Nom de l'écran

<!-- Exemple : Dashboard Citizen -->

---

## Module

* Citizen
* Agent
* Admin

---

## Objectif

Décrire l'objectif métier de cet écran.

Une phrase suffit.

---

## Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Description

Décrire le rôle de l'écran dans le parcours utilisateur.

Ne pas parler d'implémentation.

---

# Parcours utilisateur

Écran précédent :

...

↓

Écran actuel

↓

Écran suivant

...

---

# Navigation

## Entrées

Depuis quels écrans peut-on accéder ici ?

---

## Sorties

Vers quels écrans peut-on naviguer ?

---

# Permissions

Conditions nécessaires :

* authentification ;
* rôle ;
* permissions ;
* autres contraintes.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |

Uniquement les endpoints existants.

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |

Exemple :

Créer

Modifier

Supprimer

Filtrer

Partager

Téléverser

---

# États de l'écran

Prévoir obligatoirement :

## Loading

Comportement attendu.

---

## Success

Comportement attendu.

---

## Empty

Comportement attendu.

---

## Error

Comportement attendu.

---

## No Results

Si applicable.

---

## Offline

Si applicable.

---

# Validations

Lister uniquement les validations visibles côté utilisateur.

Les validations métier restent dans le backend.

---

# Messages utilisateur

Lister :

* succès ;
* erreurs ;
* confirmations ;
* avertissements.

---

# Composants UI

Lister les composants du Design System utilisés.

Exemple :

* Page Header
* Button
* Card
* Input
* KPI Card
* Table
* Modal
* Empty State
* Snackbar

---

# Responsive

Décrire le comportement :

Mobile

Tablet

Desktop

---

# Accessibilité

Préciser les exigences particulières.

Exemple :

* navigation clavier ;
* focus ;
* lecteurs d'écran ;
* contraste.

---

# Performance

Contraintes éventuelles :

* pagination ;
* lazy loading ;
* virtual scroll ;
* chargement progressif.

---

# Cas limites

Décrire :

* aucune donnée ;
* données volumineuses ;
* erreur réseau ;
* permissions insuffisantes.

---

# Dépendances

Lister :

* autres écrans ;
* composants ;
* services.

---

# Maquette Figma

Lien :

Page :

Frame :

Version :

---

# Références Backend

Controller :

Service :

Policy :

Resource :

Exception :

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées.

---

# Hypothèses

Aucune hypothèse ne doit être implicite.

Les documenter explicitement.

---

# Décisions

Lister les décisions prises pendant la conception.

---

# Historique

Auteur :

Version :

Date :

---

# Statut

* Brouillon
* Validé
* Implémenté
* Vérifié
