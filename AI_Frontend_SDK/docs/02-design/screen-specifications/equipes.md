# Screen Specification

# Informations générales

## Identifiant

SCR-011

## Nom de l'écran

Gestion des équipes

## Module

* Admin

## Objectif

Permettre à l'admin de créer, modifier et supprimer les équipes de collecte et leur composition.

## Utilisateurs concernés

* Administrator
* Agent (lecture)

---

# Description

Écran de gestion des équipes : liste, création (nom, description, agents), modification de la composition (remplacement complet via `agent_ids` — BR-EQP-002) et suppression. Les agents membres sont affichés avec leur fonction et date de début (pivot `appartenance_equipe`).

---

# Parcours utilisateur

SCR-007 → `/admin/equipes` (SCR-011) → CRUD → retour liste

Précédent : SCR-007 — Suivant : SCR-007

---

# Navigation

## Entrées

* Tuile « Équipes » depuis SCR-007.

## Sorties

* `/admin/dashboard` (SCR-007) — retour.

---

# Permissions

* Authentification requise ; rôle `admin` pour l'écriture (BR-EQP-003). Agent : lecture via l'API (policy viewAny) — aucun écran dédié côté Agent (les équipes servent de sélecteur dans SCR-009).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/equipes | GET | Liste paginée (agents et zones chargés — `EquipeService::paginate()` avec `load(['agents','zones'])`) |
| /api/equipes/{id} | GET | Détail (agents, zones) |
| /api/equipes | POST | Création (nom_equipe, description, agent_ids) |
| /api/equipes/{id} | PUT | Mise à jour (nom, description, agent_ids remplacement) |
| /api/equipes/{id} | DELETE | Suppression |
| /api/users | GET | Sélection d'agents (rôle agent, toutes pages) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Cartes d'équipes | data[] | Nom, description, nombre d'agents |
| Détail équipe | show | Agents (nom, fonction, date_debut), zones couvertes |
| Formulaire | POST/PUT body | Nom, description, multi-sélection d'agents |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Créer une équipe | POST → 201 |
| Modifier | PUT (composition remplacée par la sélection — BR-EQP-002) |
| Supprimer | Confirmation → DELETE → 204 |
| Rechercher un agent | Filtre sur la liste des utilisateurs (rôle agent) — chargement paginé complet (`role=agent` + `page` tant que `last_page`) |

---

# États de l'écran

## Loading

Squelettes.

## Success

Liste/détail chargés.

## Empty

« Aucune équipe » + bouton « Créer une équipe ».

## Error

Bannière + « Réessayer » ; 422 → messages champ par champ.

## No Results

Aucun résultat de recherche d'agents.

## Offline

Bannière hors ligne ; écriture désactivée.

---

# Validations

* Nom : requis, max 100.
* Description : optionnelle.
* Agents : tableau d'IDs existants (optionnel).
* (Le remplacement de la composition est le comportement API : `sync` — avertissement affiché.)

---

# Messages utilisateur

* Succès : « Équipe créée », « Équipe mise à jour », « Équipe supprimée ».
* Confirmation suppression : « Supprimer cette équipe ? Les affectations associées seront impactées ».
* Avertissement composition : « La liste des agents remplace la composition actuelle ».

---

# Composants UI

* Page Header
* Data List (équipes)
* Form (input nom, textarea description, multi-select agents)
* Modal (confirmation), Snackbar, Banner
* Empty State

---

# Responsive

* Paradigme : Desktop First (espace Admin) — utilisable mobile.
* Mobile : liste + formulaire repliable.
* Tablet : deux colonnes.
* Desktop : liste (50 %) + formulaire latéral (50 %).

---

# Accessibilité

* Labels, multi-select accessible, focus trap modal, contraste AA.

---

# Performance

* Pagination (15/page) ; liste des utilisateurs chargée pour la sélection d'agents.

---

# Cas limites

* Aucune équipe : état vide.
* Aucun agent disponible : avertissement + création sans agents possible.
* Ré-inclusion d'un agent le même jour : limitation backend (BR-EQP-002, ambiguïté n° 7 de `docs/01-analysis/api-analysis.md`) — l'UI affiche la date de début pour informer.

---

# Dépendances

* Écrans : SCR-007, SCR-009.
* Composants : DataList, Form, MultiSelect, Modal.
* Services : EquipeService, UserService.

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Card, Table, Input, Button, Modal, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/EquipeController.php` — Service : `app/Services/EquipeService.php` — Requests : `app/Http/Requests/Equipe/StoreEquipeRequest.php`, `UpdateEquipeRequest.php` — Policy : `app/Policies/EquipePolicy.php` — Tests : `tests/Feature/EquipeApiTest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-EQP-001, BR-EQP-002, BR-EQP-003).

---

# Hypothèses

* Les équipes n'ont pas de couverture de zones modifiable via l'API (pivot `couverture_zone` non exposé) — la zone est seulement affichée si présente.

---

# Décisions

* Affichage de la composition avec date de début (transparence sur le pivot).
* Avertissement explicite sur le remplacement complet lors de la modification.

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
