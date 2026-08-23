# Screen Specification

# Informations générales

## Identifiant

SCR-016

## Nom de l'écran

Mot de passe oublié

## Module

* Citizen
* Agent
* Admin

## Objectif

Permettre à un utilisateur de demander l'envoi d'un lien de réinitialisation de mot de passe.

## Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Description

Écran public de demande de réinitialisation. Il collecte l'email, appelle l'API et affiche systématiquement le même message de confirmation, quel que soit le résultat (non-divulgation de l'existence du compte — BR-AUTH-004).

---

# Parcours utilisateur

`/auth/login` (SCR-001) → `/auth/forgot-password` (SCR-016) → succès → retour SCR-001

Précédent : SCR-001 — Suivant : SCR-001

---

# Navigation

## Entrées

* Lien « Mot de passe oublié » depuis SCR-001.

## Sorties

* `/auth/login` (SCR-001) après soumission ou via « Retour à la connexion ».

---

# Permissions

* Aucune (accès public).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/auth/forgot-password | POST | Envoi du lien de réinitialisation |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Email | Saisie utilisateur | Format email, requis |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Envoyer le lien | Appel API + message neutre de confirmation |
| Retour à la connexion | Navigation vers SCR-001 |

---

# États de l'écran

## Loading

Bouton désactivé pendant l'appel.

## Success

Message : « Si l'email existe, un lien de réinitialisation a été envoyé » (identique dans tous les cas).

## Empty

Non applicable.

## Error

422 (email malformé) → message champ ; erreur réseau → bannière.

## No Results

Non applicable.

## Offline

Bannière « Pas de réseau ».

---

# Validations

* Email : format email, requis.

---

# Messages utilisateur

* Confirmation neutre (voir Success).
* « Veuillez saisir une adresse email valide ».

---

# Composants UI

* Page Header
* Input (email)
* Button (Primary)
* Link (retour)

---

# Responsive

* Paradigme : Mobile First (espace Citizen).
* Mobile : plein écran ; Tablet/Desktop : centré, 420 px max.

---

# Accessibilité

* Labels, navigation clavier, `aria-live`, contraste AA.

---

# Performance

* Aucun préchargement.

---

# Cas limites

* Email inexistant : même message que succès (BR-AUTH-004).
* Demande répétée : possible (throttling géré par le broker backend si configuré).

---

# Dépendances

* Écrans : SCR-001, SCR-017.

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Input, Button - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/ForgotPasswordRequest.php`

---

# Critères d'acceptation

* [ ] Message identique quel que soit le résultat de la demande.
* [ ] Endpoint existant utilisé.
* [ ] Tous les états gérés.

---

# Hypothèses

* Le lien reçu ouvre `/auth/reset-password` avec les paramètres `token` et `email` (URL construite par le backend via `frontend_url`).

---

# Décisions

* Affichage du message neutre fourni par l'API (`If the email exists, a reset link has been sent.`).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
