# Screen Specification

# Informations générales

## Identifiant

SCR-015

## Nom de l'écran

Points citoyen

## Module

* Citizen

## Objectif

Afficher le total de points, l'historique des gains et le classement des citoyens les plus actifs.

## Utilisateurs concernés

* Citizen

---

# Description

Écran de gamification (BR-GAM-001 à BR-GAM-004) : total de points du citoyen, historique des transactions (gains et dépenses) et classement. L'API ne filtre pas l'historique par utilisateur (ambiguïté n° 1 de `docs/01-analysis/api-analysis.md`) — l'UI affiche l'historique complet renvoyé par le backend en l'état, avec mise en évidence des entrées du citoyen connecté.

---

# Parcours utilisateur

SCR-003 → `/citizen/points` (SCR-015) → onglets Total / Historique / Classement → retour

Précédent : SCR-003, SCR-005 — Suivant : SCR-003

---

# Navigation

## Entrées

* Tuile « Points » depuis SCR-003 (Bottom Navigation) et SCR-005.

## Sorties

* `/citizen/map` (SCR-003) — retour.

---

# Permissions

* Authentification requise ; rôle `citizen`.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/historique-points | GET | Historique des points (liste complète — non filtrée par l'API) |

Note : `/api/dashboard/points` et `/api/dashboard/classement` n'existent pas dans l'API (vérifié sur `routes/api.php`) — aucun appel frontend vers ces endpoints. Le solde et l'historique proviennent exclusivement de `/api/historique-points` ; le classement n'est pas affiché (BR-GAM-003).

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Total de points | data[] (somme) | Points cumulés du citoyen |
| Historique | data[] | Date, type (gain/dépense), points, description |
| Classement | data[] | Rang, nom, points |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Basculer d'onglet | Total ↔ Historique ↔ Classement |
| Mettre en évidence ses entrées | Surlignage des entrées du citoyen connecté (compensation du manque de filtre API) |

---

# États de l'écran

## Loading

Squelettes.

## Success

Données chargées.

## Empty

« Aucun point pour le moment ».

## Error

Bannière + « Réessayer ».

## No Results

Classement vide : « Aucun participant ».

## Offline

Bannière hors ligne (lecture seule — données éventuellement en cache).

---

# Validations

Sans objet (écran de consultation).

---

# Messages utilisateur

* Information : « Seules vos entrées sont surlignées — l'API ne filtre pas l'historique » (si ambiguïté non résolue).

---

# Composants UI

* Page Header
* Stat Card (total de points) — CMP-005 (`docs/02-design/component-specifications/CMP-005-badge-points.md`)
* Tabs (Historique / Classement)
* Data List (historique), Rank List (classement)
* Banner

---

# Responsive

* Paradigme : Mobile First (espace Citizen).
* Mobile : stat en haut, onglets plein largeur.
* Tablet : stat + contenu sur deux colonnes.
* Desktop : idem, largeur contenue.

---

# Accessibilité

* Onglets accessibles, données structurées, contraste AA.

---

# Performance

* Pagination de l'historique (côté API si supportée).

---

# Cas limites

* Historique volumineux non paginé : affichage tronqué (page) — à confirmer avec le backend (ambiguïté n° 1).
* Somme calculée côté client à partir des entrées du citoyen (si total non fourni par l'API).

---

# Dépendances

* Écrans : SCR-003, SCR-005.
* Composants : StatCard, Tabs, DataList, RankList.
* Services : PointsService (historique-points), ClassementService (si disponible).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : StatCard, Tabs, Badge, Skeleton, EmptyState, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controllers : `app/Http/Controllers/Api/HistoriquePointController.php`, `app/Http/Controllers/Api/DashboardController.php` — Tests : `tests/Feature/HistoriquePointApiTest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-GAM-001 à BR-GAM-004).

---

# Hypothèses

* Le total affiché est celui renvoyé par `/api/historique-points` (somme des entrées, non filtrée — ambiguïté n° 1). Le classement n'est pas affiché : aucun endpoint dédié dans l'API (BR-GAM-003).

---

# Décisions

* Surlignage client des entrées du citoyen connecté (compensation de l'ambiguïté n° 1, documentée pour le backend).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
