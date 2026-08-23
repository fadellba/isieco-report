# Screen Specification

# Informations générales

## Identifiant

SCR-012

## Nom de l'écran

Gestion des référentiels (zones et types de déchets)

## Module

* Admin

## Objectif

Permettre à l'admin de gérer les zones et les types de déchets utilisés par les formulaires de signalement.

## Utilisateurs concernés

* Administrator

---

# Description

Écran de gestion des deux référentiels : zones (`nom_zone`, `description`) et types de déchets (`libelle`, `description`). Lecture ouverte à tous les utilisateurs authentifiés, écriture admin (BR-REF-001). Les listes sont paginées ; les modifications sont immédiatement visibles dans les formulaires (SCR-004).

---

# Parcours utilisateur

SCR-007 → `/admin/referentiels` (SCR-012) → onglet Zones ou Types de déchets → CRUD → retour

Précédent : SCR-007 — Suivant : SCR-007

---

# Navigation

## Entrées

* Tuile « Référentiels » depuis SCR-007.

## Sorties

* `/admin/dashboard` (SCR-007) — retour.

---

# Permissions

* Authentification requise ; écriture admin (BR-REF-001).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/zones | GET / POST | Liste / création |
| /api/zones/{id} | GET / PUT / DELETE | Détail / modification / suppression |
| /api/types-dechets | GET / POST | Liste / création |
| /api/types-dechets/{id} | GET / PUT / DELETE | Détail / modification / suppression |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Tableau des zones | data[] | Nom, description |
| Tableau des types de déchets | data[] | Libellé, description |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Créer une zone / un type | POST → 201 |
| Modifier | PUT → 200 |
| Supprimer | Confirmation → DELETE → 204 |
| Basculer d'onglet | Zones ↔ Types de déchets |

---

# États de l'écran

## Loading

Squelettes des tableaux.

## Success

Tableaux chargés.

## Empty

« Aucune zone » / « Aucun type de déchet » + bouton de création.

## Error

Bannière + « Réessayer » ; 422 → messages champ par champ.

## No Results

Non applicable.

## Offline

Bannière hors ligne ; écriture désactivée.

---

# Validations

* Zone : `nom_zone` requis (max 100) ; description optionnelle.
* Type de déchet : `libelle` requis (max 100) ; description optionnelle.

---

# Messages utilisateur

* Succès : « Zone créée/mise à jour/supprimée », « Type de déchet créé/mis à jour/supprimé ».
* Confirmation suppression : « Supprimer définitivement ? Les signalements associés conserveront leurs données ».

---

# Composants UI

* Page Header
* Tabs (Zones / Types de déchets)
* Table / Data List
* Form (modal ou inline)
* Modal (confirmation), Snackbar, Banner
* Empty State

---

# Responsive

* Paradigme : Desktop First (espace Admin) — utilisable mobile.
* Mobile : tableaux en cartes empilées, formulaire modal plein écran.
* Tablet : tableaux compressés.
* Desktop : tableaux pleine largeur + formulaire modal.

---

# Accessibilité

* Tableaux avec en-têtes, navigation clavier, focus trap modal, contraste AA.

---

# Performance

* Pagination (15/page) sur chaque liste.

---

# Cas limites

* Suppression d'une zone référencée par des signalements : dépend du backend (contrainte de clé étrangère) — message d'erreur affiché le cas échéant.
* Listes volumineuses : pagination + recherche client (optionnelle).

---

# Dépendances

* Écrans : SCR-007, SCR-004.
* Composants : Tabs, Table, Form, Modal.
* Services : ZoneService, TypeDechetService.

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Tabs, Table, Input, Button, Modal, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controllers : `app/Http/Controllers/Api/ZoneController.php`, `app/Http/Controllers/Api/TypeDechetController.php` — Policies : `app/Policies/ZonePolicy.php`, `app/Policies/TypeDechetPolicy.php` — Tests : `tests/Feature/ZoneApiTest.php`, `tests/Feature/TypeDechetApiTest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-REF-001).

---

# Hypothèses

* Les contraintes de suppression liées aux signalements dépendent du schéma de base (non vérifiées dans cette phase).

---

# Décisions

* Un seul écran pour les deux référentiels (onglets) — réduction de la duplication.

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
