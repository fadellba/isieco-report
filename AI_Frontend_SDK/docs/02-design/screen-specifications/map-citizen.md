# Screen Specification

# Informations générales

## Identifiant

SCR-003

## Nom de l'écran

Carte de mes signalements (accueil Citizen)

## Module

* Citizen

## Objectif

Afficher sur une carte interactive les signalements du citoyen connecté et servir de point d'entrée vers la création et le suivi.

## Utilisateurs concernés

* Citizen

---

# Description

Écran d'accueil Citizen (Mobile First). Une carte interactive (Leaflet/équivalent) affiche des marqueurs pour chaque signalement du citoyen, colorés selon le statut. Un bouton flottant « Nouveau signalement » lance le parcours de création. L'API ne fournissant que les signalements du citoyen connecté (BR-SIG-005), la carte est personnelle et non communautaire (limitation documentée dans `docs/01-analysis/api-analysis.md`).

---

# Parcours utilisateur

Connexion (SCR-001) → SCR-003 → [marqueur] → SCR-006 / [bouton] → SCR-004 / [liste] → SCR-005 / [points] → SCR-015

Précédent : SCR-001, SCR-005, SCR-006, SCR-004, SCR-014 — Suivant : SCR-004, SCR-005, SCR-006, SCR-015

---

# Navigation

## Entrées

* Redirection post-connexion (citizen).
* Retour depuis SCR-004 (création), SCR-005 (liste), SCR-006 (détail).

## Sorties

* `/citizen/reports/create` (SCR-004)
* `/citizen/reports` (SCR-005)
* `/citizen/reports/:id` (SCR-006) — clic sur marqueur
* `/citizen/points` (SCR-015)
* `/profile` (SCR-014)

---

# Permissions

* Authentification requise ; rôle `citizen` (RoleGuard). Agent/Admin redirigés vers leur espace.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/signalements | GET | Liste paginée (filtrée côté serveur pour le citoyen) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Marqueurs | latitude, longitude de la réponse | Un marqueur par signalement, couleur selon statut |
| Légende | Mapping statut → couleur | En_attente, Valide/engagé, Terminé, Clôturé, Rejeté |
| Position utilisateur | Géolocalisation navigateur (facultatif) | Point bleu de localisation |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Cliquer sur un marqueur | Ouverture du détail SCR-006 |
| Nouveau signalement | Navigation vers SCR-004 |
| Basculer en liste | Navigation vers SCR-005 |
| Voir mes points | Navigation vers SCR-015 |
| Recentrer | Recentrage sur la position de l'utilisateur |

---

# États de l'écran

## Loading

Squelettes des marqueurs / overlay de chargement ; le premier appel API est en cours.

## Success

Carte affichée avec les marqueurs des signalements.

## Empty

État vide : « Aucun signalement pour le moment » + bouton « Créer mon premier signalement ».

## Error

Bannière « Impossible de charger vos signalements » + bouton « Réessayer ».

## No Results

Identique à Empty (filtres applicables plus tard).

## Offline

Bannière « Hors ligne — les données affichées peuvent être obsolètes » ; création désactivée.

---

# Validations

Aucune saisie sur cet écran.

---

# Messages utilisateur

* Erreur chargement : « Impossible de charger vos signalements ».
* Offline : « Hors ligne ».

---

# Composants UI

* Map (composant carte, marqueurs personnalisés par statut) — CMP-001 (`docs/02-design/component-specifications/CMP-001-carte-interactive.md`)
* Floating Action Button (nouveau signalement)
* Bottom Navigation (Carte, Liste, Points, Profil)
* Top Bar (titre, avatar profil)
* Empty State
* Banner / Snackbar
* Legend

---

# Responsive

* Mobile : carte plein écran, Bottom Navigation, FAB.
* Tablet : carte + liste latérale (≥ 768 px).
* Desktop : carte plein écran, navigation latérale, FAB conservé.

---

# Accessibilité

* Navigation clavier sur les marqueurs (liste accessible alternative).
* Légende avec textes (pas seulement les couleurs).
* Contraste des marqueurs selon statut.

---

# Performance

* Pagination API (15/page) : chargement progressif lors du déplacement de la carte (fetch de la page suivante).
* Lazy loading de la bibliothèque de cartographie.

---

# Cas limites

* Permission de géolocalisation refusée : la carte reste utilisable (signalements affichés, recentrage désactivé).
* Signalements sans zone : affichés quand même (zone non requise pour la carte).
* Liste volumineuse : chargement progressif.

---

# Dépendances

* Écrans : SCR-004, SCR-005, SCR-006, SCR-015, SCR-014.
* Composants : Map, ReportMarker, BottomNavigation, FAB.
* Services : SignalementService (liste), GeolocationService (service frontend à créer — wrapper `navigator.geolocation`, aucune implémentation backend).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : MapView, BottomNavigation, Button, Banner, Snackbar - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/SignalementController.php` — Policy : `app/Policies/SignalementPolicy.php` (viewAny)

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-SIG-005).

---

# Hypothèses

* Le citoyen ne voit que ses signalements (l'API ne fournit pas de carte communautaire publique).
* La bibliothèque cartographique retenue supporte le lazy loading (Leaflet recommandé, cf. cahier des charges).

---

# Décisions

* La carte citoyenne est personnelle (contrainte API) ; la carte communautaire/heatmap reste une fonctionnalité admin (SCR-007).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
