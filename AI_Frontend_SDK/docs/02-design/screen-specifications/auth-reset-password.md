# Screen Specification

# Informations générales

## Identifiant

SCR-017

## Nom de l'écran

Réinitialisation du mot de passe

## Module

* Citizen
* Agent
* Admin

## Objectif

Permettre de définir un nouveau mot de passe à partir du lien reçu par email.

## Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Description

Écran public atteint via le lien `frontend_url/reset-password?token=...&email=...`. Il pré-remplit l'email à partir des paramètres de l'URL, demande le nouveau mot de passe et sa confirmation, puis appelle l'API de réinitialisation (BR-AUTH-005).

---

# Parcours utilisateur

Email (lien) → `/auth/reset-password` (SCR-017) → succès → `/auth/login` (SCR-001)

Précédent : SCR-016 (émission du lien) — Suivant : SCR-001

---

# Navigation

## Entrées

* Lien reçu par email (paramètres `token` + `email`).
* Accès direct si token absent → redirection vers SCR-016.

## Sorties

* `/auth/login` (SCR-001) après succès ou « Retour à la connexion ».

---

# Permissions

* Aucune (accès public) ; le token valide est vérifié par le backend.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/auth/reset-password | POST | Réinitialisation du mot de passe |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Email | Paramètre d'URL (pré-rempli, non modifiable ou modifiable avec avertissement) | Compte concerné |
| Nouveau mot de passe | Saisie utilisateur | Min 8 caractères |
| Confirmation | Saisie utilisateur | Doit correspondre |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Réinitialiser | Appel API → succès → retour connexion |
| Retour à la connexion | Navigation vers SCR-001 |

---

# États de l'écran

## Loading

Bouton désactivé pendant l'appel.

## Success

Message « Mot de passe réinitialisé » → redirection SCR-001 (l'utilisateur se connecte avec le nouveau mot de passe).

## Empty

Non applicable.

## Error

422 → messages champ par champ ; token invalide/expiré → message d'erreur (comportement backend actuel à confirmer, voir BR-AUTH-005) ; réseau → bannière.

## No Results

Non applicable.

## Offline

Bannière « Pas de réseau ».

---

# Validations

* Mot de passe : ≥ 8 caractères, confirmation identique.
* (Validité du token vérifiée par le backend.)

---

# Messages utilisateur

* Succès : « Votre mot de passe a été réinitialisé ».
* Erreur : « Le lien de réinitialisation est invalide ou expiré » (si 4xx retourné par l'API).

---

# Composants UI

* Page Header
* Input (email pré-rempli, password ×2)
* Button (Primary)
* Link (retour)

---

# Responsive

* Paradigme : Mobile First (espace Citizen).
* Mobile : plein écran ; Tablet/Desktop : centré, 420 px max.

---

# Accessibilité

* Labels, `autocomplete="new-password"`, navigation clavier, contraste AA.

---

# Performance

* Aucun préchargement.

---

# Cas limites

* Token manquant dans l'URL → redirection SCR-016.
* Token expiré → message d'erreur (à confirmer avec le backend, BR-AUTH-005).
* Double soumission → bouton désactivé.

---

# Dépendances

* Écrans : SCR-001, SCR-016.

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Input, Button - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/ResetPasswordRequest.php`

---

# Critères d'acceptation

* [ ] Email pré-rempli depuis l'URL.
* [ ] Endpoint existant utilisé.
* [ ] Tous les états gérés.

---

# Hypothèses

* Le lien reçu contient `token` et `email` (construction backend dans `AppServiceProvider`).

---

# Décisions

* Email pré-rempli et verrouillé (réduction des erreurs de saisie).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
