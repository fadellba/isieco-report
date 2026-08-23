# User Flows — ISI-Eco-Report

Statut : Vérifié (cohérent avec l'analyse backend)

Auteur : Product Architect

Date : 2026-08-06

Version : 1.0

---

# 1. Objectif

Décrire les parcours utilisateurs complets pour chaque rôle (Citizen, Agent, Administrator), étape par étape, en cohérence avec les règles métier (`docs/01-analysis/business-rules.md`) et les endpoints (`docs/01-analysis/endpoints.md`).

Conventions :

* `→` : étape suivante ;
* `[SCR-xxx]` : écran concerné ;
* `BR-xxx` : règle métier appliquée ;
* `API xxx` : endpoint appelé.

---

# 2. Parcours Citizen

## UF-001 — Inscription d'un citoyen

1. Accès : `/auth/register` [SCR-002]
2. Remplir nom, prénom, email, mot de passe + confirmation
3. Validation locale (email valide, mot de passe ≥ 8) → soumission `POST /api/auth/register`
4. Succès : stockage du token → redirection `/citizen/map` [SCR-003]
5. Sortie : session active, écran d'accueil

Cas d'erreur :

* 422 (email déjà utilisé) → message champ par champ [SCR-002]

Règles : BR-AUTH-001

## UF-002 — Connexion

1. Accès : `/auth/login` [SCR-001]
2. Saisie email + mot de passe → `POST /api/auth/login`
3. Succès : stockage du token → redirection selon le rôle (citizen → `/citizen/map`, agent → `/agent/interventions`, admin → `/admin/dashboard`)
4. Sortie : session active

Cas d'erreur :

* 401 → message « Identifiants invalides » (email ou mot de passe) [SCR-001]
* 422 → validation champ par champ

Règles : BR-AUTH-002

## UF-003 — Mot de passe oublié

1. Accès : `/auth/login` → lien « Mot de passe oublié » → `/auth/forgot-password` [SCR-016]
2. Saisie email → `POST /api/auth/forgot-password`
3. Succès : message neutre « Si l'email existe, un lien a été envoyé » → retour `/auth/login`
4. À réception de l'email : ouverture du lien `frontend_url/reset-password?token=...&email=...` → `/auth/reset-password` [SCR-017]
5. Saisie nouveau mot de passe + confirmation → `POST /api/auth/reset-password`
6. Succès : message « Mot de passe réinitialisé » → connexion [SCR-001]

Règles : BR-AUTH-004, BR-AUTH-005

## UF-004 — Création d'un signalement

1. Accès : `/citizen/map` → bouton « Nouveau signalement » → `/citizen/reports/create` [SCR-004]
2. Géolocalisation : position GPS (API Geolocation navigateur), repositionnement possible sur la carte
3. Photo : prise de vue ou import (prévisualisation) — les fichiers sont hébergés puis leur URL est envoyée à l'API
4. Détails : description facultative, types de déchets (multi-sélection, quantités/volumes/dangerosité/remarques), zone facultative
5. Soumission → `POST /api/signalements`
6. Succès : message de confirmation → retour `/citizen/map` avec le signalement affiché (statut `en_attente_validation`)

Cas d'erreur :

* 422 (lat/lng hors plage, type de déchet inexistant, URL photo invalide) → messages champ par champ
* Hors ligne : brouillon local avec avertissement « Enregistrement impossible hors ligne » (le backend n'accepte que des URLs de photos)

Règles : BR-SIG-001, BR-SIG-002

## UF-005 — Suivi de mes signalements

1. Accès : `/citizen/reports` [SCR-005] → `GET /api/signalements` (filtré automatiquement côté serveur pour le citoyen)
2. Consultation du détail : `/citizen/reports/:id` [SCR-006] → `GET /api/signalements/{id}`
3. Actions selon le statut (dérivées de la machine à états BR-SIG-002) :
   * `brouillon` → modifier / supprimer (BR-SIG-006, BR-SIG-007)
   * `en_attente_validation` → modifier (pas de suppression)
   * statuts suivants → consultation seule
4. Sortie : retour liste ou carte

Cas d'erreur :

* 403 sur une action → message « Cette action n'est plus autorisée » (état déjà engagé)

Règles : BR-SIG-002, BR-SIG-005, BR-SIG-006, BR-SIG-007

## UF-006 — Points de fidélité

1. Accès : `/citizen/points` [SCR-015] → `GET /api/historique-points`
2. Consultation du solde (somme des `nombre_points`) et de l'historique daté
3. Sortie : retour accueil

Cas d'erreur :

* 403 sur le détail d'un enregistrement d'autrui → message d'accès refusé (l'écran ne propose que ses propres enregistrements)

Règles : BR-PTS-001, BR-PTS-002

---

# 3. Parcours Agent

## UF-007 — Suivi des interventions

1. Accès : `/agent/interventions` [SCR-010] → `GET /api/interventions`
2. Ouverture du détail : `/agent/interventions/:id` → `GET /api/interventions/{id}`
3. Actions :
   * terminer (`statut = terminee`) → `PUT /api/interventions/{id}` (le signalement passe `termine`, BR-INT-002)
   * ajouter compte rendu / photos pendant l'intervention
   * clôturer → `POST /api/interventions/{id}/cloturer` (signalement `cloture` + 100 points au citoyen, BR-INT-003)
4. Sortie : retour liste

Cas d'erreur :

* 422 (signalement non `termine` avant clôture) → message « Le signalement doit être terminé avant clôture »

Règles : BR-INT-001, BR-INT-002, BR-INT-003

## UF-008 — Consultation d'un signalement

1. Accès : `/agent/reports/:id` [SCR-006] → `GET /api/signalements/{id}`
2. Lecture seule (description, déchets, photos, statut)
3. Sortie : retour

Règles : BR-SIG-008

---

# 4. Parcours Administrator

## UF-009 — Validation et priorisation des signalements

1. Accès : `/admin/validation` [SCR-008] → `GET /api/signalements` (liste globale)
2. Filtre par statut (`en_attente_validation`, `valide`, `priorise`)
3. Ouverture du détail [SCR-006]
4. Décision :
   * valider → `PUT /api/signalements/{id}` avec `statut = valide`
   * rejeter → `PUT ...` avec `statut = rejete`
   * prioriser → `PUT ...` avec `statut = priorise` (uniquement depuis `valide`)
5. Sortie : retour file

Cas d'erreur :

* 422 (transition non autorisée, ex. rejeter un signalement `affecte`) → message de transition ; l'UI n'affiche que les actions autorisées selon BR-SIG-002

Règles : BR-SIG-002, BR-SIG-003

## UF-010 — Affectation d'un signalement à une équipe

1. Accès : `/admin/affectations` [SCR-009] → liste des affectations `GET /api/affectations`
2. Création : choix du signalement (statut `valide` ou `priorise` uniquement) + équipe + date/heure + observation → `POST /api/affectations`
3. Succès : le signalement passe `affecte` (BR-AFF-001)
4. Annulation possible : `DELETE /api/affectations/{id}` (le statut du signalement reste `affecte` — limitation backend, voir ambiguïtés de `docs/01-analysis/api-analysis.md`)

Règles : BR-SIG-004, BR-AFF-001, BR-AFF-002

## UF-011 — Gestion des équipes

1. Accès : `/admin/equipes` [SCR-011] → `GET /api/equipes`
2. Création : nom + description + sélection d'agents → `POST /api/equipes`
3. Modification : composition remplacée par la liste fournie → `PUT /api/equipes/{id}`
4. Suppression → `DELETE /api/equipes/{id}`
5. Sortie : retour liste

Règles : BR-EQP-001, BR-EQP-002, BR-EQP-003

## UF-012 — Gestion des référentiels (zones, types de déchets)

1. Accès : `/admin/referentiels` [SCR-012] → `GET /api/zones` et `GET /api/types-dechets`
2. CRUD zones → endpoints `zones` (POST/PUT/DELETE)
3. CRUD types de déchets → endpoints `types-dechets` (POST/PUT/DELETE)
4. Sortie : retour

Règles : BR-REF-001

## UF-013 — Gestion des utilisateurs

1. Accès : `/admin/users` [SCR-013] → `GET /api/users`
2. Création (nom, prénom, email, mot de passe, téléphone, adresse, rôle) → `POST /api/users`
3. Modification (dont rôle) → `PUT /api/users/{id}`
4. Suppression → `DELETE /api/users/{id}`
5. Sortie : retour liste

Règles : BR-USR-001

## UF-014 — Pilotage des zones critiques (Dashboard)

1. Accès : `/admin/dashboard` [SCR-007] → `GET /api/dashboard/heatmap`
2. Lecture de la carte agrégée (poids par zone), navigation rapide vers la file de validation et les affectations
3. Sortie : libre

Règles : BR-DASH-001

---

# 5. Parcours transverses

## UF-015 — Mon profil

1. Accès : `/profile` (tous rôles) [SCR-014] → `GET /api/user`
2. Modification nom / prénom / email / mot de passe → `PUT /api/users/{id}` — réservé aux Admin (middleware `role:admin`) : en lecture seule pour Citizen/Agent (ambiguïté « auto-édition du profil » à trancher avec le backend)
3. Déconnexion → `POST /api/auth/logout` → purge du token → `/auth/login`
4. Sortie : selon l'action

Règles : BR-AUTH-003, BR-USR-002

## UF-016 — Session expirée

1. Un appel API retourne 401
2. Purge du token → redirection `/auth/login` avec `returnUrl`
3. Après reconnexion → retour à l'écran initial

---

# 6. Couverture

| Parcours | Rôle | Écrans | Endpoints | Règles |
| -------- | ---- | ------ | --------- | ------ |
| UF-001 Inscription | Citizen | SCR-002 | auth/register | BR-AUTH-001 |
| UF-002 Connexion | Tous | SCR-001 | auth/login | BR-AUTH-002 |
| UF-003 Mot de passe oublié | Tous | SCR-016, SCR-017 | auth/forgot-password, auth/reset-password | BR-AUTH-004, BR-AUTH-005 |
| UF-004 Création signalement | Citizen | SCR-004 | POST signalements | BR-SIG-001 |
| UF-005 Suivi signalements | Citizen | SCR-005, SCR-006 | GET signalements | BR-SIG-002/005/006/007 |
| UF-006 Points | Citizen | SCR-015 | GET historique-points | BR-PTS-001/002 |
| UF-007 Interventions | Agent | SCR-010 | GET/PUT/POST interventions | BR-INT-001/002/003 |
| UF-008 Consultation signalement | Agent | SCR-006 | GET signalements/{id} | BR-SIG-008 |
| UF-009 Validation | Admin | SCR-008, SCR-006 | GET/PUT signalements | BR-SIG-002/003 |
| UF-010 Affectation | Admin | SCR-009 | GET/POST/DELETE affectations | BR-SIG-004, BR-AFF-001/002 |
| UF-011 Équipes | Admin | SCR-011 | equipes CRUD | BR-EQP-001/002/003 |
| UF-012 Référentiels | Admin | SCR-012 | zones, types-dechets | BR-REF-001 |
| UF-013 Utilisateurs | Admin | SCR-013 | users CRUD | BR-USR-001 |
| UF-014 Dashboard | Admin | SCR-007 | dashboard/heatmap | BR-DASH-001 |
| UF-015 Profil | Tous | SCR-014 | GET user, PUT users/{id}, auth/logout | BR-AUTH-003, BR-USR-002 |
| UF-016 Session expirée | Tous | — | — | — |

---

# Historique

Version : 1.0 — Auteur : Product Architect — Date : 2026-08-06

# Statut

Validé
