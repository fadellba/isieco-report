# Analyse de l'API — ISI-Eco-Report

Statut : Vérifié

Auteur : Backend Analyst

Date : 2026-08-06

Version : 1.0

---

# 1. Vue d'ensemble

L'API `ISI-Eco-Report` est une API REST JSON exposée par un backend Laravel 12. Elle couvre l'ensemble du cycle de vie des signalements de dépôts sauvages de déchets : création par les citoyens, validation et priorisation, affectation aux équipes de collecte, interventions terrain, clôture et attribution de points de fidélité.

* Nombre d'endpoints : 44 (4 publics, 40 protégés).
* Spécification : attributs OpenAPI dans `app/Http/Controllers/Api/OpenApi.php` (titre « ISI-Eco-Report API », version 1.0.0).
* Rôles : `admin`, `agent`, `citizen` (Spatie Permission).
* Tests : suite Feature dédiée (Auth, Signalement, Affectation, Intervention, Dashboard, Equipe, Zone, TypeDechet, User + tests d'autorisation).

---

# 2. Conventions API

## 2.1 Transport et format

* Base : `/api`.
* JSON uniquement ; aucun endpoint n'exige d'en-tête particulier hors `Accept: application/json` (par défaut pour les clients API).
* Authentification : en-tête `Authorization: Bearer <token>` (Sanctum). Nom du token : `auth_token`.

## 2.2 Nommage

* Routes REST conventionnelles (`apiResource`) avec préfixes français : `signalements`, `affectations`, `interventions`, `equipes`, `zones`, `types-dechets`, `users`, `historique-points`.
* Exceptions : `interventions/{id}/cloturer` (POST, action dédiée), `dashboard/heatmap` (GET).
* Groupes publics sous `/auth` : `register`, `login`, `forgot-password`, `reset-password`. `logout` est protégé (nécessite le token).

## 2.3 Pagination

* Tous les `index` paginent à 15 éléments par page (`paginate(15)`).
* Structure de réponse Laravel : `{ data, links, meta }`.
* Aucun paramètre de tri, filtre ou taille de page n'est exposé.

## 2.4 Statuts HTTP

| Statut | Usage |
| ------ | ----- |
| 200 | Succès (GET, PUT, POST login/forgot/reset/cloturer) |
| 201 | Création (register, signalements, affectations, interventions, equipes, zones, types-dechets, users) |
| 204 | Suppression, logout |
| 401 | Non authentifié ou identifiants invalides |
| 403 | Autorisé par l'authentification mais refusé par policy/rôle |
| 404 | Ressource inexistante |
| 422 | Validation échouée ou transition de statut invalide |
| 500 | Erreur non gérée |

---

# 3. Authentification et rôles

## 3.1 Flux

1. `register` : création du compte (rôle `citizen` imposé) + token immédiat.
2. `login` : vérification email + hash → token. Chaque connexion émet un token ; les tokens antérieurs restent valides jusqu'à déconnexion.
3. `logout` : suppression du token courant (204).
4. `forgot-password` / `reset-password` : broker `Password` ; lien construit avec `frontend_url` (`/reset-password?token=...&email=...`).

## 3.2 Rôles et droits résumés

| Ressource | Citizen | Agent | Admin |
| --------- | ------- | ----- | ----- |
| Signalements (liste) | Les siens | Tous | Tous |
| Signalements (détail) | Les siens | Tous | Tous |
| Signalements (création) | Oui | Oui | Oui |
| Signalements (modification) | Les siens (brouillon / en_attente_validation) | Non | Tous |
| Signalements (suppression) | Les siens (brouillon) | Non | Tous |
| Affectations | Non | Lecture | Lecture + écriture |
| Interventions | Non | Lecture + écriture + clôture | Lecture + écriture + clôture |
| Équipes | Non | Lecture | Lecture + écriture |
| Zones / Types de déchets | Lecture | Lecture | Lecture + écriture |
| Utilisateurs | Non | Non | Tout |
| Historique de points | Lecture (liste non filtrée — voir ambiguïtés) | Lecture (liste) | Tout |
| Dashboard heatmap | Non | Non | Oui |

Droits implémentés par : Policies (contrôle fin) + middleware `role:admin` (routes `users` et `dashboard/heatmap`).

---

# 4. Modèle de données

| Table | Champs principaux | Relations / remarques |
| ----- | ----------------- | --------------------- |
| `users` | nom, prenom, email, telephone, adresse, password, etat_compte | rôles via Spatie (`model_has_roles`) ; accesseurs `name` (prenom nom), `nom_complet` ; helpers `isAdmin/isAgent/isCitizen` |
| `signalements` | description, latitude (10,8), longitude (11,8), statut, priorite, user_id, zone_id | statut via machine à états (RG15/RG16) ; relations : user, zone, typeDechets (pivot), photos |
| `contenu_signalement` (pivot) | signalement_id, type_dechet_id, quantite_estime, volume_estime, dangerosite, remarque | types de déchets par signalement |
| `photo_signalements` | url, description, signalement_id | photos d'un signalement |
| `zones` | nom_zone, description | signalements, équipes (pivot couverture) |
| `types_dechets` | libelle, description | pivot contenu_signalement |
| `equipes` | nom_equipe, description | agents (pivot appartenance : date_debut + fonction, PK composite RG8), zones (pivot couverture PK composite RG22/RG23) |
| `affectations` | date_heure_affectation, observation, equipe_id, signalement_id | signalement → statut `affecte` |
| `interventions` | date_heure_debut, date_heure_fin, statut, compte_rendu, observation, affectation_id | statut : en_cours / terminee / suspendue ; photos dédiées |
| `photo_interventions` | url, description, intervention_id | photos d'une intervention |
| `historique_points` | nombre_points, motif, description, date_attribution, user_id | traçabilité des points (100 pts par signalement clôturé) |
| Tables Spatie | roles, permissions, model_has_roles, ... | rôles `admin`, `agent`, `citizen` |
| Tables Sanctum | personal_access_tokens | tokens `auth_token` |

Enums (valeurs de l'API) :

* `RoleEnum` : `admin`, `agent`, `citizen`
* `SignalementStatutEnum` : `brouillon`, `en_attente_validation`, `valide`, `rejete`, `priorise`, `affecte`, `en_intervention`, `termine`, `cloture`
* `SignalementPrioriteEnum` : `faible`, `normale`, `haute`, `urgente`
* `InterventionStatutEnum` : `en_cours`, `terminee`, `suspendue`
* `DangerositeEnum` : `faible`, `modere`, `eleve`, `extreme`

---

# 5. Ressources API (formats de réponse)

| Resource | Champs |
| -------- | ------ |
| UserResource | id, nom, prenom, name, email, roles[], role (défaut `citizen`), created_at, updated_at |
| SignalementResource | id, description, latitude, longitude, statut, priorite, user (whenLoaded), zone (whenLoaded), type_dechets (whenLoaded, avec pivot), photos (whenLoaded), timestamps |
| AffectationResource | id, date_heure_affectation, observation, equipe (whenLoaded), signalement (whenLoaded), timestamps |
| InterventionResource | id, date_heure_debut, date_heure_fin, statut, compte_rendu, observation, affectation (whenLoaded), photos (whenLoaded), timestamps |
| EquipeResource | id, nom_equipe, description, agents (whenLoaded), zones (whenLoaded) |
| ZoneResource | id, nom_zone, description |
| TypeDechetResource | id, libelle, description |
| HistoriquePointResource | id, nombre_points, motif, description, date_attribution, user (whenLoaded) |
| HeatmapResource | latitude, longitude, weight, zone_id, zone_nom |
| AuthResource | `{ user: UserResource, token }` |

Note : en liste (`index`), les relations ne sont pas chargées → champs `whenLoaded` absents ou nuls. En détail (`show`/`store`), les relations sont chargées.

---

# 6. Flux métier transverse (cycle de vie complet)

```
Citizen                Admin/Agent              Système
   │                       │                       │
   ├─ POST signalements ───┤                       │   statut = en_attente_validation
   │                       ├─ PUT signalements ────┤   valide | rejete
   │                       ├─ POST affectations ───┤   statut = affecte (si valide|priorise)
   │                       ├─ POST interventions ──┤   statut = en_intervention (si affecte)
   │                       ├─ PUT interventions ───┤   terminee → signalement termine
   │                       └─ POST interventions/  │   cloture → signalement cloture
   │                               {id}/cloturer   └─  +100 points au propriétaire
   └────────── suivi + points ─────────────────────┘
```

---

# 7. Points forts de l'API

* Toutes les règles métier sont appliquées côté serveur (transitions RG15/RG16 dans l'enum, vérifications dans les Services).
* Transactions sur tous les flux multi-écritures (création signalement + pivots, intervention + transition, clôture + points, équipe + agents).
* DTO typés entre validation et métier — pas de tableau brut.
* Isolation citoyen sur les signalements (liste et détail) et sur le détail des points.
* Réponses 201/204 cohérentes, erreurs JSON documentées.
* Heatmap agrégée en SQL sans données personnelles.

---

# 8. Ambiguïtés et décisions à trancher

1. **Historique de points — liste non filtrée** : `GET /api/historique-points` retourne l'ensemble des attributions à tout utilisateur authentifié, alors que le commentaire de route prévoit « propre utilisateur ou Admin ». Décision : filtrer côté backend (recommandé) ou assumer l'exposition.
2. **Annulation d'affectation** : `DELETE /api/affectations/{id}` ne réinitialise pas le statut du signalement (il reste `affecte`), or la transition `affecte → affecte` n'est pas autorisée → un signalement désaffecté ne peut plus être ré-affecté. Décision : réinitialiser vers `valide`/`priorise` à la suppression, ou documenter la limitation.
3. **Suppression d'intervention** : idem, `DELETE /api/interventions/{id}` ne ramène pas le signalement vers `affecte`.
4. **Écarts documentation OpenAPI vs implémentation** : l'exemple `register` mentionne `telephone` et `adresse`, non acceptés par la Request ; la liste OpenAPI comporte des endpoints PUT qui n'existent pas tous côté routes (à vérifier point par point). La spécification OpenAPI doit être alignée sur les routes réelles.
5. **Reset de mot de passe — échec du broker** : `Password::reset` lève `PasswordException` sur token invalide/expiré, non rendue en JSON → 500. À corriger (rendu 422/400) ou à confirmer par test.
6. **Clôture répétée** : la clôture d'une intervention déjà clôturée est protégée par la transition (`cloture` terminal), mais une même intervention peut être clôturée une seule fois — sans idempotence explicite. Aucun risque d'attribution multiple (la 2e tentative échoue en 422).
7. **Équipe — ré-inclusion même jour** : le `sync` réinitialise `date_debut` (PK du pivot avec user_id et equipe_id, RG8) ; ré-inclure un agent le même jour peut créer un doublon. À confirmer par test.
8. **Multi-interventions par affectation** : aucune contrainte d'unicité — plusieurs interventions peuvent exister pour une affectation (modèle assumé : plusieurs passages).
9. **Pas de géolocalisation modifiable** : `PUT /api/signalements/{id}` n'accepte ni latitude ni longitude.
10. **Pas de classement/leaderboard** : aucun endpoint de classement des citoyens par points ; l'historique est la seule source de points.
11. **Auto-édition du profil** : `PUT /api/users/{id}` est réservé aux Admin (middleware `role:admin`) — un citoyen/agent ne peut pas modifier son propre profil ; aucun endpoint `/api/profile` n'existe. Décision : ajouter un endpoint dédié (`PUT /api/profile`) ou ouvrir `users/{id}` au propriétaire (impact SCR-014).

---

# 9. Recommandations pour le frontend (phase Design)

1. S'appuyer sur la table de transitions (BR-SIG-002) pour piloter l'affichage des actions (boutons « valider », « affecter », « démarrer », « terminer », « clôturer »).
2. Modèle d'interaction : le citoyen crée (statut `en_attente_validation`), ne peut ni supprimer ni modifier au-delà du brouillon — l'UI doit masquer ces actions dès soumission.
3. La carte interactive (Citizen / Admin) utilise les coordonnées de `signalements` ; la heatmap admin utilise `dashboard/heatmap` (agrégat par zone).
4. Gérer la pagination (15/page) côté listes avec la structure `data/links/meta`.
5. Stocker le token côté client et l'envoyer en Bearer ; utiliser `GET /api/user` pour restaurer la session et charger le rôle.
6. Upload des photos : l'API n'accepte que des URLs — prévoir un service de stockage (ou provider tiers) avant le formulaire.
7. Les valeurs d'enums (`statut`, `priorite`, `dangerosite`, `role`) doivent être traduites en libellés UI via des pipes/mappings constants.
8. Points : afficher le solde via la somme de `historique_points` (en attendant un éventuel endpoint de classement).
9. Traiter les 422 métier comme des états attendus (messages d'exception à afficher tels quels) ; traiter les 403 par des redirections selon le rôle.

---

# 9 bis. Contrat d'intégration frontend ↔ backend

Convention contraignante pour toute intégration des endpoints documentés.

## Casse des champs

* L'API échange en **snake_case** (`created_at`, `statut`, `equipe_id`).
* Les interfaces TypeScript répliquent les payloads en **camelCase** via des mappers DTO explicites ; aucun champ n'est utilisé en snake_case dans les composants.
* Cette conversion est documentée pour chaque ressource dans les specs écrans/API.

## Pagination

* Réponses paginées : structure Laravel `data / links / meta` ; taille par défaut 15, paramètre `page` (1-based).
* Les listes UI consomment `meta.last_page` / `links` pour la pagination infinie ou numérique.

## Erreurs

* Format JSON uniforme. Codes attendus :
  * `401` — non authentifié : purge locale du token, retour à la connexion ;
  * `403` — rôle insuffisant : redirection selon le rôle ;
  * `404` — ressource absente ;
  * `422` — erreur de validation/métier : objet `errors` à afficher tel quel ;
  * `429` — rate limiting : non configuré côté API, prévoir une temporisation côté client si le backend l'active ;
  * `500` — erreur générique, message générique côté UI.

## Base URL et CORS

* Côté frontend : base URL configurable (`VITE_API_URL`, fallback `http://localhost:8000/api`).
* Côté backend : `FRONTEND_URL` (`.env` = `http://localhost:4200`) alimente la config CORS ; toute évolution du port/domaine du frontend doit être synchronisée dans le `.env` du backend.

## Session et token

* Token Bearer conservé côté client (ADR-001) ; `GET /api/user` permet de restaurer la session et charger le rôle après un rechargement.
* Toute réponse `401` entraîne la purge locale du token et le retour à l'écran de connexion.

## Champs masqués par UserResource

`UserResource` n'expose pas les colonnes `telephone`, `adresse`, `etat_compte` de la table `users` (voir § 7 — colonnes). Conséquences frontend :

* l'écran Profil ne peut pas afficher ni modifier ces champs (SCR-014) ;
* l'administration des utilisateurs ne peut pas les consulter ni les éditer ;
* **Décision requise** : exposer ces champs via `UserResource` (optionnellement restreint à l'admin) ou les retirer des maquettes/specs.

## Versioning

* Pas de préfixe `/api/v1` — les URLs sont stables sous `/api` ; le contrat ne dépend d'aucun mécanisme de versioning.

---

# 10. Références

* Routes : `routes/api.php`
* Spécification : `app/Http/Controllers/Api/OpenApi.php`
* Controllers : `app/Http/Controllers/Api/*`
* Services : `app/Services/*`
* Repositories : `app/Repositories/Contracts/*`, `app/Repositories/Eloquent/*`
* Policies : `app/Policies/*`
* Resources : `app/Http/Resources/*`
* Enums : `app/Enums/*`
* Exceptions : `app/Exceptions/Auth/*`, `app/Exceptions/Business/*`
* Config : `config/app.php` (`frontend_url`)
* Tests : `tests/Feature/*`
* Documents liés : `docs/01-analysis/endpoints.md`, `docs/01-analysis/business-rules.md`, `docs/01-analysis/architecture-analysis.md`
