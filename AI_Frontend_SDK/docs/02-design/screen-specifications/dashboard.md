# Screen Specification

# Informations générales

## Identifiant

SCR-007

## Nom de l'écran

Dashboard Administrateur — Carte des zones critiques

## Module

* Admin

## Objectif

Donner à l'admin une vue d'ensemble des zones critiques (heatmap) et un accès rapide aux fonctions de gestion.

## Utilisateurs concernés

* Administrator

---

# Description

Écran d'accueil Admin. Une carte affiche les zones critiques via la heatmap agrégée par le backend (BR-DASH-001), avec accès rapide à la file de validation, aux affectations, aux équipes, aux référentiels et aux utilisateurs. C'est l'unique écran consommant `GET /api/dashboard/heatmap` (admin uniquement).

---

# Parcours utilisateur

Connexion (SCR-001) → `/admin/dashboard` (SCR-007) → [boutons] → SCR-008, SCR-009, SCR-011, SCR-012, SCR-013, SCR-006

Précédent : SCR-001, SCR-013, SCR-008, SCR-009 — Suivant : SCR-008, SCR-009, SCR-011, SCR-012, SCR-013

---

# Navigation

## Entrées

* Redirection post-connexion (admin).

## Sorties

* `/admin/validation` (SCR-008)
* `/admin/affectations` (SCR-009)
* `/admin/equipes` (SCR-011)
* `/admin/referentiels` (SCR-012)
* `/admin/users` (SCR-013)
* `/profile` (SCR-014)

---

# Permissions

* Authentification requise ; rôle `admin` (middleware `role:admin` côté API — BR-DASH-001).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/dashboard/heatmap | GET | Agrégation par zone (zone_id, zone_nom, latitude, longitude, weight) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Cercles de chaleur | data[] de la heatmap | Rayon/intensité selon `weight` |
| Étiquettes de zone | zone_nom | Nom de la zone sous le marqueur |
| Liens rapides | — | Tuiles d'accès aux modules admin |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Consulter la heatmap | Affichage des zones critiques (triées par poids) |
| Cliquer sur une zone | Zoom + aperçu (nombre de signalements) |
| Accéder à la validation | Navigation SCR-008 |
| Accéder aux affectations | Navigation SCR-009 |
| Accéder aux équipes / référentiels / utilisateurs | Navigation SCR-011 / SCR-012 / SCR-013 |

---

# États de l'écran

## Loading

Overlay de chargement de la carte (squelettes des cercles).

## Success

Carte avec heatmap + tuiles d'accès.

## Empty

« Aucune zone critique » (aucun signalement actif) — message avec lien vers la liste des signalements.

## Error

Bannière « Impossible de charger la heatmap » + « Réessayer ».

## No Results

Identique à Empty.

## Offline

Bannière « Hors ligne — données potentiellement obsolètes ».

---

# Validations

Aucune saisie.

---

# Messages utilisateur

* Erreur chargement : « Impossible de charger les données de la carte ».
* Aperçu zone : « X signalement(s) actif(s) dans cette zone ».

---

# Composants UI

* Map (heatmap) — CMP-001 (`docs/02-design/component-specifications/CMP-001-carte-interactive.md`)
* Dashboard Quick Links (tuiles)
* Page Header
* KPI mini (nombre de zones critiques si pertinent)
* Empty State, Banner, Snackbar

---

# Responsive

* Mobile : heatmap pleine largeur + grille de tuiles (2 colonnes) — espace admin pensé desktop-first mais utilisable mobile.
* Tablet : grille 3 colonnes.
* Desktop : heatmap (70 %) + colonne latérale de navigation admin.

---

# Accessibilité

* Légende de la heatmap (textuelle, pas seulement la couleur).
* Tuiles navigables au clavier.
* Contraste AA.

---

# Performance

* Appel unique `GET /api/dashboard/heatmap` au chargement ; lazy loading cartographie.

---

# Cas limites

* Données volumineuses : les cercles sont agrégés par zone (poids), nombre de points borné.
* Signalements sans zone : regroupés sous zone nulle — affichés hors légende avec un libellé « Sans zone ».
* Erreur réseau : état Error avec réessai.

---

# Dépendances

* Écrans : SCR-008, SCR-009, SCR-011, SCR-012, SCR-013, SCR-014.
* Composants : Map (heatmap), QuickLinks.
* Services : DashboardService (heatmap).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : StatCard, MapView (heatmap CMP-001), Skeleton, EmptyState, Banner, Snackbar - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/DashboardController.php` — Repository : `app/Repositories/Eloquent/DashboardRepository.php` — Tests : `tests/Feature/DashboardHeatmapApiTest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-DASH-001).

---

# Hypothèses

* La heatmap est l'équivalent du « tableau de bord » admin prévu au cahier des charges (2.2).
* Aucun autre agrégat n'est disponible (pas de KPIs globaux côté API).

---

# Décisions

* Le dashboard est cartographique (heatmap) ; les statistiques avancées resteront limitées aux données de l'API actuelle.

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
