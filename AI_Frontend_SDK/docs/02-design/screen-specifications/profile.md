# Screen Specification

# Informations générales

## Identifiant

SCR-014

## Nom de l'écran

Profil utilisateur

## Module

* Citizen
* Agent
* Admin

## Objectif

Consulter et modifier ses informations personnelles, son avatar et son mot de passe.

## Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Description

Écran commun aux trois rôles : consultation du profil (nom, email, avatar, rôle) et modification des informations. Limitation backend : `GET /api/user` fournit le profil courant, mais la mise à jour passe par `PUT /api/users/{id}`, exposé sous middleware `role:admin` — les citoyens et agents ne peuvent donc pas modifier leur propre profil avec l'API actuelle (ambiguïté à trancher avec le backend : ajouter un endpoint `PUT /api/profile` ou ouvrir `users/{id}` au propriétaire). En l'état, l'écran est en lecture seule pour Citizen et Agent ; seuls les Admin peuvent modifier (dont leur propre compte).

---

# Parcours utilisateur

SCR-003 → `/profile` (SCR-014) → modification → sauvegarde → retour

Entrée alternative : depuis n'importe quel écran via le menu utilisateur (header) — accessible à tous les rôles.

Précédent : SCR-003, SCR-005, SCR-007, SCR-010 — Suivant : SCR-001 (déconnexion)

---

# Navigation

## Entrées

* Menu utilisateur (header) sur tous les écrans connectés.

## Sorties

* Écran précédent — retour.
* Déconnexion → `/auth/login` (SCR-001).

---

# Permissions

* Authentification requise ; chaque utilisateur ne consulte que son propre profil (`GET /api/user`).
* Modification : `PUT /api/users/{id}` est réservé aux Admin (middleware `role:admin`) — champs en lecture seule pour Citizen/Agent tant que l'ambiguïté « profil auto-édition » n'est pas tranchée.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/user | GET | Profil du compte connecté (nom, email, rôle) |
| /api/users/{id} | PUT | Mise à jour (Admin uniquement) |
| /api/auth/logout | POST | Déconnexion (purge du token) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Avatar | — | Image de profil (non exposée par l'API actuelle — zone réservée) |
| Nom, email, rôle | GET /api/user | Informations (champs en lecture seule sauf Admin) |
| Formulaire de modification | PUT /api/users/{id} | Actif uniquement pour Admin |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Modifier son profil (Admin) | PUT /api/users/{id} → 200 → message succès |
| Modifier son profil (Citizen/Agent) | Désactivé en UI (limitation backend — voir Description) |
| Se déconnecter | POST /api/auth/logout → purge token → redirection SCR-001 |

---

# États de l'écran

## Loading

Squelettes.

## Success

Profil chargé (lecture seule pour Citizen/Agent ; formulaire actif pour Admin).

## Empty

Non applicable.

## Error

Bannière + « Réessayer » ; 422 → messages champ par champ.

## No Results

Non applicable.

## Offline

Bannière hors ligne ; écriture désactivée.

---

# Validations

* Nom : requis, max 100 (Admin).
* Email : format valide, unique (Admin).
* Mot de passe : min 8 caractères, confirmation (Admin, si champ exigé par le Request).
* Avatar : non géré par l'API actuelle — masqué ou zone réservée.

---

# Messages utilisateur

* Succès : « Profil mis à jour », « Avatar mis à jour », « Mot de passe modifié ».
* Confirmation déconnexion : « Vous allez être déconnecté ».
* 422 : messages du Request.

---

# Composants UI

* Page Header
* Avatar (affichage — upload non supporté par l'API)
* Form (nom, email, mot de passe — actif Admin uniquement)
* Button (déconnexion)
* Snackbar, Banner

---

# Responsive

* Paradigme : Mobile First (espace Citizen).
* Mobile : formulaire pleine largeur.
* Tablet / Desktop : formulaire centré (max 600 px).

---

# Accessibilité

* Labels, upload clavier, contraste AA.

---

# Performance

* Chargement léger ; avatar optimisé à l'upload.

---

# Cas limites

* Auto-édition impossible pour Citizen/Agent : champs désactivés avec mention « Modification réservée aux administrateurs (API) ».
* Email déjà pris : erreur 422 affichée (Admin).
* Profil d'un autre utilisateur : non consultable (pas de lien vers les profils d'autrui).

---

# Dépendances

* Écrans : SCR-001.
* Composants : Avatar, Form, Button.
* Services : SessionService (`GET /api/user`), AuthService (déconnexion).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Input, Button, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Endpoint profil courant : `GET /api/user` (route closure dans `routes/api.php`) — Mise à jour : `app/Http/Controllers/Api/UserController.php` (`update`, admin) — Request : `app/Http/Requests/User/UpdateUserRequest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] L'auto-édition du profil est gérée conformément aux capacités réelles de l'API (Admin seul).

---

# Hypothèses

* La modification du profil pour Citizen/Agent sera tranchée avec le backend (endpoint `PUT /api/profile` à créer, ou ouverture de `PUT /api/users/{id}` au propriétaire — à ajouter aux ambiguïtés de `docs/01-analysis/api-analysis.md`).
* `UserResource` ne renvoie pas `telephone`, `adresse` ni `etat_compte` : ces champs ne sont ni affichés ni modifiables (décision requise — voir § 9 bis d'api-analysis.md).

---

# Décisions

* Écran commun aux trois rôles ; en lecture seule pour Citizen/Agent tant que le backend n'expose pas la mise à jour de son propre profil.

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
