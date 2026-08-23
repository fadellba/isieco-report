# Endpoints — API ISI-Eco-Report

Statut : Vérifié

Auteur : Backend Analyst

Date : 2026-08-06

Version : 1.0

---

# Conventions globales de l'API

* Base URL : `/api` (préfixe Laravel `routes/api.php`).
* Format : JSON. En-tête d'authentification : `Authorization: Bearer <token>` (Sanctum).
* Pagination : tous les `index` utilisent `paginate(15)` (15 par page) et retournent la structure Laravel `{ data, links, meta }`.
* Erreurs génériques (non répétées par endpoint) :

| HTTP | Cause | Corps |
| ---- | ----- | ----- |
| 401 | Non authentifié ou token invalide | `{"message": "Unauthenticated."}` |
| 401 | Identifiants invalides (login) | `{"message": "Invalid credentials."}` |
| 403 | Non autorisé par policy | `{"message": "This action is unauthorized."}` |
| 404 | Ressource inexistante | Message Laravel de ModelNotFoundException |
| 422 | Échec de validation | `{"message": "...", "errors": {...}}` |
| 422 | Transition de statut invalide | `{"message": "Transition de statut invalide : de 'X' vers 'Y'."}` (messages exacts dans les exceptions) |
| 500 | Erreur non gérée | — |

* Identifiants de règles métier référencés : voir `business-rules.md` (`BR-*`).
* Auteur : Backend Analyst. Dernière vérification : 2026-08-06, version API 1.0.0.

---

# SOMMAIRE

## Authentification (public)

1. [POST /api/auth/register](#post-apiauthregister)
2. [POST /api/auth/login](#post-apiauthlogin)
3. [POST /api/auth/forgot-password](#post-apiauthforgot-password)
4. [POST /api/auth/reset-password](#post-apiauthreset-password)

## Authentification (protégé)

5. [POST /api/auth/logout](#post-apiauthlogout)
6. [GET /api/user](#get-apiuser)

## Signalements

7. [GET /api/signalements](#get-apisignalements)
8. [POST /api/signalements](#post-apisignalements)
9. [GET /api/signalements/{id}](#get-apisignalementsid)
10. [PUT /api/signalements/{id}](#put-apisignalementsid)
11. [DELETE /api/signalements/{id}](#delete-apisignalementsid)

## Affectations

12. [GET /api/affectations](#get-apiaffectations)
13. [POST /api/affectations](#post-apiaffectations)
14. [GET /api/affectations/{id}](#get-apiaffectationsid)
15. [DELETE /api/affectations/{id}](#delete-apiaffectationsid)

## Interventions

16. [GET /api/interventions](#get-apiinterventions)
17. [POST /api/interventions](#post-apiinterventions)
18. [GET /api/interventions/{id}](#get-apiinterventionsid)
19. [PUT /api/interventions/{id}](#put-apiinterventionsid)
20. [DELETE /api/interventions/{id}](#delete-apiinterventionsid)
21. [POST /api/interventions/{id}/cloturer](#post-apiinterventionsidcloturer)

## Équipes

22. [GET /api/equipes](#get-apiequipes)
23. [POST /api/equipes](#post-apiequipes)
24. [GET /api/equipes/{id}](#get-apiequipesid)
25. [PUT /api/equipes/{id}](#put-apiequipesid)
26. [DELETE /api/equipes/{id}](#delete-apiequipesid)

## Zones

27. [GET /api/zones](#get-apizones)
28. [POST /api/zones](#post-apizones)
29. [GET /api/zones/{id}](#get-apizonesid)
30. [PUT /api/zones/{id}](#put-apizonesid)
31. [DELETE /api/zones/{id}](#delete-apizonesid)

## Types de déchets

32. [GET /api/types-dechets](#get-apitypes-dechets)
33. [POST /api/types-dechets](#post-apitypes-dechets)
34. [GET /api/types-dechets/{id}](#get-apitypes-dechetsid)
35. [PUT /api/types-dechets/{id}](#put-apitypes-dechetsid)
36. [DELETE /api/types-dechets/{id}](#delete-apitypes-dechetsid)

## Utilisateurs (admin)

37. [GET /api/users](#get-apiusers)
38. [POST /api/users](#post-apiusers)
39. [GET /api/users/{id}](#get-apiusersid)
40. [PUT /api/users/{id}](#put-apiusersid)
41. [DELETE /api/users/{id}](#delete-apiusersid)

## Points de fidélité

42. [GET /api/historique-points](#get-apihistorique-points)
43. [GET /api/historique-points/{id}](#get-apihistorique-pointsid)

## Dashboard

44. [GET /api/dashboard/heatmap](#get-apidashboardheatmap)

---

# POST /api/auth/register

## Informations générales

* Nom : Inscription d'un citoyen
* URI : `/api/auth/register`
* Méthode : POST
* Description : Crée un compte citoyen et émet un token Sanctum.

## Authentification

Non requise.

## Autorisation

Public. Le rôle appliqué est toujours `citizen`.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| nom | string | Oui | required, string, max:100 | Nom de famille |
| prenom | string | Oui | required, string, max:100 | Prénom |
| email | string | Oui | required, string, email, max:150, unique:users,email | Email du compte |
| password | string | Oui | required, string, min:8, confirmed | Mot de passe |
| password_confirmation | string | Oui (si password) | — | Confirmation |

## Réponse — Succès

HTTP Status : 201

```json
{
  "user": {
    "id": 1,
    "nom": "Sow",
    "prenom": "Mamadou",
    "name": "Sow Mamadou",
    "email": "mamadou@gmail.com",
    "roles": ["citizen"],
    "role": "citizen",
    "created_at": "2026-08-06T10:00:00.000000Z",
    "updated_at": "2026-08-06T10:00:00.000000Z"
  },
  "token": "<plain-text-token>"
}
```

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 422 | Validation | email déjà utilisé, champs manquants | `errors` Laravel |
| 500 | — | Persistance | — |

## Règles métier

* BR-AUTH-001

## Services / Repositories / Resources / DTO

* AuthService, UserService / UserRepository / AuthResource, UserResource / RegisterDTO, CreateUserDTO

## Transactions

Oui (création utilisateur + token dans `DB::transaction`).

## Événements / Notifications

Aucun.

## Consommation Frontend

Écrans : Inscription (Citizen). Fonctionnalités : créer un compte, stocker le token.

## Dépendances

Aucune.

## Références

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/RegisterRequest.php` — Resource : `app/Http/Resources/AuthResource.php`, `UserResource.php` — Model : `app/Models/User.php` — Tests : `tests/Feature/AuthApiTest.php`

## Notes

L'exemple OpenAPI (`OpenApi.php`) mentionne `telephone` et `adresse` mais la Request ne les accepte pas : ces champs sont ignorés (voir ambiguïtés dans `api-analysis.md`).

## Statut

Vérifié

---

# POST /api/auth/login

## Informations générales

* Nom : Connexion
* URI : `/api/auth/login`
* Méthode : POST
* Description : Authentifie un utilisateur et émet un nouveau token.

## Authentification

Non requise.

## Autorisation

Public.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| email | string | Oui | required, string, email | Email du compte |
| password | string | Oui | required, string | Mot de passe |

## Réponse — Succès

HTTP Status : 200

```json
{
  "user": { "...": "UserResource (voir register)" },
  "token": "<plain-text-token>"
}
```

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 422 | Validation | champs manquants | `errors` Laravel |
| 401 | InvalidCredentialsException | email inconnu OU mot de passe incorrect | `Invalid credentials.` |

## Règles métier

* BR-AUTH-002

## Services / Repositories / Resources / DTO

* AuthService, UserService / UserRepository / AuthResource, UserResource / LoginDTO

## Transactions

Non.

## Événements / Notifications

Aucun.

## Consommation Frontend

Écrans : Connexion (tous profils). Fonctionnalités : se connecter, stocker le token.

## Dépendances

Aucune.

## Références

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/LoginRequest.php` — Exception : `app/Exceptions/Auth/InvalidCredentialsException.php` — Tests : `tests/Feature/AuthApiTest.php`

## Notes

Chaque connexion émet un nouveau token ; les tokens précédents restent valides.

## Statut

Vérifié

---

# POST /api/auth/forgot-password

## Informations générales

* Nom : Mot de passe oublié
* URI : `/api/auth/forgot-password`
* Méthode : POST
* Description : Envoie un lien de réinitialisation par email.

## Authentification

Non requise.

## Autorisation

Public.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| email | string | Oui | required, string, email | Email du compte |

## Réponse — Succès

HTTP Status : 200

```json
{
  "message": "If the email exists, a reset link has been sent."
}
```

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 422 | Validation | email malformé | `errors` Laravel |

## Règles métier

* BR-AUTH-004

## Services / Repositories / Resources / DTO

* AuthService / — / — / ForgotPasswordDTO

## Transactions

Non.

## Événements / Notifications

Notification `ResetPassword` de Laravel (URL personnalisée vers `frontend_url`).

## Consommation Frontend

Écrans : Mot de passe oublié.

## Dépendances

Aucune.

## Références

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/ForgotPasswordRequest.php` — Provider : `app/Providers/AppServiceProvider.php`

## Notes

Réponse identique que l'email existe ou non (pas d'énumération de comptes).

## Statut

Vérifié

---

# POST /api/auth/reset-password

## Informations générales

* Nom : Réinitialisation du mot de passe
* URI : `/api/auth/reset-password`
* Méthode : POST
* Description : Réinitialise le mot de passe à partir du token reçu par email.

## Authentification

Non requise.

## Autorisation

Public.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| token | string | Oui | required, string | Token reçu dans le lien |
| email | string | Oui | required, string, email | Email du compte |
| password | string | Oui | required, string, min:8, confirmed | Nouveau mot de passe |
| password_confirmation | string | Oui (si password) | — | Confirmation |

## Réponse — Succès

HTTP Status : 200

```json
{
  "message": "Password reset successfully."
}
```

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 422 | Validation | champs invalides | `errors` Laravel |
| 500 | PasswordException (broker) | token invalide/expiré (non géré par le contrôleur) | — |

## Règles métier

* BR-AUTH-005

## Services / Repositories / Resources / DTO

* AuthService / — / — / ResetPasswordDTO

## Transactions

Non (sauvegarde du mot de passe hors transaction explicite).

## Événements / Notifications

Aucun.

## Consommation Frontend

Écrans : Réinitialisation du mot de passe (lien reçu par email → URL `frontend_url/reset-password?token=...&email=...`).

## Dépendances

* POST /api/auth/forgot-password (émission du lien).

## Références

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Request : `app/Http/Requests/Auth/ResetPasswordRequest.php`

## Notes

Cas d'échec du broker non maîtrisé (voir BR-AUTH-005) — à confirmer par test.

## Statut

À revoir (cas d'échec du broker)

---

# POST /api/auth/logout

## Informations générales

* Nom : Déconnexion
* URI : `/api/auth/logout`
* Méthode : POST
* Description : Révoque le token courant.

## Authentification

Requise (Bearer token).

## Autorisation

Tous rôles authentifiés.

## Paramètres

Aucun.

## Réponse — Succès

HTTP Status : 204 (No Content).

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | token absent/invalide | `Unauthenticated.` |

## Règles métier

* BR-AUTH-003

## Services / Repositories / Resources / DTO

* AuthService / — / — / —

## Transactions

Non.

## Consommation Frontend

Écrans : Déconnexion (tous profils). Fonctionnalités : purger le token local après 204.

## Dépendances

Aucune.

## Références

Controller : `app/Http/Controllers/Api/AuthController.php` — Service : `app/Services/AuthService.php` — Tests : `tests/Feature/AuthApiTest.php`

## Statut

Vérifié

---

# GET /api/user

## Informations générales

* Nom : Utilisateur courant
* URI : `/api/user`
* Méthode : GET
* Description : Retourne l'utilisateur authentifié.

## Authentification

Requise.

## Autorisation

Tous rôles authentifiés.

## Paramètres

Aucun.

## Réponse — Succès

HTTP Status : 200

```json
{
  "id": 1,
  "nom": "Sow",
  "prenom": "Mamadou",
  "name": "Sow Mamadou",
  "email": "mamadou@gmail.com",
  "roles": ["citizen"],
  "role": "citizen",
  "created_at": "...",
  "updated_at": "..."
}
```

`name` = `"prenom nom"` (accesseur du modèle). `role` = premier rôle (défaut `citizen`).

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | token absent/invalide | `Unauthenticated.` |

## Règles métier

Aucune.

## Services / Repositories / Resources / DTO

* — / — / UserResource / —

## Consommation Frontend

Écrans : Toutes pages connectées (profil, gardes de route). Fonctionnalités : vérifier la session et le rôle.

## Références

Route : `routes/api.php` (closure) — Resource : `app/Http/Resources/UserResource.php` — Model : `app/Models/User.php`

## Statut

Vérifié

---

# GET /api/signalements

## Informations générales

* Nom : Liste des signalements
* URI : `/api/signalements`
* Méthode : GET
* Description : Liste paginée des signalements (filtrée pour les citoyens).

## Authentification

Requise.

## Autorisation

Citizen : ses signalements uniquement. Agent / Admin : tous.

## Query Parameters

Aucun (pagination fixe de 15, pas de paramètre `page` custom : `page` est géré par Laravel via la paginator).

## Réponse — Succès

HTTP Status : 200

```json
{
  "data": [ { "id": 1, "description": "...", "latitude": 14.693, "longitude": -17.444, "statut": "en_attente_validation", "priorite": "normale", "created_at": "...", "updated_at": "...", "user": null, "zone": null, "type_dechets": null, "photos": null } ],
  "links": { "first": "...", "last": "...", "prev": null, "next": null },
  "meta": { "current_page": 1, "from": 1, "last_page": 1, "links": [], "path": "/api/signalements", "per_page": 15, "to": 15, "total": 15 }
}
```

En liste, les relations ne sont pas chargées : `user`, `zone`, `type_dechets`, `photos` sont `null`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |

## Règles métier

* BR-SIG-005

## Services / Repositories / Resources / DTO

* SignalementService / SignalementRepository / SignalementResource / —

## Consommation Frontend

Écrans : Mes signalements (Citizen), Liste des signalements (Agent/Admin).

## Références

Controller : `app/Http/Controllers/Api/SignalementController.php` — Tests : `tests/Feature/SignalementApiTest.php`

## Statut

Vérifié

---

# POST /api/signalements

## Informations générales

* Nom : Création d'un signalement
* URI : `/api/signalements`
* Méthode : POST
* Description : Crée un signalement géolocalisé (statut par défaut `en_attente_validation`).

## Authentification

Requise.

## Autorisation

Tous rôles authentifiés.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| description | string | Non | nullable, string | Description libre |
| latitude | number | Oui | required, numeric, between:-90,90 | Latitude |
| longitude | number | Oui | required, numeric, between:-180,180 | Longitude |
| zone_id | integer | Non | nullable, integer, exists:zones,id | Zone associée |
| statut | string | Non | sometimes, enum SignalementStatutEnum | Statut initial (défaut `en_attente_validation`) |
| priorite | string | Non | sometimes, enum SignalementPrioriteEnum | Priorité (défaut `normale`) |
| type_dechets | array | Non | nullable, array | Déchets détectés |
| type_dechets.*.type_dechet_id | integer | Oui (dans type_dechets) | required, integer, exists:types_dechets,id | Type de déchet |
| type_dechets.*.quantite_estime | number | Non | nullable, numeric, min:0 | Quantité estimée |
| type_dechets.*.volume_estime | number | Non | nullable, numeric, min:0 | Volume estimé |
| type_dechets.*.dangerosite | string | Non | nullable, enum DangerositeEnum | Dangerosité (faible/modere/eleve/extreme) |
| type_dechets.*.remarque | string | Non | nullable, string | Remarque |
| photos | array | Non | nullable, array | URLs de photos |
| photos.* | string | Non | url | URL valide |

## Réponse — Succès

HTTP Status : 201

```json
{
  "data": {
    "id": 1,
    "description": "...",
    "latitude": 14.693,
    "longitude": -17.444,
    "statut": "en_attente_validation",
    "priorite": "normale",
    "user": { "id": 1, "name": "Sow Mamadou", "role": "citizen" },
    "zone": null,
    "type_dechets": [ { "id": 1, "libelle": "Plastique", "pivot": { "quantite_estime": 2, "volume_estime": 5, "dangerosite": "modere", "remarque": null } } ],
    "photos": [ { "id": 1, "url": "https://...", "description": null } ],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 422 | Validation | lat/lng hors plage, type_dechet inexistant, photo invalide | `errors` Laravel |

## Règles métier

* BR-SIG-001

## Services / Repositories / Resources / DTO

* SignalementService / SignalementRepository / SignalementResource / CreateSignalementDTO

## Transactions

Oui.

## Consommation Frontend

Écrans : Création d'un signalement (Citizen). Fonctionnalités : géolocalisation, sélection de déchets, upload de photos (URLs).

## Dépendances

* GET /api/types-dechets (sélecteur), GET /api/zones (zone optionnelle).

## Références

Controller : `app/Http/Controllers/Api/SignalementController.php` — Service : `app/Services/SignalementService.php` — Request : `app/Http/Requests/Signalement/StoreSignalementRequest.php` — DTO : `app/DTOs/Signalement/CreateSignalementDTO.php` — Tests : `tests/Feature/SignalementApiTest.php`

## Notes

Les photos sont des URLs : l'upload du fichier doit être géré par le frontend (service tiers ou stockage propre), l'API n'accepte que des URLs.

## Statut

Vérifié

---

# GET /api/signalements/{id}

## Informations générales

* Nom : Détail d'un signalement
* URI : `/api/signalements/{id}`
* Méthode : GET
* Description : Détail complet d'un signalement (relations chargées).

## Authentification

Requise.

## Autorisation

Admin / Agent : tous. Citizen : uniquement ses propres signalements.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID du signalement |

## Réponse — Succès

HTTP Status : 200 — même structure que la création (relations `user`, `zone`, `type_dechets`, `photos` chargées).

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | citoyen non propriétaire | `This action is unauthorized.` |
| 404 | — | inexistant | — |

## Règles métier

* BR-SIG-008

## Services / Repositories / Resources / DTO

* — (binding de route) / — / SignalementResource / —

## Consommation Frontend

Écrans : Détail du signalement (tous profils), carte de suivi.

## Références

Controller : `app/Http/Controllers/Api/SignalementController.php` — Policy : `app/Policies/SignalementPolicy.php` (`view`)

## Statut

Vérifié

---

# PUT /api/signalements/{id}

## Informations générales

* Nom : Mise à jour d'un signalement
* URI : `/api/signalements/{id}`
* Méthode : PUT
* Description : Modifie description, statut, priorité, zone. La géolocalisation n'est pas modifiable.

## Authentification

Requise.

## Autorisation

Admin : toujours. Citizen : uniquement ses signalements `brouillon` ou `en_attente_validation`.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID du signalement |

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| description | string | Non | sometimes, nullable, string | Description |
| statut | string | Non | sometimes, enum SignalementStatutEnum | Statut (soumis à la machine à états) |
| priorite | string | Non | sometimes, enum SignalementPrioriteEnum | Priorité |
| zone_id | integer | Non | sometimes, nullable, integer, exists:zones,id | Zone (null autorisé) |

## Réponse — Succès

HTTP Status : 200 — SignalementResource avec relations chargées.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non propriétaire ou statut avancé | `This action is unauthorized.` |
| 404 | — | inexistant | — |
| 422 | InvalidTransitionException | transition non autorisée | Message de transition |
| 422 | Validation | enum invalide | `errors` Laravel |

## Règles métier

* BR-SIG-002, BR-SIG-003, BR-SIG-006

## Services / Repositories / Resources / DTO

* SignalementService / SignalementRepository / SignalementResource / UpdateSignalementDTO

## Transactions

Oui.

## Consommation Frontend

Écrans : Modification d'un signalement (Citizen), validation/priorisation (Admin).

## Références

Controller : `app/Http/Controllers/Api/SignalementController.php` — Service : `app/Services/SignalementService.php` — Request : `app/Http/Requests/Signalement/UpdateSignalementRequest.php` — Policy : `app/Policies/SignalementPolicy.php`

## Statut

Vérifié

---

# DELETE /api/signalements/{id}

## Informations générales

* Nom : Suppression d'un signalement
* URI : `/api/signalements/{id}`
* Méthode : DELETE
* Description : Supprime un signalement (brouillon pour le citoyen, tout pour l'admin).

## Authentification

Requise.

## Autorisation

Admin : toujours. Citizen : uniquement ses signalements `brouillon`.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID du signalement |

## Réponse — Succès

HTTP Status : 204.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non propriétaire ou statut ≠ brouillon | `This action is unauthorized.` |
| 404 | — | inexistant | — |

## Règles métier

* BR-SIG-007

## Services / Repositories / Resources / DTO

* SignalementService / SignalementRepository / — / —

## Consommation Frontend

Écrans : Mes signalements (Citizen).

## Références

Controller : `app/Http/Controllers/Api/SignalementController.php` — Policy : `app/Policies/SignalementPolicy.php`

## Statut

Vérifié

---

# GET /api/affectations

## Informations générales

* Nom : Liste des affectations
* URI : `/api/affectations`
* Méthode : GET
* Description : Liste paginée des affectations.

## Authentification

Requise.

## Autorisation

Admin / Agent uniquement (policy `viewAny`).

## Réponse — Succès

HTTP Status : 200 — structure paginée de `AffectationResource` (relations non chargées en liste).

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | citoyen | `This action is unauthorized.` |

## Règles métier

Aucune (voir BR-AFF-001 pour la création).

## Services / Repositories / Resources / DTO

* AffectationService / AffectationRepository / AffectationResource / —

## Consommation Frontend

Écrans : Suivi des affectations (Admin, Agent).

## Références

Controller : `app/Http/Controllers/Api/AffectationController.php` — Tests : `tests/Feature/AffectationApiTest.php`

## Statut

Vérifié

---

# POST /api/affectations

## Informations générales

* Nom : Création d'une affectation
* URI : `/api/affectations`
* Méthode : POST
* Description : Affecte un signalement (`valide`/`priorise`) à une équipe ; le signalement passe à `affecte`.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| date_heure_affectation | string | Oui | required, date_format:Y-m-d H:i:s | Date/heure |
| equipe_id | integer | Oui | required, integer, exists:equipes,id | Équipe |
| signalement_id | integer | Oui | required, integer, exists:signalements,id | Signalement |
| observation | string | Non | nullable, string | Observation |

## Réponse — Succès

HTTP Status : 201 — `AffectationResource` (relations `equipe`, `signalement` chargées).

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 422 | SignalementNotValidatedException | signalement non `valide`/`priorise` | Message de l'exception |
| 422 | Validation | champs invalides | `errors` Laravel |

## Règles métier

* BR-SIG-002, BR-SIG-004, BR-AFF-001

## Services / Repositories / Resources / DTO

* AffectationService / AffectationRepository / AffectationResource / CreateAffectationDTO

## Transactions

Oui.

## Consommation Frontend

Écrans : Affectation d'un signalement (Admin) — sélecteur équipe + signalement.

## Dépendances

* GET /api/signalements (cible), GET /api/equipes (choix d'équipe).

## Références

Controller : `app/Http/Controllers/Api/AffectationController.php` — Service : `app/Services/AffectationService.php` — Request : `app/Http/Requests/Affectation/StoreAffectationRequest.php` — Tests : `tests/Feature/AffectationApiTest.php`

## Statut

Vérifié

---

# GET /api/affectations/{id}

## Informations générales

* Nom : Détail d'une affectation
* URI : `/api/affectations/{id}`
* Méthode : GET
* Description : Détail d'une affectation (relations chargées).

## Authentification

Requise.

## Autorisation

Admin / Agent.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'affectation |

## Réponse — Succès

HTTP Status : 200 — `AffectationResource` avec `equipe` et `signalement`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | citoyen | `This action is unauthorized.` |
| 404 | inexistant | — |

## Règles métier

Aucune.

## Références

Controller : `app/Http/Controllers/Api/AffectationController.php` — Policy : `app/Policies/AffectationPolicy.php`

## Statut

Vérifié

---

# DELETE /api/affectations/{id}

## Informations générales

* Nom : Suppression d'une affectation
* URI : `/api/affectations/{id}`
* Méthode : DELETE
* Description : Annule une affectation (le statut du signalement reste `affecte`).

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'affectation |

## Réponse — Succès

HTTP Status : 204.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |

## Règles métier

* BR-AFF-002

## Services / Repositories / Resources / DTO

* AffectationService / AffectationRepository / — / —

## Consommation Frontend

Écrans : Gestion des affectations (Admin).

## Références

Controller : `app/Http/Controllers/Api/AffectationController.php` — Policy : `app/Policies/AffectationPolicy.php` — Tests : `tests/Feature/AffectationApiTest.php`

## Notes

Le statut du signalement n'est pas réinitialisé (ambiguïté documentée dans `api-analysis.md`).

## Statut

Vérifié

---

# GET /api/interventions

## Informations générales

* Nom : Liste des interventions
* URI : `/api/interventions`
* Méthode : GET
* Description : Liste paginée des interventions.

## Authentification

Requise.

## Autorisation

Admin / Agent (policy `viewAny`).

## Réponse — Succès

HTTP Status : 200 — structure paginée de `InterventionResource` (relations non chargées en liste).

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | citoyen | `This action is unauthorized.` |

## Règles métier

Aucune.

## Services / Repositories / Resources / DTO

* InterventionService / InterventionRepository / InterventionResource / —

## Consommation Frontend

Écrans : Suivi des interventions (Agent, Admin).

## Références

Controller : `app/Http/Controllers/Api/InterventionController.php` — Tests : `tests/Feature/InterventionApiTest.php`

## Statut

Vérifié

---

# POST /api/interventions

## Informations générales

* Nom : Création d'une intervention
* URI : `/api/interventions`
* Méthode : POST
* Description : Démarre une intervention sur un signalement `affecte` (qui passe à `en_intervention`).

## Authentification

Requise.

## Autorisation

Admin / Agent.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| date_heure_debut | string | Oui | required, date_format:Y-m-d H:i:s | Début d'intervention |
| affectation_id | integer | Oui | required, integer, exists:affectations,id | Affectation liée |
| statut | string | Non | sometimes, enum InterventionStatutEnum | Statut (défaut `en_cours`) |
| observation | string | Non | nullable, string | Observation |

## Réponse — Succès

HTTP Status : 201 — `InterventionResource` (relations `affectation`, `photos` chargées).

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | citoyen | `This action is unauthorized.` |
| 422 | InvalidTransitionException | signalement de l'affectation non `affecte` | Message de transition |
| 422 | Validation | champs invalides | `errors` Laravel |

## Règles métier

* BR-INT-001

## Services / Repositories / Resources / DTO

* InterventionService / InterventionRepository / InterventionResource / CreateInterventionDTO

## Transactions

Oui (création + transition signalement).

## Consommation Frontend

Écrans : Création d'intervention (Agent, Admin).

## Dépendances

* GET /api/affectations (choix de l'affectation).

## Références

Controller : `app/Http/Controllers/Api/InterventionController.php` — Service : `app/Services/InterventionService.php` — Request : `app/Http/Requests/Intervention/StoreInterventionRequest.php` — Tests : `tests/Feature/InterventionApiTest.php`

## Notes

Aucune vérification d'unicité : plusieurs interventions peuvent exister pour la même affectation.

## Statut

Vérifié

---

# GET /api/interventions/{id}

## Informations générales

* Nom : Détail d'une intervention
* URI : `/api/interventions/{id}`
* Méthode : GET
* Description : Détail d'une intervention (relations chargées).

## Authentification

Requise.

## Autorisation

Admin / Agent.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'intervention |

## Réponse — Succès

HTTP Status : 200 — `InterventionResource` avec `affectation` et `photos`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | citoyen | `This action is unauthorized.` |
| 404 | inexistant | — |

## Règles métier

Aucune.

## Références

Controller : `app/Http/Controllers/Api/InterventionController.php` — Policy : `app/Policies/InterventionPolicy.php`

## Statut

Vérifié

---

# PUT /api/interventions/{id}

## Informations générales

* Nom : Mise à jour d'une intervention
* URI : `/api/interventions/{id}`
* Méthode : PUT
* Description : Modifie le statut, le compte rendu, les observations et ajoute des photos ; `terminee` fait passer le signalement à `termine`.

## Authentification

Requise.

## Autorisation

Admin / Agent.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'intervention |

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| date_heure_fin | string | Non | sometimes, nullable, date_format:Y-m-d H:i:s | Fin d'intervention |
| statut | string | Non | sometimes, enum InterventionStatutEnum | Statut (`en_cours`, `terminee`, `suspendue`) |
| compte_rendu | string | Non | sometimes, nullable, string | Compte rendu |
| observation | string | Non | sometimes, nullable, string | Observation |
| photos | array | Non | sometimes, nullable, array | URLs de photos à ajouter |
| photos.* | string | Non | url | URL valide |

## Réponse — Succès

HTTP Status : 200 — `InterventionResource` avec `photos`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | citoyen | `This action is unauthorized.` |
| 404 | — | inexistant | — |
| 422 | InvalidTransitionException | signalement non `en_intervention` | Message de transition |
| 422 | Validation | champs invalides | `errors` Laravel |

## Règles métier

* BR-INT-002

## Services / Repositories / Resources / DTO

* InterventionService / InterventionRepository / InterventionResource / UpdateInterventionDTO

## Transactions

Oui.

## Consommation Frontend

Écrans : Suivi d'intervention (Agent) — compte rendu, photos, terminaison.

## Références

Controller : `app/Http/Controllers/Api/InterventionController.php` — Service : `app/Services/InterventionService.php` — Request : `app/Http/Requests/Intervention/UpdateInterventionRequest.php`

## Notes

`date_heure_debut` et `affectation_id` ne sont pas modifiables.

## Statut

Vérifié

---

# DELETE /api/interventions/{id}

## Informations générales

* Nom : Suppression d'une intervention
* URI : `/api/interventions/{id}`
* Méthode : DELETE
* Description : Supprime une intervention (le statut du signalement n'est pas modifié).

## Authentification

Requise.

## Autorisation

Admin uniquement (policy `delete`).

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'intervention |

## Réponse — Succès

HTTP Status : 204.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |

## Règles métier

Aucune.

## Services / Repositories / Resources / DTO

* InterventionService / InterventionRepository / — / —

## Consommation Frontend

Écrans : Gestion des interventions (Admin).

## Références

Controller : `app/Http/Controllers/Api/InterventionController.php` — Policy : `app/Policies/InterventionPolicy.php`

## Statut

Vérifié

---

# POST /api/interventions/{id}/cloturer

## Informations générales

* Nom : Clôture d'une intervention
* URI : `/api/interventions/{id}/cloturer`
* Méthode : POST
* Description : Clôt le signalement et attribue 100 points à son propriétaire.

## Authentification

Requise.

## Autorisation

Admin / Agent (policy `update`).

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'intervention |

## Réponse — Succès

HTTP Status : 200 — `InterventionResource` (relations `affectation`, `photos` chargées).

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | citoyen | `This action is unauthorized.` |
| 404 | — | inexistant | — |
| 422 | InvalidTransitionException | signalement non `termine` (clôture = transition `termine → cloture`) | Message de transition |

## Règles métier

* BR-INT-003, BR-PTS-001

## Services / Repositories / Resources / DTO

* InterventionService / InterventionRepository / InterventionResource / —

## Transactions

Oui (transition signalement + attribution de points).

## Consommation Frontend

Écrans : Clôture d'intervention (Agent, Admin).

## Dépendances

* PUT /api/interventions/{id} (doit être `terminee` avant).

## Références

Controller : `app/Http/Controllers/Api/InterventionController.php` — Service : `app/Services/InterventionService.php` — Tests : `tests/Feature/InterventionApiTest.php`

## Statut

Vérifié

---

# GET /api/equipes

## Informations générales

* Nom : Liste des équipes
* URI : `/api/equipes`
* Méthode : GET
* Description : Liste paginée des équipes.

## Authentification

Requise.

## Autorisation

Admin / Agent (lecture). Citoyen interdit.

## Réponse — Succès

HTTP Status : 200 — structure paginée de `EquipeResource`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | citoyen | `This action is unauthorized.` |

## Règles métier

* BR-EQP-003

## Services / Repositories / Resources / DTO

* EquipeService / EquipeRepository / EquipeResource / —

## Consommation Frontend

Écrans : Liste des équipes (Agent, Admin).

## Références

Controller : `app/Http/Controllers/Api/EquipeController.php` — Tests : `tests/Feature/EquipeApiTest.php`

## Statut

Vérifié

---

# POST /api/equipes

## Informations générales

* Nom : Création d'une équipe
* URI : `/api/equipes`
* Méthode : POST
* Description : Crée une équipe et rattache ses agents (date_debut = aujourd'hui, fonction = `Agent de collecte`).

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| nom_equipe | string | Oui | required, string, max:100 | Nom de l'équipe |
| description | string | Non | nullable, string | Description |
| agent_ids | array | Non | nullable, array | IDs des agents |
| agent_ids.* | integer | Oui (dans agent_ids) | integer, exists:users,id | Agent |

## Réponse — Succès

HTTP Status : 201 — `EquipeResource` avec `agents`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 422 | Validation | nom manquant, agent inexistant | `errors` Laravel |

## Règles métier

* BR-EQP-001

## Services / Repositories / Resources / DTO

* EquipeService / EquipeRepository / EquipeResource / CreateEquipeDTO

## Transactions

Oui.

## Consommation Frontend

Écrans : Création d'équipe (Admin).

## Dépendances

* GET /api/users (sélection d'agents).

## Références

Controller : `app/Http/Controllers/Api/EquipeController.php` — Service : `app/Services/EquipeService.php` — Request : `app/Http/Requests/Equipe/StoreEquipeRequest.php`

## Statut

Vérifié

---

# GET /api/equipes/{id}

## Informations générales

* Nom : Détail d'une équipe
* URI : `/api/equipes/{id}`
* Méthode : GET
* Description : Détail d'une équipe (agents et zones chargés).

## Authentification

Requise.

## Autorisation

Admin / Agent.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'équipe |

## Réponse — Succès

HTTP Status : 200 — `EquipeResource` avec `agents` et `zones`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | citoyen | `This action is unauthorized.` |
| 404 | inexistant | — |

## Règles métier

* BR-EQP-003

## Références

Controller : `app/Http/Controllers/Api/EquipeController.php`

## Statut

Vérifié

---

# PUT /api/equipes/{id}

## Informations générales

* Nom : Mise à jour d'une équipe
* URI : `/api/equipes/{id}`
* Méthode : PUT
* Description : Modifie l'équipe et synchronise sa composition d'agents.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'équipe |

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| nom_equipe | string | Non | sometimes, string, max:100 | Nom de l'équipe |
| description | string | Non | nullable, string | Description |
| agent_ids | array | Non | nullable, array | Liste complète des agents (remplacement) |
| agent_ids.* | integer | Oui (dans agent_ids) | integer, exists:users,id | Agent |

## Réponse — Succès

HTTP Status : 200 — `EquipeResource` avec `agents`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |
| 422 | Validation | champs invalides | `errors` Laravel |

## Règles métier

* BR-EQP-002

## Services / Repositories / Resources / DTO

* EquipeService / EquipeRepository / EquipeResource / UpdateEquipeDTO

## Transactions

Oui.

## Consommation Frontend

Écrans : Gestion d'équipe (Admin).

## Références

Controller : `app/Http/Controllers/Api/EquipeController.php` — Service : `app/Services/EquipeService.php` — Request : `app/Http/Requests/Equipe/UpdateEquipeRequest.php`

## Notes

Le `sync` réinitialise `date_debut` pour tous les membres (voir BR-EQP-002).

## Statut

Vérifié

---

# DELETE /api/equipes/{id}

## Informations générales

* Nom : Suppression d'une équipe
* URI : `/api/equipes/{id}`
* Méthode : DELETE
* Description : Supprime une équipe.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'équipe |

## Réponse — Succès

HTTP Status : 204.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |

## Règles métier

* BR-EQP-003

## Références

Controller : `app/Http/Controllers/Api/EquipeController.php` — Policy : `app/Policies/EquipePolicy.php`

## Statut

Vérifié

---

# GET /api/zones

## Informations générales

* Nom : Liste des zones
* URI : `/api/zones`
* Méthode : GET
* Description : Liste paginée des zones.

## Authentification

Requise.

## Autorisation

Tous rôles authentifiés (lecture).

## Réponse — Succès

HTTP Status : 200 — structure paginée de `ZoneResource`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |

## Règles métier

* BR-REF-001

## Services / Repositories / Resources / DTO

* ZoneService / ZoneRepository / ZoneResource / —

## Consommation Frontend

Écrans : Formulaire de signalement (choix de zone), carte.

## Références

Controller : `app/Http/Controllers/Api/ZoneController.php` — Tests : `tests/Feature/ZoneApiTest.php`

## Statut

Vérifié

---

# POST /api/zones

## Informations générales

* Nom : Création d'une zone
* URI : `/api/zones`
* Méthode : POST
* Description : Crée une zone de référence.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| nom_zone | string | Oui | required, string, max:100 | Nom de la zone |
| description | string | Non | nullable, string | Description |

## Réponse — Succès

HTTP Status : 201 — `ZoneResource`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 422 | Validation | nom manquant | `errors` Laravel |

## Règles métier

* BR-REF-001

## Services / Repositories / Resources / DTO

* ZoneService / ZoneRepository / ZoneResource / CreateZoneDTO

## Consommation Frontend

Écrans : Gestion des zones (Admin).

## Références

Controller : `app/Http/Controllers/Api/ZoneController.php` — Policy : `app/Policies/ZonePolicy.php`

## Statut

Vérifié

---

# GET /api/zones/{id}

## Informations générales

* Nom : Détail d'une zone
* URI : `/api/zones/{id}`
* Méthode : GET
* Description : Détail d'une zone.

## Authentification

Requise.

## Autorisation

Tous rôles authentifiés.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de la zone |

## Réponse — Succès

HTTP Status : 200 — `ZoneResource`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 404 | inexistant | — |

## Règles métier

* BR-REF-001

## Références

Controller : `app/Http/Controllers/Api/ZoneController.php`

## Statut

Vérifié

---

# PUT /api/zones/{id}

## Informations générales

* Nom : Mise à jour d'une zone
* URI : `/api/zones/{id}`
* Méthode : PUT
* Description : Modifie une zone.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de la zone |

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| nom_zone | string | Non | sometimes, string, max:100 | Nom de la zone |
| description | string | Non | nullable, string | Description |

## Réponse — Succès

HTTP Status : 200 — `ZoneResource`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |
| 422 | Validation | champs invalides | `errors` Laravel |

## Règles métier

* BR-REF-001

## Références

Controller : `app/Http/Controllers/Api/ZoneController.php` — Policy : `app/Policies/ZonePolicy.php`

## Statut

Vérifié

---

# DELETE /api/zones/{id}

## Informations générales

* Nom : Suppression d'une zone
* URI : `/api/zones/{id}`
* Méthode : DELETE
* Description : Supprime une zone.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de la zone |

## Réponse — Succès

HTTP Status : 204.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |

## Règles métier

* BR-REF-001

## Références

Controller : `app/Http/Controllers/Api/ZoneController.php` — Policy : `app/Policies/ZonePolicy.php`

## Statut

Vérifié

---

# GET /api/types-dechets

## Informations générales

* Nom : Liste des types de déchets
* URI : `/api/types-dechets`
* Méthode : GET
* Description : Liste paginée des types de déchets.

## Authentification

Requise.

## Autorisation

Tous rôles authentifiés (lecture).

## Réponse — Succès

HTTP Status : 200 — structure paginée de `TypeDechetResource`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |

## Règles métier

* BR-REF-001

## Services / Repositories / Resources / DTO

* TypeDechetService / TypeDechetRepository / TypeDechetResource / —

## Consommation Frontend

Écrans : Formulaire de signalement (choix des déchets).

## Références

Controller : `app/Http/Controllers/Api/TypeDechetController.php` — Tests : `tests/Feature/TypeDechetApiTest.php`

## Statut

Vérifié

---

# POST /api/types-dechets

## Informations générales

* Nom : Création d'un type de déchet
* URI : `/api/types-dechets`
* Méthode : POST
* Description : Crée un type de déchet de référence.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| libelle | string | Oui | required, string, max:100 | Libellé |
| description | string | Non | nullable, string | Description |

## Réponse — Succès

HTTP Status : 201 — `TypeDechetResource`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 422 | Validation | libelle manquant | `errors` Laravel |

## Règles métier

* BR-REF-001

## Services / Repositories / Resources / DTO

* TypeDechetService / TypeDechetRepository / TypeDechetResource / CreateTypeDechetDTO

## Consommation Frontend

Écrans : Gestion des référentiels (Admin).

## Références

Controller : `app/Http/Controllers/Api/TypeDechetController.php` — Policy : `app/Policies/TypeDechetPolicy.php`

## Statut

Vérifié

---

# GET /api/types-dechets/{id}

## Informations générales

* Nom : Détail d'un type de déchet
* URI : `/api/types-dechets/{id}`
* Méthode : GET
* Description : Détail d'un type de déchet.

## Authentification

Requise.

## Autorisation

Tous rôles authentifiés.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID du type de déchet |

## Réponse — Succès

HTTP Status : 200 — `TypeDechetResource`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 404 | inexistant | — |

## Règles métier

* BR-REF-001

## Références

Controller : `app/Http/Controllers/Api/TypeDechetController.php`

## Statut

Vérifié

---

# PUT /api/types-dechets/{id}

## Informations générales

* Nom : Mise à jour d'un type de déchet
* URI : `/api/types-dechets/{id}`
* Méthode : PUT
* Description : Modifie un type de déchet.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID du type de déchet |

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| libelle | string | Non | sometimes, string, max:100 | Libellé |
| description | string | Non | nullable, string | Description |

## Réponse — Succès

HTTP Status : 200 — `TypeDechetResource`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | Policy | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |
| 422 | Validation | champs invalides | `errors` Laravel |

## Règles métier

* BR-REF-001

## Références

Controller : `app/Http/Controllers/Api/TypeDechetController.php` — Policy : `app/Policies/TypeDechetPolicy.php`

## Statut

Vérifié

---

# DELETE /api/types-dechets/{id}

## Informations générales

* Nom : Suppression d'un type de déchet
* URI : `/api/types-dechets/{id}`
* Méthode : DELETE
* Description : Supprime un type de déchet.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID du type de déchet |

## Réponse — Succès

HTTP Status : 204.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | non admin | `This action is unauthorized.` |
| 404 | inexistant | — |

## Règles métier

* BR-REF-001

## Références

Controller : `app/Http/Controllers/Api/TypeDechetController.php` — Policy : `app/Policies/TypeDechetPolicy.php`

## Statut

Vérifié

---

# GET /api/users

## Informations générales

* Nom : Liste des utilisateurs
* URI : `/api/users`
* Méthode : GET
* Description : Liste paginée des utilisateurs (admin uniquement).

## Authentification

Requise.

## Autorisation

Admin uniquement (middleware `role:admin` + policy `viewAny`).

## Réponse — Succès

HTTP Status : 200 — structure paginée de `UserResource` (avec `roles`).

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | non admin | `This action is unauthorized.` |

## Règles métier

* BR-USR-001

## Services / Repositories / Resources / DTO

* UserService / UserRepository / UserResource / —

## Consommation Frontend

Écrans : Gestion des utilisateurs (Admin).

## Références

Controller : `app/Http/Controllers/Api/UserController.php` — Tests : `tests/Feature/UserApiTest.php`, `tests/Feature/UserAuthorizationTest.php`

## Statut

Vérifié

---

# POST /api/users

## Informations générales

* Nom : Création d'un utilisateur
* URI : `/api/users`
* Méthode : POST
* Description : Crée un utilisateur avec un rôle (admin, agent, citizen).

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| nom | string | Oui | required, string, max:100 | Nom |
| prenom | string | Oui | required, string, max:100 | Prénom |
| email | string | Oui | required, string, email, max:150, unique:users,email | Email |
| password | string | Oui | required, string, min:8, confirmed | Mot de passe |
| password_confirmation | string | Oui (si password) | — | Confirmation |
| telephone | string | Non | nullable, string, max:50 | Téléphone |
| adresse | string | Non | nullable, string, max:255 | Adresse |
| role | string | Non | sometimes, enum RoleEnum | Rôle (défaut `citizen`) |

## Réponse — Succès

HTTP Status : 201 — `UserResource` avec `roles`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | — | non admin | `This action is unauthorized.` |
| 422 | Validation | email pris, rôle invalide | `errors` Laravel |

## Règles métier

* BR-USR-001

## Services / Repositories / Resources / DTO

* UserService / UserRepository / UserResource / CreateUserDTO

## Consommation Frontend

Écrans : Création d'utilisateur (Admin).

## Références

Controller : `app/Http/Controllers/Api/UserController.php` — Request : `app/Http/Requests/User/StoreUserRequest.php`

## Statut

Vérifié

---

# GET /api/users/{id}

## Informations générales

* Nom : Détail d'un utilisateur
* URI : `/api/users/{id}`
* Méthode : GET
* Description : Détail d'un utilisateur (admin ou soi-même).

## Authentification

Requise.

## Autorisation

Admin, ou l'utilisateur lui-même.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'utilisateur |

## Réponse — Succès

HTTP Status : 200 — `UserResource` avec `roles`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | utilisateur ≠ soi-même, non admin | `This action is unauthorized.` |
| 404 | inexistant | — |

## Règles métier

* BR-USR-001, BR-USR-002

## Références

Controller : `app/Http/Controllers/Api/UserController.php` — Policy : `app/Policies/UserPolicy.php`

## Statut

Vérifié

---

# PUT /api/users/{id}

## Informations générales

* Nom : Mise à jour d'un utilisateur
* URI : `/api/users/{id}`
* Méthode : PUT
* Description : Modifie un utilisateur (profil personnel ou admin).

## Authentification

Requise.

## Autorisation

Admin, ou l'utilisateur lui-même (le rôle n'est modifiable que par l'admin).

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'utilisateur |

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |
| nom | string | Non | sometimes, string, max:100 | Nom |
| prenom | string | Non | sometimes, string, max:100 | Prénom |
| email | string | Non | sometimes, string, email, max:150, unique:users,email (sauf soi-même) | Email |
| password | string | Non | sometimes, string, min:8, confirmed | Mot de passe |
| password_confirmation | string | Non | — | Confirmation |
| telephone | string | Non | nullable, string, max:50 | Téléphone |
| adresse | string | Non | nullable, string, max:255 | Adresse |
| role | string | Non | sometimes, enum RoleEnum | Rôle (si fourni) |

## Réponse — Succès

HTTP Status : 200 — `UserResource` avec `roles`.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | — | compte d'autrui, non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |
| 422 | Validation | email pris, rôle invalide | `errors` Laravel |

## Règles métier

* BR-USR-002

## Services / Repositories / Resources / DTO

* UserService / UserRepository / UserResource / UpdateUserDTO

## Consommation Frontend

Écrans : Mon profil (tous), Gestion des utilisateurs (Admin).

## Références

Controller : `app/Http/Controllers/Api/UserController.php` — Request : `app/Http/Requests/User/UpdateUserRequest.php` — Policy : `app/Policies/UserPolicy.php`

## Statut

Vérifié

---

# DELETE /api/users/{id}

## Informations générales

* Nom : Suppression d'un utilisateur
* URI : `/api/users/{id}`
* Méthode : DELETE
* Description : Supprime un utilisateur.

## Authentification

Requise.

## Autorisation

Admin uniquement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'utilisateur |

## Réponse — Succès

HTTP Status : 204.

## Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |
| 401 | — | non authentifié | `Unauthenticated.` |
| 403 | — | non admin | `This action is unauthorized.` |
| 404 | — | inexistant | — |

## Règles métier

* BR-USR-001

## Références

Controller : `app/Http/Controllers/Api/UserController.php` — Policy : `app/Policies/UserPolicy.php`

## Statut

Vérifié

---

# GET /api/historique-points

## Informations générales

* Nom : Historique des points
* URI : `/api/historique-points`
* Méthode : GET
* Description : Liste paginée des attributions de points.

## Authentification

Requise.

## Autorisation

Tous rôles authentifiés (policy `viewAny` = true). Comportement observé : liste complète non filtrée par utilisateur.

## Réponse — Succès

HTTP Status : 200 — structure paginée de `HistoriquePointResource`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |

## Règles métier

* BR-PTS-002

## Services / Repositories / Resources / DTO

* HistoriquePointService / HistoriquePointRepository / HistoriquePointResource / —

## Consommation Frontend

Écrans : Mon solde de points (Citizen).

## Références

Controller : `app/Http/Controllers/Api/HistoriquePointController.php` — Policy : `app/Policies/HistoriquePointPolicy.php`

## Notes

Écart intention/implémentation : le commentaire de route prévoit « propre utilisateur ou Admin », l'implémentation retourne tout (voir BR-PTS-002 et ambiguïtés dans `api-analysis.md`).

## Statut

À revoir

---

# GET /api/historique-points/{id}

## Informations générales

* Nom : Détail d'une attribution de points
* URI : `/api/historique-points/{id}`
* Méthode : GET
* Description : Détail d'une attribution (utilisateur chargé).

## Authentification

Requise.

## Autorisation

Admin ou propriétaire de l'enregistrement.

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |
| id | integer | Oui | ID de l'enregistrement |

## Réponse — Succès

HTTP Status : 200 — `HistoriquePointResource` avec `user`.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | non propriétaire, non admin | `This action is unauthorized.` |
| 404 | inexistant | — |

## Règles métier

* BR-PTS-002

## Références

Controller : `app/Http/Controllers/Api/HistoriquePointController.php` — Policy : `app/Policies/HistoriquePointPolicy.php`

## Statut

Vérifié

---

# GET /api/dashboard/heatmap

## Informations générales

* Nom : Heatmap des zones critiques
* URI : `/api/dashboard/heatmap`
* Méthode : GET
* Description : Agrégation des signalements actifs par zone (pour carte).

## Authentification

Requise.

## Autorisation

Admin uniquement (middleware `role:admin`).

## Réponse — Succès

HTTP Status : 200

```json
{
  "data": [
    { "latitude": 14.693, "longitude": -17.444, "weight": 5, "zone_id": 3, "zone_nom": "Dakar Plateau" }
  ]
}
```

`weight` = nombre de signalements actifs de la zone. `latitude`/`longitude` = moyennes. Aucune donnée personnelle.

## Erreurs possibles

| HTTP | Cause | Message |
| ---- | ----- | ------- |
| 401 | non authentifié | `Unauthenticated.` |
| 403 | agent ou citoyen | `This action is unauthorized.` |

## Règles métier

* BR-DASH-001

## Services / Repositories / Resources / DTO

* DashboardService / DashboardRepository / HeatmapResource / —

## Consommation Frontend

Écrans : Carte des zones critiques (Admin).

## Références

Controller : `app/Http/Controllers/Api/DashboardController.php` — Repository : `app/Repositories/Eloquent/DashboardRepository.php` — Tests : `tests/Feature/DashboardHeatmapApiTest.php`

## Statut

Vérifié
