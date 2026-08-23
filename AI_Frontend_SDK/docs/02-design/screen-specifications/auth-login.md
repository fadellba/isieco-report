# Screen Specification

# Informations générales

## Identifiant

SCR-001

## Nom de l'écran

Connexion

## Module

* Citizen
* Agent
* Admin

## Objectif

Permettre à un utilisateur de se connecter avec son email et son mot de passe.

## Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Description

Écran d'entrée de l'application pour les utilisateurs enregistrés. Il collecte les identifiants, appelle l'API de connexion, stocke le token et redirige vers l'espace du rôle. Il donne accès aux parcours d'inscription et de mot de passe oublié.

---

# Parcours utilisateur

`/auth/login` (SCR-001) → redirection selon le rôle : `/citizen/map`, `/agent/interventions` ou `/admin/dashboard`

Précédent : — (accès public) / SCR-016 (retour après demande de lien)

---

# Navigation

## Entrées

* Accès direct public (redirection automatique si non connecté)
* Retour depuis `/auth/forgot-password` (SCR-016)
* Retour depuis `/auth/reset-password` (SCR-017)

## Sorties

* `/auth/register` (SCR-002) — lien « Créer un compte »
* `/auth/forgot-password` (SCR-016) — lien « Mot de passe oublié »
* Accueil du rôle (après succès) — UF-002

---

# Permissions

* Aucune (accès public) ; si l'utilisateur est déjà connecté → redirection vers son accueil (GuestGuard).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/auth/login | POST | Authentification et émission du token |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Email | Saisie utilisateur | Champ email |
| Mot de passe | Saisie utilisateur | Champ masqué |
| Message d'erreur | Réponse API (401/422) | Identifiants invalides ou erreurs de validation |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Se connecter | Appel API, stockage du token, redirection selon le rôle |
| Créer un compte | Navigation vers SCR-002 |
| Mot de passe oublié | Navigation vers SCR-016 |

---

# États de l'écran

## Loading

Bouton « Se connecter » désactivé avec indicateur de chargement ; double soumission impossible.

## Success

Message de bienvenue (optionnel), redirection immédiate vers l'accueil du rôle.

## Empty

Non applicable.

## Error

Bannière d'erreur : « Identifiants invalides » (401) ; messages champ par champ (422) ; « Service indisponible, réessayez plus tard » (réseau/5xx).

## No Results

Non applicable.

## Offline

Bannière « Connexion impossible : pas de réseau » ; le bouton reste actif pour permettre un réessai.

---

# Validations

* Email : format email obligatoire (miroir des règles API).
* Mot de passe : obligatoire.
* (La validation d'authenticité reste côté serveur : BR-AUTH-002.)

---

# Messages utilisateur

* Succès : « Connexion réussie ».
* Erreur 401 : « Identifiants invalides ».
* Erreur réseau : « Impossible de se connecter au serveur ».
* Session expirée (redirection depuis une page protégée) : « Votre session a expiré, veuillez vous reconnecter ».

---

# Composants UI

* Page Header (logo ISI-Eco Report)
* Input (email, password avec affichage/masquage)
* Button (Primary, plein largeur)
* Link
* Alert (erreur)
* Snackbar

---

# Responsive

* Paradigme : Mobile First (espace Citizen).
* Mobile : formulaire plein écran, bouton pleine largeur, clavier adapté (type email).
* Tablet : formulaire centré, largeur maximale 420 px.
* Desktop : formulaire centré sur fond à deux colonnes (marque + formulaire).

---

# Accessibilité

* Labels associés aux champs (`for`/`id`).
* Navigation clavier complète (Tab, Enter pour soumettre).
* Contraste AA sur textes et messages d'erreur.
* `aria-live` sur les messages d'erreur.

---

# Performance

* Aucun chargement de données préalable.
* Stockage du token immédiat après réponse.

---

# Cas limites

* Email inconnu vs mot de passe erroné : même message (BR-AUTH-002, pas d'énumération).
* Soumission multiple : bouton désactivé pendant l'appel.
* Erreur réseau pendant la soumission.

---

# Dépendances

* Écrans : SCR-002, SCR-016, SCR-017.
* Services : AuthService (login, stockage token), SessionService (restauration `GET /api/user`).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Input, Button, Snackbar - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/LoginRequest.php` — Exception : `app/Exceptions/Auth/InvalidCredentialsException.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés (loading, error, offline).
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-AUTH-002).

---

# Hypothèses

* Le token est stocké côté client (localStorage sécurisé) et restauré via `GET /api/user`.
* Le libellé exact « Identifiants invalides » provient de la réponse 401 de l'API.

---

# Décisions

* Message unique pour email inconnu / mot de passe erroné (conformité backend).
* Redirection par rôle après connexion (définie dans `docs/02-design/navigation.md`).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
