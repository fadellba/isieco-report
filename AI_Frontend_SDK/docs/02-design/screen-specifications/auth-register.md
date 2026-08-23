# Screen Specification

# Informations générales

## Identifiant

SCR-002

## Nom de l'écran

Inscription

## Module

* Citizen

## Objectif

Permettre à un citoyen de créer son compte et d'obtenir immédiatement une session.

## Utilisateurs concernés

* Citizen

---

# Description

Écran public de création de compte. Il collecte nom, prénom, email et mot de passe (avec confirmation), appelle l'API d'inscription, stocke le token et redirige vers l'accueil Citizen. Le rôle `citizen` est appliqué automatiquement par le backend (BR-AUTH-001).

---

# Parcours utilisateur

`/auth/login` (SCR-001) → `/auth/register` (SCR-002) → succès → `/citizen/map` (SCR-003)

Précédent : SCR-001 — Suivant : SCR-003

---

# Navigation

## Entrées

* Lien « Créer un compte » depuis SCR-001.

## Sorties

* `/citizen/map` (SCR-003) après succès
* `/auth/login` (SCR-001) — retour si compte existant

---

# Permissions

* Aucune (accès public) ; GuestGuard si déjà connecté.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/auth/register | POST | Création du compte citoyen + token |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Nom | Saisie utilisateur | Obligatoire, max 100 |
| Prénom | Saisie utilisateur | Obligatoire, max 100 |
| Email | Saisie utilisateur | Format email, unique |
| Mot de passe | Saisie utilisateur | Min 8 caractères |
| Confirmation | Saisie utilisateur | Doit correspondre |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Créer mon compte | Appel API, stockage du token, redirection SCR-003 |
| J'ai déjà un compte | Retour SCR-001 |

---

# États de l'écran

## Loading

Bouton désactivé + indicateur pendant l'appel.

## Success

Message de bienvenue, redirection immédiate vers SCR-003.

## Empty

Non applicable.

## Error

Messages champ par champ (422 : email déjà utilisé, mot de passe trop court, confirmation différente) ; bannière en cas d'erreur réseau.

## No Results

Non applicable.

## Offline

Bannière « Connexion impossible : pas de réseau ».

---

# Validations

* Email : format email, requis.
* Mot de passe : ≥ 8 caractères, avec confirmation.
* (Unicité de l'email vérifiée par le backend — BR-AUTH-001.)

---

# Messages utilisateur

* Succès : « Compte créé, bienvenue ! »
* 422 email : « Cet email est déjà utilisé ».
* 422 mot de passe : « Le mot de passe doit contenir au moins 8 caractères ».
* Confirmation : « Les mots de passe ne correspondent pas ».

---

# Composants UI

* Page Header (logo)
* Input (nom, prénom, email, password ×2)
* Button (Primary, pleine largeur)
* Link
* Alert / Snackbar

---

# Responsive

* Paradigme : Mobile First (espace Citizen).
* Mobile : formulaire plein écran.
* Tablet / Desktop : formulaire centré, largeur maximale 420 px.

---

# Accessibilité

* Labels associés, `autocomplete` (name, email, new-password).
* Navigation clavier, contraste AA, `aria-live` sur erreurs.

---

# Performance

* Aucun préchargement ; traitement immédiat de la réponse.

---

# Cas limites

* Email déjà utilisé → message champ email.
* Soumission double → bouton désactivé.
* Erreur réseau pendant l'appel.

---

# Dépendances

* Écrans : SCR-001.
* Services : AuthService (register).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Input, Button, Snackbar - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/RegisterRequest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-AUTH-001).

---

# Hypothèses

* Téléphone et adresse ne sont pas demandés à l'inscription (la Request backend ne les accepte pas — voir ambiguïtés de `docs/01-analysis/api-analysis.md`).

---

# Décisions

* Pas de champ téléphone/adresse à l'inscription (alignement sur l'API réelle).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
