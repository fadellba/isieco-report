# Screen Specification

# Informations générales

## Identifiant

SCR-013

## Nom de l'écran

Gestion des utilisateurs

## Module

* Admin

## Objectif

Permettre à l'admin de gérer les comptes utilisateurs (agents, administrateurs, citoyens) : création, modification, changement de mot de passe et suppression.

## Utilisateurs concernés

* Administrator

---

# Description

Écran de gestion des utilisateurs : liste paginée avec filtres (nom, email, rôle), création d'un compte (avec mot de passe initial), modification des informations et du rôle, réinitialisation de mot de passe et suppression. L'API gère les rôles `admin`, `agent`, `citizen` via Spatie (les noms de rôles API `admin`/`agent`/`citizen` sont affichés en français : Administrateur / Agent / Citoyen).

---

# Parcours utilisateur

SCR-007 → `/admin/users` (SCR-013) → CRUD → retour liste

Précédent : SCR-007 — Suivant : SCR-007

---

# Navigation

## Entrées

* Tuile « Utilisateurs » depuis SCR-007.

## Sorties

* `/admin/dashboard` (SCR-007) — retour.

---

# Permissions

* Authentification requise ; rôle `admin` uniquement (BR-USR-001).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/users | GET | Liste paginée (filtres nom, email, rôle — implémentés via `paginateWithFilters`) |
| /api/users/{id} | GET | Détail |
| /api/users | POST | Création (nom, prénom, email, mot de passe + confirmation, rôle) |
| /api/users/{id} | PUT | Mise à jour (nom, prénom, email, rôle, mot de passe optionnel + confirmation) |
| /api/users/{id} | DELETE | Suppression |

Note : `/api/roles` n'existe pas dans l'API (vérifié sur `routes/api.php`) — la liste des rôles est une liste statique des 3 rôles Spatie (`admin` / `agent` / `citizen`).

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Tableau des utilisateurs | data[] | Nom, email, rôle, dates |
| Formulaire | POST/PUT body | Nom, prénom, email, mot de passe (+ confirmation), rôle |
| Filtres | query params | Nom, email, rôle |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Créer un compte | POST → 201 |
| Modifier un compte | PUT → 200 |
| Réinitialiser le mot de passe | PUT (mot de passe) → confirmation |
| Supprimer un compte | Confirmation → DELETE → 204 |
| Filtrer la liste | GET avec query params |

---

# États de l'écran

## Loading

Squelettes.

## Success

Liste chargée.

## Empty

« Aucun utilisateur » + bouton de création.

## Error

Bannière + « Réessayer » ; 422 → messages champ par champ.

## No Results

Filtres actifs sans résultat.

## Offline

Bannière hors ligne ; écriture désactivée.

---

# Validations

* Nom : requis, max 100.
* Prénom : requis, max 100 (aligné sur le backend `StoreUserRequest`).
* Email : requis, format valide, unique (erreur 422 « L'adresse email est déjà utilisée »).
* Mot de passe : requis à la création, min 8 caractères, avec un champ de confirmation (`password_confirmation`) ; en modification, il est optionnel et la confirmation n'est exigée que si un nouveau mot de passe est saisi (le formulaire signale une discordance via `passwordMismatch`).
* Rôle : `admin` / `agent` / `citizen` (affiché en français).

---

# Messages utilisateur

* Succès : « Utilisateur créé », « Utilisateur mis à jour », « Utilisateur supprimé ».
* Confirmation suppression : « Supprimer ce compte ? Action irréversible ».
* 422 : messages du Request.

---

# Composants UI

* Page Header
* Search Bar + Filters (nom, email, rôle)
* Table / Data List
* Form (nom, prénom, email, mot de passe + confirmation, select rôle)
* Modal (confirmation), Snackbar, Banner
* Empty State

---

# Responsive

* Paradigme : Desktop First (espace Admin) — utilisable mobile.
* Mobile : cartes empilées, formulaire modal plein écran.
* Tablet : tableaux compressés.
* Desktop : tableau pleine largeur + formulaire modal.

---

# Accessibilité

* Tableaux avec en-têtes, labels, focus trap modal, contraste AA.

---

# Performance

* Pagination (15/page) ; filtres avec debounce.

---

# Cas limites

* Auto-suppression de son propre compte : bloquée en UI (message d'avertissement).
* Email dupliqué : erreur 422 affichée.
* Changer le rôle d'un admin : risque de se verrouiller soi-même — avertissement si rôle changé sur son propre compte.

---

# Dépendances

* Écrans : SCR-007, SCR-011 (liste d'agents).
* Composants : Table, Form, SearchBar, Modal.
* Services : UserService, RoleService (si disponible).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Table, SearchBar, Input, Button, Modal, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/UserController.php` — Requests : `app/Http/Requests/User/StoreUserRequest.php`, `UpdateUserRequest.php` — Tests : `tests/Feature/UserApiTest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-USR-001).

---

# Hypothèses

* L'endpoint `/api/roles` n'existe pas dans l'API : liste statique des 3 rôles (`admin`/`agent`/`citizen`).
* Les noms de rôles API sont `admin`/`agent`/`citizen` (Spatie).
* `UserResource` masque `telephone`, `adresse` et `etat_compte` : ces colonnes ne sont ni consultables ni éditables depuis l'écran (décision requise — voir § 9 bis d'api-analysis.md).

---

# Décisions

* Affichage des rôles en français avec mapping API.
* Avertissements sur les actions à risque (auto-suppression, changement de rôle sur soi-même).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06
Auteur : QA Reviewer — Version : 1.1 — Date : 2026-08-10 — contrat finalisé : prénom obligatoire, confirmation de mot de passe, filtres nom/email/rôle implémentés (ADR-006).

---

# Statut

Validé
