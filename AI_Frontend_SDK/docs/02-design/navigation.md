# Navigation — ISI-Eco-Report

Statut : Vérifié (cohérent avec l'analyse backend)

Auteur : Product Architect

Date : 2026-08-06

Version : 1.0

---

# 1. Objectif

Définir l'arborescence de navigation de l'application Angular ISI-Eco-Report :

* les routes principales et sous-routes par module (Citizen, Agent, Admin) ;
* les redirections automatiques ;
* les Guards d'authentification et de rôle ;
* la gestion des accès non autorisés.

Cette navigation est conçue exclusivement à partir des capacités réelles de l'API (`docs/01-analysis/endpoints.md`) et des règles métier (`docs/01-analysis/business-rules.md`).

---

# 2. Principes

* **Une seule application, trois espaces** : la navigation est cloisonnée par rôle (`citizen`, `agent`, `admin`) selon les permissions backend (Policies + middleware `role:admin`).
* **Guard Auth** : toute route protégée exige un token valide ; la session est restaurée via `GET /api/user`.
* **Guard Role** : chaque espace exige le rôle correspondant ; en cas de non-conformité → écran d'accès refusé (403).
* **Redirection par rôle après connexion** : Citizen → carte, Agent → interventions, Admin → dashboard.
* **Mobile First** : navigation basse (Bottom Navigation) sur mobile, barre latérale / top bar sur desktop (voir specs écrans).
* Les routes ne couvrent que les écrans définis en `docs/02-design/screen-specifications/` (SCR-001 à SCR-017).

---

# 3. Arborescence des routes

## 3.1 Routes publiques (Guard Guest)

| Route | Écran | Description |
| ----- | ----- | ----------- |
| `/auth/login` | SCR-001 | Connexion |
| `/auth/register` | SCR-002 | Inscription citoyen |
| `/auth/forgot-password` | SCR-016 | Demande de lien de réinitialisation |
| `/auth/reset-password` | SCR-017 | Saisie du nouveau mot de passe (lien reçu par email) |
| `/**` (non reconnue) | — | Redirection vers `/auth/login` (utilisateur non connecté) |

## 3.2 Espace Citizen

| Route | Écran | Description |
| ----- | ----- | ----------- |
| `/citizen/map` | SCR-003 | Carte de mes signalements (accueil Citizen) |
| `/citizen/reports/create` | SCR-004 | Création d'un signalement |
| `/citizen/reports` | SCR-005 | Liste de mes signalements |
| `/citizen/reports/:id` | SCR-006 | Détail d'un signalement |
| `/citizen/points` | SCR-015 | Solde et historique de points |
| `/profile` | SCR-014 | Mon profil (accessible aussi à Agent et Admin) |

## 3.3 Espace Agent

| Route | Écran | Description |
| ----- | ----- | ----------- |
| `/agent/interventions` | SCR-010 | Liste des interventions (accueil Agent) |
| `/agent/interventions/:id` | SCR-010 | Détail / suivi d'une intervention |
| `/agent/reports/:id` | SCR-006 | Détail d'un signalement (vision Agent) |
| `/profile` | SCR-014 | Mon profil |

## 3.4 Espace Admin

| Route | Écran | Description |
| ----- | ----- | ----------- |
| `/admin/dashboard` | SCR-007 | Dashboard : carte des zones critiques (accueil Admin) |
| `/admin/validation` | SCR-008 | File de validation et priorisation des signalements |
| `/admin/affectations` | SCR-009 | Affectation des signalements aux équipes |
| `/admin/interventions` | SCR-010 | Suivi des interventions (vision Admin) |
| `/admin/equipes` | SCR-011 | Gestion des équipes de collecte |
| `/admin/referentiels` | SCR-012 | Gestion des zones et types de déchets |
| `/admin/users` | SCR-013 | Gestion des utilisateurs |
| `/admin/reports/:id` | SCR-006 | Détail d'un signalement (vision Admin) |
| `/profile` | SCR-014 | Mon profil |

---

# 4. Guards et redirections

## 4.1 AuthGuard

* Vérifie la présence d'un token et sa validité (`GET /api/user`).
* Token absent ou invalide → redirection vers `/auth/login` (avec `returnUrl` pour revenir après connexion).

## 4.2 RoleGuard

* Vérifie `user.role` (défaut `citizen`) retourné par `GET /api/user`.
* Rôle insuffisant → écran d'accès refusé (403) avec lien vers l'accueil de son propre espace.

## 4.3 GuestGuard

* Utilisateur déjà connecté sur une route publique → redirection vers l'accueil de son rôle.

## 4.4 Tableau des redirections

| Situation | Redirection |
| --------- | ----------- |
| Connexion réussie (citizen) | `/citizen/map` |
| Connexion réussie (agent) | `/agent/interventions` |
| Connexion réussie (admin) | `/admin/dashboard` |
| Session expirée (401 sur appel API) | `/auth/login` + `returnUrl` |
| Accès refusé (403 API ou rôle) | Écran 403 (accès refusé) |
| Route inconnue (connecté) | Accueil du rôle |
| Route inconnue (non connecté) | `/auth/login` |

---

# 5. États de navigation transverses

* **Session expirée en cours d'utilisation** : à la réception d'un 401, purge du token local et redirection vers la connexion (message « Session expirée, veuillez vous reconnecter »).
* **Accès refusé** : les actions refusées par le backend (403) déclenchent un message contextuel ; l'UI masque en amont les actions non autorisées (voir règles BR-SIG-006/007, BR-EQP-003…).
* **Retour** : chaque écran de détail permet un retour à la liste ; les parcours de création reviennent à la carte (Citizen).

---

# 6. Lien avec les documents

| Document | Contenu lié |
| -------- | ----------- |
| `screen-specifications/*.md` | Définition détaillée des écrans SCR-001 à SCR-017 |
| `component-specifications/*.md` | Définition détaillée des composants réutilisables CMP-001 à CMP-005 |
| `docs/02-design/user-flows.md` | Parcours utilisateurs complets par rôle |
| `docs/01-analysis/endpoints.md` | Endpoints appelés par chaque écran |
| `docs/01-analysis/business-rules.md` | Règles métier conditionnant les actions |
| `docs/01-analysis/architecture-analysis.md` | Traçabilité SCR/CMP/BR/API |

---

# 7. Maquettes Figma

Page : à définir par l'UI Designer (Workflow 02, Étape 6).

Les frames devront couvrir les trois espaces (Citizen, Agent, Admin) et les états transverses (chargement, erreur, vide, accès refusé).

---

# Historique

Version : 1.0 — Auteur : Product Architect — Date : 2026-08-06

# Statut

Validé
