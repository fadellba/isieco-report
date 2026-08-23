# Screen Specification

# Informations générales

## Identifiant

SCR-008

## Nom de l'écran

File de validation et priorisation

## Module

* Admin

## Objectif

Permettre à l'admin de valider, rejeter ou prioriser les signalements en attente.

## Utilisateurs concernés

* Administrator

---

# Description

File de travail admin centrée sur les signalements `en_attente_validation`, `valide` et `priorise`. Chaque carte permet une décision rapide (valider, rejeter, prioriser) ou l'ouverture du détail complet (SCR-006). Les actions proposées respectent la machine à états (BR-SIG-002) : `en_attente_validation → valide|rejete`, `valide → priorise|affecte`.

---

# Parcours utilisateur

SCR-007 → `/admin/validation` (SCR-008) → décision rapide ou `/admin/reports/:id` (SCR-006) → retour

Précédent : SCR-007, SCR-006 — Suivant : SCR-006

---

# Navigation

## Entrées

* Tuile « Validation » depuis SCR-007.

## Sorties

* `/admin/reports/:id` (SCR-006).
* `/admin/dashboard` (SCR-007) — retour.

---

# Permissions

* Authentification requise ; rôle `admin` (actions de validation non autorisées pour agent/citoyen — BR-SIG-002, BR-SIG-006).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/signalements | GET | Liste globale paginée |
| /api/signalements/{id} | PUT | Transition de statut (valider/rejeter/prioriser) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Cartes de signalements | data[] | Description tronquée, statut, priorité, photos (non chargées en liste), zone, date |
| Filtres d'onglets | statut | Onglets : « En attente », « Validés », « Priorisés » (filtre client) |
| Actions rapides | Statut courant (BR-SIG-002) | Valider / Rejeter / Prioriser selon la transition possible |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Valider | PUT `statut = valide` → la carte sort de l'onglet « En attente » |
| Rejeter | PUT `statut = rejete` (avec confirmation) → la carte disparaît de la file |
| Prioriser | PUT `statut = priorise` (uniquement depuis `valide`) |
| Ouvrir le détail | Navigation SCR-006 |
| Affecter | Navigation SCR-009 (depuis détail, statut `valide`/`priorise`) |

---

# États de l'écran

## Loading

Squelettes des cartes.

## Success

File chargée, actions disponibles.

## Empty

« Aucun signalement en attente » (selon l'onglet).

## Error

Bannière « Impossible de charger la file » + « Réessayer ».

## No Results

Onglet sans résultats → message dédié.

## Offline

Bannière hors ligne ; actions d'écriture désactivées.

---

# Validations

* Les transitions sont masquées si non autorisées (BR-SIG-002) ; le backend valide en dernier ressort (422 → message).

---

# Messages utilisateur

* Succès : « Signalement validé », « Signalement priorisé », « Signalement rejeté ».
* Confirmation rejet : « Rejeter ce signalement ? Cette action est définitive ».
* 422 : message de transition renvoyé par l'API.

---

# Composants UI

* Page Header
* Tabs / Chip Bar (filtres de statut)
* Report Card (avec actions contextuelles) — CMP-003 / CMP-004 (`docs/02-design/component-specifications/`)
* Button (Primary/Danger/Ghost par action)
* Modal (confirmation rejet)
* Snackbar, Banner

---

# Responsive

* Paradigme : Desktop First (espace Admin) — utilisable mobile.
* Mobile : cartes empilées, actions en bas de carte.
* Tablet : deux colonnes.
* Desktop : liste pleine largeur + panneau latéral de filtres.

---

# Accessibilité

* Actions clavier (boutons dédiés par carte).
* Badges textuels de statut/priorité.
* Modal focus trap, contraste AA.

---

# Performance

* Pagination (15/page) avec chargement progressif ; aucune donnée superflue en liste.

---

# Cas limites

* Transition refusée (état concurrent) : message 422 affiché, la file est rafraîchie.
* Rejet définitif : confirmation obligatoire (BR-SIG-003 — état terminal).
* Liste volumineuse : scroll infini.

---

# Dépendances

* Écrans : SCR-006, SCR-007, SCR-009.
* Composants : ReportCard (avec actions), Tabs, Modal.
* Services : SignalementService (list, update statut).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Card, Badge, Tabs, Button, Modal, Skeleton, EmptyState, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/SignalementController.php` — Service : `app/Services/SignalementService.php` — Policy : `app/Policies/SignalementPolicy.php` — Exception : `app/Exceptions/Business/InvalidTransitionException.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-SIG-002, BR-SIG-003).

---

# Hypothèses

* Les onglets sont un filtrage client des statuts (pas de paramètre API).
* Le rejet est définitif (état terminal côté API).

---

# Décisions

* Actions rapides directement sur les cartes pour accélérer le traitement de la file.

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
