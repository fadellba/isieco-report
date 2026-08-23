# Règles métier — ISI-Eco-Report

Statut : Vérifié

Auteur : Backend Analyst

Date : 2026-08-06

Version : 1.0

---

# Conventions de lecture

* Chaque règle observe uniquement le code du backend Laravel (controllers, services, policies, requests, enums, migrations).
* Aucun comportement n'est inventé : toute règle est traçable vers une implémentation (voir `Références`).
* Les identifiants `RG8`, `RG15`, `RG16`, `RG22`, `RG23` proviennent des commentaires présents dans le code (migrations et enums) ; ils sont conservés tels quels et référencés dans les règles concernées.
* Les règles sont préfixées `BR-` et numérotées par domaine.

---

# Sommaire des règles

| Identifiant | Nom | Domaine |
| ----------- | --- | ------- |
| BR-AUTH-001 | Inscription d'un citoyen | Authentification |
| BR-AUTH-002 | Connexion avec identifiants | Authentification |
| BR-AUTH-003 | Déconnexion et révocation du token | Authentification |
| BR-AUTH-004 | Demande de réinitialisation du mot de passe | Authentification |
| BR-AUTH-005 | Réinitialisation du mot de passe | Authentification |
| BR-SIG-001 | Création d'un signalement géolocalisé | Signalement |
| BR-SIG-002 | Machine à états du signalement (RG15, RG16) | Signalement |
| BR-SIG-003 | États terminaux du signalement | Signalement |
| BR-SIG-004 | Éligibilité à l'affectation | Signalement |
| BR-SIG-005 | Confidentialité des signalements (liste) | Signalement |
| BR-SIG-006 | Modification d'un signalement par le citoyen | Signalement |
| BR-SIG-007 | Suppression d'un signalement par le citoyen | Signalement |
| BR-SIG-008 | Accès global aux signalements (admin/agent) | Signalement |
| BR-AFF-001 | Création d'une affectation | Affectation |
| BR-AFF-002 | Suppression d'une affectation | Affectation |
| BR-INT-001 | Création d'une intervention | Intervention |
| BR-INT-002 | Terminaison d'une intervention | Intervention |
| BR-INT-003 | Clôture d'une intervention et attribution de points | Intervention |
| BR-PTS-001 | Attribution tracée de points de fidélité | Points |
| BR-PTS-002 | Consultation de l'historique de points | Points |
| BR-EQP-001 | Création d'une équipe avec ses agents | Équipe |
| BR-EQP-002 | Mise à jour des agents d'une équipe | Équipe |
| BR-EQP-003 | Administration des équipes | Équipe |
| BR-REF-001 | Référentiels zones et types de déchets | Administration |
| BR-DASH-001 | Heatmap des zones critiques | Statistiques |
| BR-USR-001 | Administration des utilisateurs | Administration |
| BR-USR-002 | Modification de son propre compte | Administration |
| BR-GAM-001 | Affichage du solde de points | Gamification |
| BR-GAM-002 | Historique des transactions de points | Gamification |
| BR-GAM-003 | Classement des citoyens | Gamification |
| BR-GAM-004 | Cohérence d'affichage du solde | Gamification |

---

# Correspondance avec les règles de gestion Merise (RG1 → RG35)

Source normative amont : `knowledge-base/models/regles-gestion.md` (hors SDK — référence à `../AI_CONTEXT.md`).

| RG | Nom | BR correspondante | Statut |
| -- | --- | ------------------ | ------ |
| RG1 | Identification unique | BR-USR-001 | Conforme |
| RG2 | Unicité du rôle | BR-USR-001 | Contredite — Spatie multi-rôles ; un seul assigné en pratique |
| RG3 | Création des signalements | BR-SIG-001 | Conforme |
| RG4 | Propriétaire d'un signalement | BR-SIG-005 | Conforme |
| RG5 | Historique des points | BR-PTS-002 | Conforme |
| RG6 | Appartenance aux équipes | BR-EQP-002 | Non vérifié — `EquipeService` attache des `agent_ids` sans vérifier le rôle |
| RG7 | Mobilité des agents | BR-EQP-002 | Conforme (réserve : ré-inclusion même jour — ambiguïté n° 7 d'api-analysis.md) |
| RG8 | Historique des appartenances | BR-EQP-002 | Conforme (identifiant cité par les migrations) |
| RG9 | Identifiant | BR-SIG-001 | Conforme |
| RG10 | Localisation | BR-SIG-001 | Partielle — `zone_id` nullable (signalement sans zone possible) |
| RG11 | Composition d'une zone | BR-DASH-001 | Partielle — zones dérivées, pas d'entité propre |
| RG12 | Types de déchets | BR-REF-001 | Conforme |
| RG13 | Réutilisation des types | BR-REF-001 | Conforme |
| RG14 | Photographie facultative | BR-SIG-001 | Partielle — URLs seulement, pas d'upload (ADR-005) |
| RG15 | Décision administrative | BR-SIG-002 | Conforme (identifiant cité par l'enum) |
| RG16 | Condition d'affectation | BR-SIG-002 | Conforme (identifiant cité par l'enum) |
| RG17 | Identification | BR-REF-001 | Conforme |
| RG18 | Mutualisation | BR-REF-001 | Conforme |
| RG19 | Appartenance photo | — | Sans objet — aucun modèle photographie |
| RG20 | Multiplicité | — | Sans objet — photos par URLs |
| RG21 | Contenu zone | BR-DASH-001 | Partielle |
| RG22 | Couverture | BR-EQP-001 | Conforme (identifiant cité par les migrations) |
| RG23 | Couverture territoriale | BR-EQP-001 | Conforme (identifiant cité par les migrations) |
| RG24 | Composition | BR-EQP-001 | Conforme |
| RG25 | Affectations | BR-AFF-001 | Conforme |
| RG26 | Cible | BR-AFF-001 | Conforme |
| RG27 | Responsable | BR-AFF-001 | Conforme |
| RG28 | Réaffectation | BR-AFF-002 | Contredite — transition `affecte → affecte` interdite (voir ambiguïté n° 2 d'api-analysis.md) |
| RG29 | Interventions | BR-INT-001 | Contredite — 1re intervention → `en_intervention` ; plus d'intervention possible sur l'affectation |
| RG30 | Origine | BR-INT-001 | Conforme |
| RG31 | Exécution | BR-INT-001 | Conforme |
| RG32 | Documentation | — | Sans objet — pas de photos d'intervention |
| RG33 | Suivi | BR-INT-002 | Conforme |
| RG34 | Attribution | BR-PTS-001 | Conforme |
| RG35 | Cumul | BR-PTS-002 | Conforme |

Statuts :

* **Contredite** — l'implémentation ne respecte pas la règle ; détail dans `OUTPUT/cahier-des-charges-backend-sdk-conformity-report.md`.
* **Partielle** — la règle est satisfaite en partie ou par construction dérivée.
* **Non vérifié** — pas de garde-fou dans le code (à confirmer par test).
* **Sans objet** — entité absente du modèle implémenté.

---

# BR-AUTH-001 — Inscription d'un citoyen

## Domaine

Authentification

## Objectif

Permettre à un citoyen de créer un compte et d'obtenir immédiatement une session authentifiée.

## Acteurs concernés

* Citizen

## Déclencheur

Appel à `POST /api/auth/register`.

## Préconditions

* Aucune (endpoint public).

## Règle métier

SI les champs sont valides (nom, prénom, email unique, mot de passe ≥ 8 caractères confirmé)
ALORS le compte est créé avec le rôle `citizen` et un token Sanctum (`auth_token`) est émis
ET la réponse `201` contient `{ user, token }`.

Le rôle `citizen` est appliqué par défaut : le corps de requête ne contient aucun champ de rôle.

## Cas d'échec

* Email déjà utilisé → `422` (validation `unique:users,email`).
* Mot de passe < 8 caractères ou non confirmé → `422`.
* Échec de persistance → transaction annulée, aucune création partielle.

## Résultat attendu

Compte créé, session (token) immédiatement utilisable, utilisateur retourné avec ses rôles.

## Exceptions métier

Aucune. `EmailAlreadyExistsException` existe dans le code mais n'est pas utilisée par ce flux : la contrainte est portée par la validation.

## Données concernées

* User
* personal_access_tokens

## Services / Controllers concernés

* AuthService (`register`)
* UserService (`create`, via `CreateUserDTO`)
* AuthController

## Endpoints concernés

* POST /api/auth/register

## Écrans Frontend concernés

* Inscription (Citizen)

## Cas de test

* Nominal : inscription valide → 201, `user.role = "citizen"`, token non vide.
* Limite : email déjà utilisé → 422.
* Erreur : mot de passe non confirmé → 422.

## Références

* Controller : `app/Http/Controllers/Api/AuthController.php`
* Service : `app/Services/AuthService.php`, `app/Services/UserService.php`
* Request : `app/Http/Requests/Auth/RegisterRequest.php`
* DTO : `app/DTOs/Auth/RegisterDTO.php` → `CreateUserDTO`
* Tests : `tests/Feature/AuthApiTest.php`

## Impact

UX : session immédiate après inscription (pas de double étape).

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-AUTH-002 — Connexion avec identifiants

## Domaine

Authentification

## Objectif

Authentifier un utilisateur existant et émettre un nouveau token de session.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appel à `POST /api/auth/login`.

## Préconditions

* Compte existant (email).

## Règle métier

SI l'email existe ET le mot de passe correspond au hash (`Hash::check`)
ALORS un nouveau token Sanctum est émis et la réponse `200` contient `{ user, token }`.
SINON une `InvalidCredentialsException` est levée → `401` avec message `Invalid credentials.`

## Cas d'échec

* Email inconnu ou mot de passe incorrect → `401` (message générique, aucune information sur le champ en erreur).
* Champs manquants ou email malformé → `422`.

## Résultat attendu

Utilisateur connecté, token émis. Chaque connexion crée un token distinct (les anciens restent valides).

## Exceptions métier

* InvalidCredentialsException → `401`

## Données concernées

* User
* personal_access_tokens

## Services / Controllers concernés

* AuthService (`login`)
* AuthController

## Endpoints concernés

* POST /api/auth/login

## Écrans Frontend concernés

* Connexion (Citizen, Agent, Administrator)

## Cas de test

* Nominal : bons identifiants → 200 + token.
* Erreur : mauvais mot de passe → 401.
* Erreur : email inconnu → 401 (même message que mauvais mot de passe).

## Références

* Controller : `app/Http/Controllers/Api/AuthController.php`
* Service : `app/Services/AuthService.php`
* Request : `app/Http/Requests/Auth/LoginRequest.php`
* Exception : `app/Exceptions/Auth/InvalidCredentialsException.php`
* Tests : `tests/Feature/AuthApiTest.php`

## Impact

Sécurité : pas d'énumération d'emails (message unique).

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-AUTH-003 — Déconnexion et révocation du token

## Domaine

Authentification

## Objectif

Mettre fin à la session courante en supprimant le token utilisé.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appel à `POST /api/auth/logout` (authentifié).

## Préconditions

* Utilisateur authentifié (token valide).

## Règle métier

Le token courant (identifié par `currentAccessToken()->id`) est supprimé de `personal_access_tokens`.
La réponse est `204 No Content`.

## Cas d'échec

* Non authentifié → `401`.

## Résultat attendu

Session terminée ; le token révoqué ne fonctionne plus.

## Exceptions métier

Aucune.

## Données concernées

* personal_access_tokens

## Services / Controllers concernés

* AuthService (`logout`)
* AuthController

## Endpoints concernés

* POST /api/auth/logout

## Écrans Frontend concernés

* Déconnexion (tous profils)

## Cas de test

* Nominal : logout → 204 ; le token ne permet plus d'accéder aux routes protégées.
* Erreur : sans token → 401.

## Références

* Controller : `app/Http/Controllers/Api/AuthController.php`
* Service : `app/Services/AuthService.php`
* Tests : `tests/Feature/AuthApiTest.php`

## Impact

Sécurité : révocation effective côté serveur (pas seulement côté client).

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-AUTH-004 — Demande de réinitialisation du mot de passe

## Domaine

Authentification

## Objectif

Envoyer un lien de réinitialisation par email via le broker `Password` de Laravel.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appel à `POST /api/auth/forgot-password` (public).

## Préconditions

* Champ `email` valide (format email).

## Règle métier

SI l'email est valide
ALORS le broker `Password::sendResetLink` est invoqué
ET la réponse `200` est systématiquement renvoyée avec `{"message": "If the email exists, a reset link has been sent."}`.

Le lien de réinitialisation est construit avec `frontend_url` + `/reset-password?token=...&email=...` (personnalisation dans `AppServiceProvider`).

## Cas d'échec

* Email malformé → `422`.
* Aucun échec retourné au client : la réponse est toujours `200` (l'existence du compte n'est pas divulguée).

## Résultat attendu

Lien envoyé si le compte existe ; réponse identique dans tous les cas.

## Exceptions métier

Aucune exposée au client. (`PasswordResetLinkException` existe mais n'est pas levée par ce flux.)

## Données concernées

* User (email)
* password_reset_tokens

## Services / Controllers concernés

* AuthService (`sendResetLink`)
* AuthController

## Endpoints concernés

* POST /api/auth/forgot-password

## Écrans Frontend concernés

* Mot de passe oublié (Citizen, Agent, Administrator)

## Cas de test

* Nominal : email existant → 200 + message.
* Limite : email inexistant → 200 + même message.

## Références

* Controller : `app/Http/Controllers/Api/AuthController.php`
* Service : `app/Services/AuthService.php`
* Request : `app/Http/Requests/Auth/ForgotPasswordRequest.php`
* Provider : `app/Providers/AppServiceProvider.php` (URL du lien)

## Impact

UX : message neutre ; Sécurité : pas d'énumération de comptes.

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-AUTH-005 — Réinitialisation du mot de passe

## Domaine

Authentification

## Objectif

Mettre à jour le mot de passe d'un utilisateur après vérification du token reçu par email.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appel à `POST /api/auth/reset-password` (public), depuis le lien reçu.

## Préconditions

* Token valide et non expiré (broker `Password`).
* Email correspondant.
* Mot de passe ≥ 8 caractères et confirmé.

## Règle métier

SI le token, l'email et le mot de passe sont valides
ALORS le mot de passe est remplacé et la réponse `200` est `{"message": "Password reset successfully."}`.

## Cas d'échec

* Token invalide, expiré, ou email sans lien demandé → le broker renvoie un statut d'échec (exception `PasswordException`) ; le contrôleur ne gère pas ce cas → erreur `500` non personnalisée (comportement observé, à confirmer par test).
* Champs invalides → `422`.

## Résultat attendu

Mot de passe modifié ; l'utilisateur peut se connecter avec le nouveau mot de passe.

## Exceptions métier

* PasswordResetTokenInvalidException, PasswordResetTokenExpiredException : définies mais non levées par ce flux (non utilisées dans le code).

## Données concernées

* User (password)

## Services / Controllers concernés

* AuthService (`resetPassword`)
* AuthController

## Endpoints concernés

* POST /api/auth/reset-password

## Écrans Frontend concernés

* Réinitialisation du mot de passe

## Cas de test

* Nominal : token valide → 200.
* Erreur : token invalide → à vérifier (comportement actuel non maîtrisé).

## Références

* Controller : `app/Http/Controllers/Api/AuthController.php`
* Service : `app/Services/AuthService.php`
* Request : `app/Http/Requests/Auth/ResetPasswordRequest.php`

## Notes

Cas d'échec du broker : comportement exact à confirmer par un test d'intégration (`Password::reset` lève `PasswordException` quand le token est invalide).

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

À confirmer (cas d'échec du broker)

---

# BR-SIG-001 — Création d'un signalement géolocalisé

## Domaine

Signalement

## Objectif

Permettre à tout utilisateur authentifié de signaler un dépôt de déchets avec sa position géographique.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appel à `POST /api/signalements`.

## Préconditions

* Utilisateur authentifié.
* `latitude` et `longitude` obligatoires dans les plages (−90 à 90 ; −180 à 180).

## Règle métier

SI la requête est valide
ALORS un signalement est créé avec :
* `user_id` = utilisateur authentifié (imposé par le DTO, non fourni par le client) ;
* `statut` = `en_attente_validation` par défaut (modifiable via le champ `statut`) ;
* `priorite` = `normale` par défaut (modifiable via le champ `priorite`) ;
* `zone_id` facultatif (doit exister) ;
* les types de déchets associés (pivot `contenu_signalement` : quantite_estime, volume_estime, dangerosite, remarque) ;
* les photos (liste d'URLs valides).

L'ensemble est exécuté dans une transaction. La réponse est `201` avec la ressource complète (user, zone, type_dechets, photos).

## Cas d'échec

* Non authentifié → `401`.
* Latitude/longitude manquantes ou hors plage → `422`.
* `type_dechets.*.type_dechet_id` inexistant → `422`.
* Photo invalide (URL malformée) → `422`.

## Résultat attendu

Signalement créé en attente de validation, visible par l'administration.

## Exceptions métier

Aucune.

## Données concernées

* Signalement
* TypeDechet (pivot `contenu_signalement`)
* PhotoSignalement

## Services / Controllers concernés

* SignalementService (`create`)
* SignalementController

## Endpoints concernés

* POST /api/signalements

## Écrans Frontend concernés

* Création d'un signalement (Citizen)

## Cas de test

* Nominal : création avec type_dechets + photos → 201.
* Limite : signalement sans description (nullable) → 201.
* Erreur : latitude > 90 → 422.

## Références

* Controller : `app/Http/Controllers/Api/SignalementController.php`
* Service : `app/Services/SignalementService.php`
* Request : `app/Http/Requests/Signalement/StoreSignalementRequest.php`
* DTO : `app/DTOs/Signalement/CreateSignalementDTO.php`
* Tests : `tests/Feature/SignalementApiTest.php`

## Impact

UX : géolocalisation obligatoire, description facultative.

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-SIG-002 — Machine à états du signalement (RG15, RG16)

## Domaine

Signalement

## Objectif

Garantir que le statut d'un signalement n'évolue que selon un graphe de transitions autorisées.

## Acteurs concernés

* Citizen (sur ses signalements en brouillon / en attente)
* Agent
* Administrator
* Système

## Déclencheur

Toute mise à jour du statut : `PUT /api/signalements/{id}`, ou transitions internes (affectation, intervention, clôture).

## Préconditions

* Signalement existant.
* Le statut cible diffère du statut courant (sinon aucune opération).

## Règle métier

Les transitions autorisées sont (source `SignalementStatutEnum::transitionsAutorisees()`, références RG15 et RG16) :

| Statut courant | Statuts autorisés |
| -------------- | ----------------- |
| brouillon | en_attente_validation |
| en_attente_validation | valide, rejete |
| valide | priorise, affecte |
| priorise | affecte |
| affecte | en_intervention |
| en_intervention | termine |
| termine | cloture |
| rejete | — |
| cloture | — |

SI la transition demandée n'est pas dans cette table
ALORS une `InvalidTransitionException` est levée → `422` avec message décrivant `current → next`.

## Cas d'échec

* Transition non autorisée → `422` (exemple : passer un signalement `valide` directement à `cloture`).

## Résultat attendu

L'intégrité du cycle de vie du signalement est garantie, côté serveur.

## Exceptions métier

* InvalidTransitionException → `422`

## Données concernées

* Signalement (statut)

## Services / Controllers concernés

* SignalementService (`update`, `transitionTo`, `validateTransition`)
* SignalementController, AffectationService, InterventionService

## Endpoints concernés

* PUT /api/signalements/{id}
* POST /api/affectations
* POST /api/interventions
* PUT /api/interventions/{id}
* POST /api/interventions/{id}/cloturer

## Écrans Frontend concernés

* Validation/priorisation (Admin)
* Affectation (Admin)
* Intervention (Agent)
* Suivi du signalement (Citizen)

## Cas de test

* Nominal : `en_attente_validation` → `valide` OK.
* Erreur : `en_attente_validation` → `affecte` → 422.

## Références

* Enum : `app/Enums/SignalementStatutEnum.php`
* Service : `app/Services/SignalementService.php`
* Exception : `app/Exceptions/Business/InvalidTransitionException.php`
* Tests : `tests/Feature/SignalementApiTest.php`

## Impact

Le frontend peut dériver les actions possibles de la table de transitions (affichage conditionnel des boutons).

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-SIG-003 — États terminaux du signalement

## Domaine

Signalement

## Objectif

Interdire toute évolution d'un signalement rejeté ou clôturé.

## Acteurs concernés

* Système
* Administrator
* Agent

## Déclencheur

Toute tentative de transition de statut.

## Préconditions

* Signalement au statut `rejete` ou `cloture`.

## Règle métier

SI le statut courant est `rejete` ou `cloture`
ALORS aucune transition n'est autorisée (table de transitions vide) ;
toute tentative lève `InvalidTransitionException` → `422`.

## Cas d'échec

* Transition depuis un état terminal → `422`.

## Résultat attendu

Un signalement rejeté ou clôturé est immuable.

## Exceptions métier

* InvalidTransitionException

## Données concernées

* Signalement

## Services / Controllers concernés

* SignalementService

## Endpoints concernés

* PUT /api/signalements/{id}
* POST /api/interventions/{id}/cloturer

## Écrans Frontend concernés

* Détail signalement (lecture seule pour les états terminaux)

## Cas de test

* Erreur : `cloture` → `valide` → 422.

## Références

* Enum : `app/Enums/SignalementStatutEnum.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-SIG-004 — Éligibilité à l'affectation

## Domaine

Signalement

## Objectif

Restreindre l'affectation d'un signalement à une équipe aux seuls signalements validés ou priorisés.

## Acteurs concernés

* Administrator

## Déclencheur

Appel à `POST /api/affectations`.

## Préconditions

* Signalement existant.

## Règle métier

SI le statut du signalement est `valide` ou `priorise` (`peutEtreAffecte()`)
ALORS l'affectation est créée et le signalement passe au statut `affecte`.
SINON une `SignalementNotValidatedException` est levée → `422`.

## Cas d'échec

* Signalement en `en_attente_validation`, `brouillon`, `affecte`, `en_intervention`, `termine`, `rejete` ou `cloture` → `422`.

## Résultat attendu

Seuls les signalements validés ou priorisés peuvent être affectés à une équipe.

## Exceptions métier

* SignalementNotValidatedException → `422`

## Données concernées

* Signalement
* Affectation

## Services / Controllers concernés

* AffectationService (`create`)
* SignalementService (`transitionTo`)

## Endpoints concernés

* POST /api/affectations

## Écrans Frontend concernés

* Affectation d'un signalement (Admin)

## Cas de test

* Nominal : signalement `valide` → affectation créée, statut `affecte`.
* Erreur : signalement `en_attente_validation` → 422.

## Références

* Enum : `app/Enums/SignalementStatutEnum.php` (`peutEtreAffecte`)
* Service : `app/Services/AffectationService.php`
* Exception : `app/Exceptions/Business/SignalementNotValidatedException.php`
* Tests : `tests/Feature/AffectationApiTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-SIG-005 — Confidentialité des signalements (liste)

## Domaine

Signalement

## Objectif

Un citoyen ne voit que ses propres signalements ; les agents et admins voient tous les signalements.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appel à `GET /api/signalements`.

## Préconditions

* Utilisateur authentifié.

## Règle métier

SI l'utilisateur est un citoyen (`isCitizen()`)
ALORS la liste est filtrée sur `user_id` (ses signalements uniquement), triée par date décroissante (`latest`).
SINON la liste paginée complète est retournée.

## Cas d'échec

* Non authentifié → `401`.

## Résultat attendu

Isolation des données par rôle : un citoyen ne voit jamais les signalements d'autrui dans la liste.

## Exceptions métier

Aucune.

## Données concernées

* Signalement

## Services / Controllers concernés

* SignalementController (`index`)
* SignalementService (`paginate`)

## Endpoints concernés

* GET /api/signalements

## Écrans Frontend concernés

* Liste de mes signalements (Citizen)
* Liste des signalements (Agent, Admin)

## Cas de test

* Nominal : citoyen → uniquement ses signalements.
* Nominal : admin → tous les signalements.

## Références

* Controller : `app/Http/Controllers/Api/SignalementController.php`
* Tests : `tests/Feature/SignalementApiTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-SIG-006 — Modification d'un signalement par le citoyen

## Domaine

Signalement

## Objectif

Autoriser le citoyen à modifier uniquement ses signalements non encore validés.

## Acteurs concernés

* Citizen
* Administrator

## Déclencheur

Appel à `PUT /api/signalements/{id}`.

## Préconditions

* Signalement existant.

## Règle métier

SI l'utilisateur est admin
ALORS la modification est toujours autorisée.
SINON la modification est autorisée uniquement SI le signalement appartient à l'utilisateur ET son statut est `brouillon` ou `en_attente_validation`.

Champs modifiables : `description`, `statut`, `priorite`, `zone_id`. La géolocalisation n'est PAS modifiable via l'API.

Le changement de statut est soumis à la machine à états (BR-SIG-002) : un citoyen peut donc faire passer son signalement de `brouillon` à `en_attente_validation`.

## Cas d'échec

* Citoyen modifiant le signalement d'autrui → `403`.
* Citoyen modifiant un signalement `valide` ou au-delà → `403`.
* Transition non autorisée → `422`.

## Résultat attendu

Seuls les signalements récents et non engagés sont modifiables par leur auteur.

## Exceptions métier

* InvalidTransitionException

## Données concernées

* Signalement

## Services / Controllers concernés

* SignalementService (`update`)
* SignalementController

## Endpoints concernés

* PUT /api/signalements/{id}

## Écrans Frontend concernés

* Modification d'un signalement (Citizen)

## Cas de test

* Nominal : auteur, statut `brouillon` → 200.
* Erreur : auteur, statut `valide` → 403.
* Erreur : autre utilisateur → 403.

## Références

* Policy : `app/Policies/SignalementPolicy.php` (`update`)
* Controller : `app/Http/Controllers/Api/SignalementController.php`
* Request : `app/Http/Requests/Signalement/UpdateSignalementRequest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-SIG-007 — Suppression d'un signalement par le citoyen

## Domaine

Signalement

## Objectif

Autoriser la suppression uniquement des signalements brouillons de leur auteur.

## Acteurs concernés

* Citizen
* Administrator

## Déclencheur

Appel à `DELETE /api/signalements/{id}`.

## Préconditions

* Signalement existant.

## Règle métier

SI l'utilisateur est admin
ALORS la suppression est toujours autorisée.
SINON la suppression est autorisée uniquement SI le signalement appartient à l'utilisateur ET son statut est `brouillon`.

## Cas d'échec

* Citoyen supprimant un signalement soumis (`en_attente_validation` ou plus) → `403`.
* Citoyen supprimant le signalement d'autrui → `403`.

## Résultat attendu

Un signalement déjà soumis est définitivement protégé contre la suppression par son auteur.

## Exceptions métier

Aucune.

## Données concernées

* Signalement (et relations : photos, pivot types de déchets)

## Services / Controllers concernés

* SignalementService (`delete`)
* SignalementController

## Endpoints concernés

* DELETE /api/signalements/{id}

## Écrans Frontend concernés

* Mes signalements (Citizen) — bouton supprimer

## Cas de test

* Nominal : auteur, `brouillon` → 204.
* Erreur : auteur, `en_attente_validation` → 403.

## Références

* Policy : `app/Policies/SignalementPolicy.php` (`delete`)
* Controller : `app/Http/Controllers/Api/SignalementController.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-SIG-008 — Accès global aux signalements (admin/agent)

## Domaine

Signalement

## Objectif

Les agents et admins consultent l'ensemble des signalements.

## Acteurs concernés

* Agent
* Administrator

## Déclencheur

Appel à `GET /api/signalements/{id}`.

## Préconditions

* Signalement existant.

## Règle métier

SI l'utilisateur est admin ou agent
ALORS la consultation de n'importe quel signalement est autorisée.
SINON l'accès est limité au propriétaire du signalement.

La ressource détail charge : `user`, `zone`, `type_dechets`, `photos`.

## Cas d'échec

* Citoyen consultant le signalement d'autrui → `403`.

## Résultat attendu

Vision globale pour les équipes de terrain et l'administration.

## Exceptions métier

Aucune.

## Données concernées

* Signalement

## Services / Controllers concernés

* SignalementController (`show`)

## Endpoints concernés

* GET /api/signalements/{id}

## Écrans Frontend concernés

* Détail signalement (Agent, Admin)

## Cas de test

* Nominal : agent → 200 avec relations chargées.
* Erreur : citoyen non propriétaire → 403.

## Références

* Policy : `app/Policies/SignalementPolicy.php` (`view`)

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-AFF-001 — Création d'une affectation

## Domaine

Affectation

## Objectif

Affecter un signalement validé à une équipe, ce qui engage le cycle d'intervention.

## Acteurs concernés

* Administrator

## Déclencheur

Appel à `POST /api/affectations`.

## Préconditions

* Signalement existant et éligible (BR-SIG-004).
* Équipe existante.
* Date et heure d'affectation au format `Y-m-d H:i:s`.

## Règle métier

SI le signalement est `valide` ou `priorise`
ALORS l'affectation est créée (équipe, signalement, date, observation) et le signalement passe au statut `affecte`, le tout en transaction.

## Cas d'échec

* Signalement non éligible → `422` (SignalementNotValidatedException).
* Champs invalides → `422`.

## Résultat attendu

Signalement engagé : il ne peut plus être affecté ailleurs (le statut `affecte` n'autorise que `en_intervention`).

## Exceptions métier

* SignalementNotValidatedException

## Données concernées

* Affectation
* Signalement
* Equipe

## Services / Controllers concernés

* AffectationService (`create`)
* AffectationController

## Endpoints concernés

* POST /api/affectations

## Écrans Frontend concernés

* Affectation d'un signalement (Admin)

## Cas de test

* Nominal : signalement `valide` → 201, statut `affecte`.
* Erreur : signalement `en_attente_validation` → 422.

## Références

* Controller : `app/Http/Controllers/Api/AffectationController.php`
* Service : `app/Services/AffectationService.php`
* Request : `app/Http/Requests/Affectation/StoreAffectationRequest.php`
* Tests : `tests/Feature/AffectationApiTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-AFF-002 — Suppression d'une affectation

## Domaine

Affectation

## Objectif

Permettre à l'admin d'annuler une affectation.

## Acteurs concernés

* Administrator

## Déclencheur

Appel à `DELETE /api/affectations/{id}`.

## Préconditions

* Affectation existante.

## Règle métier

SI l'utilisateur est admin
ALORS l'affectation est supprimée (réponse `204`).

Comportement observé : le statut du signalement n'est PAS réinitialisé (il reste `affecte`). Aucun endpoint ne permet de le ramener vers `valide`/`priorise` après annulation.

## Cas d'échec

* Non admin → `403`.
* Affectation inexistante → `404`.

## Résultat attendu

Affectation supprimée ; le signalement conserve son statut `affecte`.

## Exceptions métier

Aucune.

## Données concernées

* Affectation
* Signalement (statut inchangé)

## Services / Controllers concernés

* AffectationService (`delete`)
* AffectationController

## Endpoints concernés

* DELETE /api/affectations/{id}

## Écrans Frontend concernés

* Gestion des affectations (Admin)

## Cas de test

* Nominal : admin → 204.
* Erreur : agent → 403.

## Références

* Policy : `app/Policies/AffectationPolicy.php`
* Tests : `tests/Feature/AffectationApiTest.php`

## Notes

Point de vigilance pour le frontend : après annulation, le signalement reste `affecte` et ne peut pas être ré-affecté (transition `affecte → affecte` non autorisée). Voir ambiguïtés dans `api-analysis.md`.

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-INT-001 — Création d'une intervention

## Domaine

Intervention

## Objectif

Enregistrer le début d'une intervention sur un signalement affecté.

## Acteurs concernés

* Agent
* Administrator

## Déclencheur

Appel à `POST /api/interventions`.

## Préconditions

* Affectation existante (`affectation_id` requis).
* Le signalement de l'affectation doit être au statut `affecte`.

## Règle métier

SI le signalement lié à l'affectation est `affecte`
ALORS l'intervention est créée (`date_heure_debut` requis, `statut` par défaut `en_cours`) et le signalement passe à `en_intervention`, en transaction.
SINON `InvalidTransitionException` → `422`.

## Cas d'échec

* Signalement non `affecte` (ex. toujours `valide`) → `422`.
* Non authentifié → `401` ; non admin/agent → `403`.

## Résultat attendu

Intervention en cours, signalement au statut `en_intervention`.

## Exceptions métier

* InvalidTransitionException

## Données concernées

* Intervention
* Affectation
* Signalement

## Services / Controllers concernés

* InterventionService (`create`)
* InterventionController

## Endpoints concernés

* POST /api/interventions

## Écrans Frontend concernés

* Création d'une intervention (Agent, Admin)

## Cas de test

* Nominal : affectation d'un signalement `affecte` → 201.
* Erreur : signalement `valide` → 422.

## Références

* Controller : `app/Http/Controllers/Api/InterventionController.php`
* Service : `app/Services/InterventionService.php`
* Request : `app/Http/Requests/Intervention/StoreInterventionRequest.php`
* Tests : `tests/Feature/InterventionApiTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-INT-002 — Terminaison d'une intervention

## Domaine

Intervention

## Objectif

Marquer une intervention terminée et faire évoluer le signalement correspondant.

## Acteurs concernés

* Agent
* Administrator

## Déclencheur

Appel à `PUT /api/interventions/{id}` avec `statut = terminee`.

## Préconditions

* Intervention existante.
* Champs modifiables : `date_heure_fin`, `statut`, `compte_rendu`, `observation`, `photos`.

## Règle métier

SI le nouveau statut est `terminee`
ALORS le signalement lié passe au statut `termine` (transition `en_intervention → termine`).
Les photos fournies sont ajoutées à l'intervention.

## Cas d'échec

* Intervention inexistante → `404`.
* Non admin/agent → `403`.

## Résultat attendu

Intervention terminée, signalement `termine`, prêt à être clôturé.

## Exceptions métier

* InvalidTransitionException (si le signalement n'est pas `en_intervention`)

## Données concernées

* Intervention
* PhotoIntervention
* Signalement

## Services / Controllers concernés

* InterventionService (`update`)
* InterventionController

## Endpoints concernés

* PUT /api/interventions/{id}

## Écrans Frontend concernés

* Suivi d'intervention (Agent)

## Cas de test

* Nominal : statut `terminee` → signalement `termine`.
* Limite : statut `suspendue` ou `en_cours` → aucun impact sur le signalement.

## Références

* Service : `app/Services/InterventionService.php`
* Enum : `app/Enums/InterventionStatutEnum.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-INT-003 — Clôture d'une intervention et attribution de points

## Domaine

Intervention

## Objectif

Clôturer le cycle de vie du signalement et récompenser le citoyen signalant.

## Acteurs concernés

* Agent
* Administrator
* Système

## Déclencheur

Appel à `POST /api/interventions/{id}/cloturer`.

## Préconditions

* Intervention existante.
* Le signalement lié doit être au statut `termine` (la clôture exécute la transition `termine → cloture`).

## Règle métier

SI la transition `termine → cloture` est autorisée
ALORS :
1. le signalement passe au statut `cloture` ;
2. le propriétaire du signalement reçoit `+100` points (motif `Signalement clôturé`) via `HistoriquePointService::awardPoints` ;
3. le tout est enveloppé dans une transaction.

## Cas d'échec

* Signalement pas encore `termine` → `422` (InvalidTransitionException).
* Non admin/agent → `403`.

## Résultat attendu

Signalement clôturé, points crédités et tracés dans `historique_points`.

## Exceptions métier

* InvalidTransitionException

## Données concernées

* Signalement
* Intervention
* HistoriquePoint

## Services / Controllers concernés

* InterventionService (`cloturer`)
* HistoriquePointService (`awardPoints`)
* InterventionController

## Endpoints concernés

* POST /api/interventions/{id}/cloturer

## Écrans Frontend concernés

* Clôture d'intervention (Agent, Admin)

## Cas de test

* Nominal : signalement `termine` → signalement `cloture`, +100 points.
* Erreur : signalement `en_intervention` → 422.

## Références

* Service : `app/Services/InterventionService.php`
* Tests : `tests/Feature/InterventionApiTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-PTS-001 — Attribution tracée de points de fidélité

## Domaine

Points

## Objectif

Garantir que chaque attribution de points est enregistrée avec sa date.

## Acteurs concernés

* Système

## Déclencheur

Clôture d'une intervention (BR-INT-003). Actuellement le seul flux d'attribution.

## Préconditions

* Utilisateur destinataire existant.

## Règle métier

Chaque attribution crée un enregistrement `historique_points` avec :
* `nombre_points` (100 à la clôture) ;
* `motif` ;
* `description` (référence le signalement clôturé) ;
* `date_attribution` = date du jour.

## Cas d'échec

* Utilisateur inexistant → erreur de clé étrangère (cas non géré explicitement).

## Résultat attendu

Traçabilité complète des points.

## Exceptions métier

Aucune.

## Données concernées

* HistoriquePoint

## Services / Controllers concernés

* HistoriquePointService (`awardPoints`)

## Endpoints concernés

* POST /api/interventions/{id}/cloturer

## Écrans Frontend concernés

* Mon solde de points (Citizen)

## Cas de test

* Nominal : clôture → enregistrement avec date du jour.

## Références

* Service : `app/Services/HistoriquePointService.php`
* DTO : `app/DTOs/HistoriquePoint/CreateHistoriquePointDTO.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-PTS-002 — Consultation de l'historique de points

## Domaine

Points

## Objectif

Permettre à chacun de consulter les points, avec isolation des données.

## Acteurs concernés

* Citizen
* Administrator

## Déclencheur

Appels à `GET /api/historique-points` et `GET /api/historique-points/{id}`.

## Préconditions

* Utilisateur authentifié.

## Règle métier

* Détail : autorisé pour l'admin OU le propriétaire de l'enregistrement (policy `view`).
* Liste : la policy `viewAny` retourne `true` pour tout utilisateur authentifié ET le service retourne l'ensemble paginé — le filtre par utilisateur n'est pas appliqué côté liste (comportement observé).

## Cas d'échec

* Détail d'un enregistrement d'autrui (non admin) → `403`.

## Résultat attendu

Voir Notes : l'écart entre le commentaire de route (« propre utilisateur ou Admin ») et le comportement effectif (liste globale) constitue une ambiguïté à trancher.

## Exceptions métier

Aucune.

## Données concernées

* HistoriquePoint
* User

## Services / Controllers concernés

* HistoriquePointService (`paginate`, `findOrFail`)
* HistoriquePointController

## Endpoints concernés

* GET /api/historique-points
* GET /api/historique-points/{id}

## Écrans Frontend concernés

* Mon solde de points (Citizen)

## Cas de test

* Nominal : admin → 200 (liste globale).
* Limite : citoyen → 200 (liste globale actuellement, malgré le commentaire de route).
* Erreur : détail d'un enregistrement d'autrui → 403.

## Références

* Controller : `app/Http/Controllers/Api/HistoriquePointController.php`
* Policy : `app/Policies/HistoriquePointPolicy.php`
* Service : `app/Services/HistoriquePointService.php`

## Notes

Ambiguïté : le commentaire `routes/api.php` indique « propre utilisateur ou Admin » mais `viewAny` + `paginate` exposent l'historique complet à tout utilisateur authentifié. Décision requise (voir `api-analysis.md`, ambiguïtés).

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

À confirmer (écart intention/implémentation)

---

# BR-EQP-001 — Création d'une équipe avec ses agents

## Domaine

Équipe

## Objectif

Créer une équipe de collecte et lui affecter ses agents dès la création.

## Acteurs concernés

* Administrator

## Déclencheur

Appel à `POST /api/equipes`.

## Préconditions

* Admin authentifié.
* Agents référencés existants.

## Règle métier

SI les champs sont valides (`nom_equipe` requis, `agent_ids` optionnel)
ALORS l'équipe est créée et chaque agent est rattaché via le pivot `appartenance_equipe` avec `date_debut` = aujourd'hui et `fonction` = `Agent de collecte` (transaction).

## Cas d'échec

* Nom d'équipe manquant → `422`.
* Agent inexistant → `422`.

## Résultat attendu

Équipe créée avec ses membres initiaux.

## Exceptions métier

Aucune.

## Données concernées

* Equipe
* appartenance_equipe (pivot)

## Services / Controllers concernés

* EquipeService (`create`)
* EquipeController

## Endpoints concernés

* POST /api/equipes

## Écrans Frontend concernés

* Création d'équipe (Admin)

## Cas de test

* Nominal : création avec 2 agents → 201, pivot avec date du jour.
* Limite : création sans agents → 201.

## Références

* Service : `app/Services/EquipeService.php`
* Request : `app/Http/Requests/Equipe/StoreEquipeRequest.php`
* Tests : `tests/Feature/EquipeApiTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-EQP-002 — Mise à jour des agents d'une équipe

## Domaine

Équipe

## Objectif

Reconfigurer la composition d'une équipe.

## Acteurs concernés

* Administrator

## Déclencheur

Appel à `PUT /api/equipes/{id}` avec `agent_ids`.

## Préconditions

* Équipe existante.
* Admin authentifié.

## Règle métier

SI `agent_ids` est fourni
ALORS les agents sont synchronisés (`sync`) avec `date_debut` = aujourd'hui et `fonction` = `Agent de collecte`.

Comportement observé : la synchronisation remplace la composition et **réinitialise** `date_debut` pour tous les membres, y compris ceux déjà présents.

## Cas d'échec

* Équipe inexistante → `404`.
* Agent inexistant → `422`.

## Résultat attendu

Composition d'équipe remplacée.

## Exceptions métier

Aucune.

## Données concernées

* Equipe
* appartenance_equipe (pivot)

## Services / Controllers concernés

* EquipeService (`update`)
* EquipeController

## Endpoints concernés

* PUT /api/equipes/{id}

## Écrans Frontend concernés

* Gestion d'équipe (Admin)

## Cas de test

* Nominal : sync de nouveaux agents → 200.
* Limite : ré-inclusion d'un agent déjà membre → sa date_debut est réinitialisée.

## Références

* Service : `app/Services/EquipeService.php`
* Request : `app/Http/Requests/Equipe/UpdateEquipeRequest.php`

## Notes

Attention : la clé primaire du pivot (RG8) inclut `date_debut` ; la réinitialisation de `date_debut` par `sync` peut créer des doublons si l'agent est ré-inclus le même jour (à vérifier par test).

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

À confirmer (cas du même jour)

---

# BR-EQP-003 — Administration des équipes

## Domaine

Équipe

## Objectif

Réserver la gestion des équipes à l'admin ; les agents consultent.

## Acteurs concernés

* Agent
* Administrator

## Déclencheur

Appels aux endpoints `equipes` (lecture ou écriture).

## Préconditions

* Utilisateur authentifié.

## Règle métier

* Lecture (`index`, `show`) : admin OU agent.
* Écriture (`store`, `update`, `destroy`) : admin uniquement.

## Cas d'échec

* Agent en écriture → `403`.
* Citoyen en lecture → `403`.

## Résultat attendu

Les équipes sont visibles par les agents, gérées par l'admin.

## Exceptions métier

Aucune.

## Données concernées

* Equipe

## Services / Controllers concernés

* EquipeController
* EquipeService

## Endpoints concernés

* GET /api/equipes
* GET /api/equipes/{id}
* POST /api/equipes
* PUT /api/equipes/{id}
* DELETE /api/equipes/{id}

## Écrans Frontend concernés

* Liste des équipes (Agent, Admin)

## Cas de test

* Nominal : agent en lecture → 200.
* Erreur : agent en écriture → 403.

## Références

* Policy : `app/Policies/EquipePolicy.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-REF-001 — Référentiels zones et types de déchets

## Domaine

Administration

## Objectif

Centraliser les zones et types de déchets : lecture pour tous, écriture admin.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appels aux endpoints `zones` et `types-dechets`.

## Préconditions

* Utilisateur authentifié.

## Règle métier

* Lecture (`index`, `show`) : tout utilisateur authentifié.
* Écriture (`store`, `update`, `destroy`) : admin uniquement.

## Cas d'échec

* Non authentifié → `401`.
* Non admin en écriture → `403`.

## Résultat attendu

Référentiels alimentés par l'admin, consultables par tous.

## Exceptions métier

Aucune.

## Données concernées

* Zone
* TypeDechet

## Services / Controllers concernés

* ZoneController / ZoneService
* TypeDechetController / TypeDechetService

## Endpoints concernés

* GET /api/zones, POST /api/zones, GET /api/zones/{id}, PUT /api/zones/{id}, DELETE /api/zones/{id}
* GET /api/types-dechets, POST /api/types-dechets, GET /api/types-dechets/{id}, PUT /api/types-dechets/{id}, DELETE /api/types-dechets/{id}

## Écrans Frontend concernés

* Formulaire de signalement (liste des types de déchets)
* Administration (gestion des référentiels)

## Cas de test

* Nominal : citoyen lit les types de déchets → 200.
* Erreur : citoyen crée une zone → 403.

## Références

* Policies : `app/Policies/ZonePolicy.php`, `app/Policies/TypeDechetPolicy.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-DASH-001 — Heatmap des zones critiques

## Domaine

Statistiques

## Objectif

Fournir à l'admin une vue agrégée des signalements actifs par zone.

## Acteurs concernés

* Administrator

## Déclencheur

Appel à `GET /api/dashboard/heatmap`.

## Préconditions

* Admin authentifié (middleware `role:admin`).

## Règle métier

La requête agrège les signalements dont le statut est dans `statutsActifs()` (`valide`, `priorise`, `affecte`, `en_intervention`, `termine`) :

* groupés par `zone_id` ;
* avec `zone_nom` (MIN), `AVG(latitude)`, `AVG(longitude)`, `COUNT(*)` comme `weight` ;
* triés par poids décroissant.

Les signalements sans zone sont groupés sous `zone_id` nul. Aucune donnée personnelle n'est retournée.

## Cas d'échec

* Non authentifié → `401`.
* Agent ou citoyen → `403`.

## Résultat attendu

Série de points `{ zone_id, zone_nom, latitude, longitude, weight }` pour la carte.

## Exceptions métier

Aucune.

## Données concernées

* Signalement
* Zone

## Services / Controllers concernés

* DashboardService (`getHeatmapData`)
* DashboardController

## Endpoints concernés

* GET /api/dashboard/heatmap

## Écrans Frontend concernés

* Carte des zones critiques (Admin)

## Cas de test

* Nominal : admin → 200 avec agrégats.
* Erreur : agent → 403 ; non authentifié → 401.

## Références

* Controller : `app/Http/Controllers/Api/DashboardController.php`
* Repository : `app/Repositories/Eloquent/DashboardRepository.php`
* Enum : `app/Enums/SignalementStatutEnum.php` (`statutsActifs`)
* Tests : `tests/Feature/DashboardHeatmapApiTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-USR-001 — Administration des utilisateurs

## Domaine

Administration

## Objectif

Permettre à l'admin de gérer les comptes (agents, admins) via l'API.

## Acteurs concernés

* Administrator

## Déclencheur

Appels aux endpoints `users` (groupe sous middleware `role:admin`).

## Préconditions

* Admin authentifié.

## Règle métier

* Tous les verbes (`index`, `store`, `show`, `update`, `destroy`) sont réservés à l'admin (middleware `role:admin` + policies).
* Création : champs `nom`, `prenom`, `email`, `password` (+ `telephone`, `adresse`, `role` optionnels) ; rôle appliqué via `assignRole` (défaut `citizen` si absent).
* Mise à jour : rôle modifiable via `syncRoles` (un seul rôle).
* Suppression : `204`.

## Cas d'échec

* Agent ou citoyen → `403`.
* Email déjà utilisé → `422`.

## Résultat attendu

Gestion centralisée des comptes et des rôles.

## Exceptions métier

Aucune.

## Données concernées

* User
* model_has_roles

## Services / Controllers concernés

* UserController
* UserService

## Endpoints concernés

* GET /api/users, POST /api/users, GET /api/users/{id}, PUT /api/users/{id}, DELETE /api/users/{id}

## Écrans Frontend concernés

* Gestion des utilisateurs (Admin)

## Cas de test

* Nominal : admin crée un agent → 201 avec rôle `agent`.
* Erreur : agent accède à la liste → 403.

## Références

* Route : `routes/api.php` (middleware `role:admin`)
* Policy : `app/Policies/UserPolicy.php`
* Service : `app/Services/UserService.php`
* Tests : `tests/Feature/UserApiTest.php`, `tests/Feature/UserAuthorizationTest.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-USR-002 — Modification de son propre compte

## Domaine

Administration

## Objectif

Permettre à un utilisateur de modifier son propre profil.

## Acteurs concernés

* Citizen
* Agent
* Administrator

## Déclencheur

Appel à `PUT /api/users/{id}` sur son propre compte.

## Préconditions

* Utilisateur authentifié.

## Règle métier

SI l'utilisateur modifie son propre compte
ALORS la modification est autorisée (policy `update` : soi-même ou admin).
La modification du rôle reste réservée à l'admin (le DTO applique le rôle uniquement si fourni ; champ `role` non exigé pour un profil).

## Cas d'échec

* Utilisateur modifiant le compte d'autrui → `403`.

## Résultat attendu

Chaque utilisateur peut maintenir ses informations personnelles.

## Exceptions métier

Aucune.

## Données concernées

* User

## Services / Controllers concernés

* UserController
* UserService

## Endpoints concernés

* PUT /api/users/{id}

## Écrans Frontend concernés

* Mon profil

## Cas de test

* Nominal : utilisateur met à jour son nom → 200.
* Erreur : utilisateur met à jour le compte d'autrui → 403.

## Références

* Policy : `app/Policies/UserPolicy.php`

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-GAM-001 — Affichage du solde de points

## Domaine

Gamification

## Objectif

Garantir que le solde de points affiché au citoyen provient exclusivement du backend (source de vérité) et reste identique sur tous les écrans.

## Acteurs concernés

* Citoyen

## Déclencheur

Affichage de l'écran Points citoyen ou du composant d'affichage des points.

## Préconditions

* Citoyen authentifié.

## Règle métier

Le solde affiché est la valeur renvoyée par le backend via `GET /api/historique-points` (BR-PTS-002). Aucun calcul local du solde n'est effectué côté frontend : le composant d'affichage des points (CMP-005) reçoit le solde en entrée et se limite à l'afficher.

## Cas d'échec

* API indisponible → état de chargement/erreur affiché, jamais de solde calculé localement.

## Résultat attendu

Le solde affiché est toujours identique à celui du backend.

## Exceptions métier

Aucune.

## Données concernées

* Point (historique)

## Services / Controllers concernés

* HistoriquePointController (via l'API)

## Endpoints concernés

* GET /api/historique-points

## Écrans Frontend concernés

* SCR-015 Points citoyen — solde, historique, classement (`docs/02-design/screen-specifications/points.md`)
* CMP-005 Points display

## Cas de test

* Nominal : le backend renvoie un solde → le solde affiché correspond exactement.
* Erreur : API indisponible → écran en état d'erreur, aucun solde affiché.

## Références

* BR-PTS-001
* BR-PTS-002
* BR-INT-003

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-GAM-002 — Historique des transactions de points

## Domaine

Gamification

## Objectif

Afficher l'historique des gains et dépenses de points exactement tel que fourni par le backend.

## Acteurs concernés

* Citoyen

## Déclencheur

Consultation de l'historique sur l'écran Points citoyen.

## Préconditions

* Citoyen authentifié.

## Règle métier

L'historique affiché est la liste renvoyée par `GET /api/historique-points` (BR-PTS-002), sans filtre ni tri local. Les gains et les dépenses sont distingués visuellement mais proviennent des données brutes de l'API (aucune interprétation locale).

## Cas d'échec

* API indisponible → état de chargement/erreur affiché.

## Résultat attendu

L'historique affiché correspond ligne à ligne à celui du backend.

## Exceptions métier

Aucune.

## Données concernées

* Point (historique)

## Services / Controllers concernés

* HistoriquePointController (via l'API)

## Endpoints concernés

* GET /api/historique-points

## Écrans Frontend concernés

* SCR-015 Points citoyen — solde, historique, classement (`docs/02-design/screen-specifications/points.md`)

## Cas de test

* Nominal : le backend renvoie 5 entrées → 5 entrées affichées dans l'ordre reçu.

## Références

* BR-PTS-002

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-GAM-003 — Classement des citoyens

## Domaine

Gamification

## Objectif

N'afficher un classement des citoyens que s'il est fourni par le backend ; n'en construire aucun localement.

## Acteurs concernés

* Citoyen

## Déclencheur

Affichage de l'écran Points citoyen.

## Préconditions

* Citoyen authentifié.

## Règle métier

L'API n'expose pas d'endpoint de classement. En conséquence, l'écran Points citoyen n'affiche aucun classement ; si un endpoint dédié est ajouté ultérieurement, le classement affiché proviendra exclusivement de celui-ci.

## Cas d'échec

Sans objet.

## Résultat attendu

Aucun classement local ou dérivé n'est affiché tant que le backend n'en fournit pas.

## Exceptions métier

Aucune.

## Données concernées

Aucune.

## Services / Controllers concernés

Aucun.

## Endpoints concernés

Aucun (fonctionnalité en backlog backend).

## Écrans Frontend concernés

* SCR-015 Points citoyen — solde, historique, classement (`docs/02-design/screen-specifications/points.md`)

## Cas de test

* Nominal : aucun classement affiché en l'absence d'endpoint dédié.

## Références

* `docs/01-analysis/endpoints.md` (absence d'endpoint de classement)

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée

---

# BR-GAM-004 — Cohérence d'affichage du solde

## Domaine

Gamification

## Objectif

Garantir un affichage unique et cohérent du solde de points sur l'ensemble des écrans.

## Acteurs concernés

* Citoyen

## Déclencheur

Affichage du solde sur tout écran connecté (écran Points citoyen, composants d'en-tête, etc.).

## Préconditions

* Citoyen authentifié.

## Règle métier

Le solde est toujours affiché via le composant unique CMP-005 (Points display), qui reçoit la valeur du backend en entrée. Aucune duplication de la logique d'affichage ou de mise en forme du solde n'est autorisée dans les écrans.

## Cas d'échec

Sans objet.

## Résultat attendu

Le solde présente le même format et la même valeur sur tous les écrans.

## Exceptions métier

Aucune.

## Données concernées

* Point (historique)

## Services / Controllers concernés

* HistoriquePointController (via l'API)

## Endpoints concernés

* GET /api/historique-points

## Écrans Frontend concernés

* CMP-005 Points display
* Tous les écrans citant CMP-005

## Cas de test

* Nominal : le solde affiché par CMP-005 est identique sur l'écran Points citoyen et sur les autres occurrences du composant.

## Références

* BR-GAM-001
* BR-PTS-002

## Historique

Version : 1.0 — Auteur : Backend Analyst — Date : 2026-08-06

## Statut

Vérifiée
