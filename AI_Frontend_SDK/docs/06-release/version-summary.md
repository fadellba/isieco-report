# Résumé de version

---

# Informations générales

## Version

1.1.0

---

## Date

2026-08-10

---

## Statut

* Stable (périmètre fonctionnel complet, réserves documentées)

---

# Périmètre

Application unique `isieco-report-frontend` (Angular 22, Standalone + Signals) couvrant les trois espaces **Citizen**, **Agent** et **Admin**, branchée sur l'API Laravel `isieco-report` (Sanctum, Spatie roles, pagination native). Panneau latéral complet des 17 spécifications d'écran, du design system et des décisions ADR-001 à 006.

---

# Fonctionnalités

| Identifiant | Fonctionnalité | Rôle | Statut |
|---|---|---|---|
| FEAT-AUTH | Authentification (login, register, reset) | Tous | Livré |
| FEAT-CITIZEN-SIGNALEMENT | Signalements (carte, création, liste, détail, points) | Citizen | Livré |
| FEAT-AGENT-INTERVENTION | Suivi des interventions | Agent | Livré |
| FEAT-ADMIN-DASHBOARD | Dashboard + heatmap | Admin | Livré |
| FEAT-ADMIN-VALIDATION | File de validation / priorisation | Admin | Livré |
| FEAT-ADMIN-AFFECTATION | Affectation signalements → équipes | Admin | Livré |
| FEAT-ADMIN-INTERVENTION | Suivi des interventions (vision admin) | Admin | Livré |
| FEAT-ADMIN-EQUIPE | Gestion des équipes | Admin | Livré |
| FEAT-ADMIN-REFERENTIEL | Référentiels zones / types de déchets | Admin | Livré |
| FEAT-ADMIN-USER | Gestion des comptes utilisateurs | Admin | Livré |

---

# Écrans

| Identifiant | Écran | Module | Statut |
|---|---|---|---|
| SCR-001 | Connexion | Auth | Livré |
| SCR-002 | Inscription citoyen | Auth | Livré |
| SCR-003 | Carte des signalements | Citizen | Livré |
| SCR-004 | Création d'un signalement | Citizen | Livré |
| SCR-005 | Liste des signalements | Citizen | Livré |
| SCR-006 | Détail d'un signalement | Citizen / Agent / Admin | Livré |
| SCR-007 | Dashboard admin | Admin | Livré |
| SCR-008 | File de validation | Admin | Livré |
| SCR-009 | Affectations | Admin | Livré |
| SCR-010 | Interventions | Agent / Admin | Livré |
| SCR-011 | Équipes | Admin | Livré |
| SCR-012 | Référentiels | Admin | Livré |
| SCR-013 | Utilisateurs | Admin | Livré |
| SCR-014 | Profil | Tous | Livré |
| SCR-015 | Points citoyen | Citizen | Livré |
| SCR-016 | Mot de passe oublié | Auth | Livré |
| SCR-017 | Réinitialisation mot de passe | Auth | Livré |

---

# Composants

| Identifiant | Composant | Design System | Statut |
|---|---|---|---|
| CMP-001 | Carte interactive (Leaflet) | Oui | Livré |
| CMP-002 | Formulaire de signalement | Oui | Livré |
| CMP-003 | Fiche de signalement | Oui | Livré |
| CMP-004 | Liste paginée | Oui | Livré |
| CMP-005 | Badge de points | Oui | Livré |

---

# Points de version

* **Points forts** : avancement complet du périmètre (17 écrans) ; architecture Standalone/Signals cohérente ; contrat API réconcilié (ADR-006) ; qualité vérifiée (72/72 backend, 15/15 front).
* **Points sensibles** : upload de photos absent côté API ; warnings Leaflet au build.
* **Éléments à surveiller** : migration Figma frames → component sets ; maintenance du validateur de concordance front/back.

---

# Prochaines étapes

* Mise en service d'un provider de stockage de photos (ADR-005) pour SCR-004 / SCR-010.
* Revue du flux de réinitialisation de mot de passe courriel (côté serveur, hors périmètre actuel).
* Élargissement des tests unitaires frontend (couverture composants UI).

---

# Historique

Créé par : Release Manager (openCode)

Date : 2026-08-10

Dernière mise à jour : 2026-08-10

---

# Notes

Remplacent les placeholders initiaux de `06-release`, rédigés suite au bouclage du Workflow 05 et à la revue REV-001 (module Admin).