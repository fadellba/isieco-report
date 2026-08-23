# Screen Specification

# Informations générales

## Identifiant

SCR-005

## Nom de l'écran

Liste des signalements

## Module

* Citizen
* Agent
* Admin

## Objectif

Afficher la liste paginée des signalements avec filtres par statut, selon le périmètre du rôle.

## Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Description

Écran de liste (vue « Mes signalements » pour le citoyen, vue globale pour agent et admin). Le périmètre est imposé par le backend : le citoyen ne voit que ses signalements (BR-SIG-005), l'agent et l'admin voient tout. Les lignes affichent le statut, la priorité, la localisation et la date ; le clic ouvre le détail (SCR-006). Le filtre par statut est client (l'API ne propose pas de filtre serveur).

---

# Parcours utilisateur

SCR-003 → `/citizen/reports` (SCR-005) → `/citizen/reports/:id` (SCR-006) → retour

Admin : `/admin/dashboard` → `/admin/validation` (SCR-008, variante filtrée) → SCR-006

Précédent : SCR-003 (Citizen) / SCR-007 (Admin) — Suivant : SCR-006

---

# Navigation

## Entrées

* Bottom Navigation « Liste » (Citizen).
* Lien « Voir tout » depuis le dashboard admin (SCR-007).
* `/admin/validation` (SCR-008) est une variante pré-filtrée de cet écran.

## Sorties

* `/citizen/reports/:id` ou `/admin/reports/:id` (SCR-006).
* Retour vers l'accueil du rôle.

---

# Permissions

* Authentification requise.
* Citizen : ses signalements uniquement (filtrage serveur).
* Agent : liste globale (lecture).
* Admin : liste globale + actions de validation/priorisation (cf. SCR-008).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/signalements | GET | Liste paginée (15/page) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Cartes/lignes de signalement | data[] de la réponse | description (tronquée), statut, priorité, lat/lng, dates |
| Badge de statut | statut | Couleur + libellé par statut |
| Badge de priorité | priorite | Couleur + libellé (normale, haute, urgente...) |
| Pagination | meta | Page courante, total, chargement progressif |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Ouvrir un signalement | Navigation vers SCR-006 |
| Filtrer par statut | Filtre client (chip bar) |
| Charger plus | Pagination (15/page) |
| Basculer en carte | Navigation vers SCR-003 (Citizen) |

---

# États de l'écran

## Loading

Squelettes de liste.

## Success

Liste paginée avec badges.

## Empty

« Aucun signalement » (Citizen : + bouton « Créer un signalement »).

## Error

Bannière « Impossible de charger la liste » + « Réessayer ».

## No Results

Aucun résultat après filtre par statut → message « Aucun signalement avec ce statut ».

## Offline

Bannière « Hors ligne — données potentiellement obsolètes ».

---

# Validations

Aucune saisie.

---

# Messages utilisateur

* Erreur chargement : « Impossible de charger les signalements ».
* Filtre vide : « Aucun signalement avec ce statut ».

---

# Composants UI

* Liste paginée générique — CMP-004 (`docs/02-design/component-specifications/CMP-004-liste-paginee.md`)
* Page Header (titre + compteur)
* Chip Bar (filtres de statut)
* Report Card (liste)
* Badge (statut, priorité)
* Empty State
* Infinite Scroll / Pagination
* Snackbar, Banner

---

# Responsive

* Paradigme : Mobile First (espace Citizen/Agent).
* Mobile : cartes en liste verticale, Bottom Navigation.
* Tablet : deux colonnes de cartes.
* Desktop : liste pleine largeur avec panneau latéral de filtres.

---

# Accessibilité

* Listes navigables au clavier.
* Badges avec libellés textuels (statut/priorité).
* Contraste AA.

---

# Performance

* Pagination serveur (15/page) avec chargement progressif.
* Images non chargées en liste (pas de photos dans la ressource liste — champs `whenLoaded` absents).

---

# Cas limites

* Liste volumineuse : pagination + scroll infini.
* Erreur réseau en cours de scroll : bouton « Réessayer ».
* Permissions insuffisantes : 403 → redirection ou message.

---

# Dépendances

* Écrans : SCR-003, SCR-006, SCR-008.
* Composants : ReportCard, ChipBar, Pagination.
* Services : SignalementService (list).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Card, Badge, SearchBar, Skeleton, EmptyState, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/SignalementController.php` — Policy : `app/Policies/SignalementPolicy.php` — Tests : `tests/Feature/SignalementApiTest.php`

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

* Le filtrage par statut est effectué côté client (pas de paramètre API).
* Les photos ne sont pas affichées en liste (absentes de la ressource liste).

---

# Décisions

* Une seule liste pour les trois rôles, le périmètre étant imposé par le backend ; SCR-008 est la variante admin avec actions.

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
