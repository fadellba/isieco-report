# Module Assignments

Affectation et réaffectation des contenus de dossier aux équipes compétentes.

## Invariants

- Le contenu doit être actif, en attente de prise en charge et appartenir à un dossier non clôturé.
- L’équipe doit être active et disposer d’une compétence valide pour le type de déchet concerné.
- Une disponibilité courante explicitement marquée `INDISPONIBLE` bloque une nouvelle affectation ; une disponibilité expirée n’est pas interprétée comme une indisponibilité.
- PostgreSQL empêche deux affectations ouvertes pour la même paire dossier/catégorie.
- La création et la réaffectation sont idempotentes grâce à `Idempotency-Key`, stockée sous forme de condensat SHA-256 dans `referenceOperationUnique`.
- Seul un membre dont l’appartenance à l’équipe est active peut répondre. Le refus est motivé et clôt l’affectation ; l’acceptation passe le contenu à `EN_COURS`.
- Les actions et changements de décision écrivent un événement `EvenementMetier` ciblant l’affectation dans la même transaction sérialisable.

## Routes API

Toutes les routes sont préfixées par `/api/v1`, utilisent Supabase Auth et les rôles vérifiés par l’API.

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| GET | `/assignments` | RESPONSABLE_AFFECTATION | Liste filtrable et paginée |
| GET | `/assignments/pending-contents` | RESPONSABLE_AFFECTATION | Contenus actifs, en attente, dans un dossier non clôturé et sans affectation active ; pagination `page` / `pageSize` |
| GET | `/assignments/eligible-teams/:idTypeDechet` | RESPONSABLE_AFFECTATION | Équipes actives avec compétence courante valide ; une indisponibilité courante explicite les exclut |
| POST | `/assignments` | RESPONSABLE_AFFECTATION | Affecte un contenu à une équipe compétente |
| GET | `/assignments/team/:idEquipe` | AGENT_TERRAIN + appartenance active | Consulte les affectations ouvertes de son équipe |
| POST | `/assignments/:idAffectation/response` | AGENT_TERRAIN + appartenance active | Accepte ou refuse avec motif |
| POST | `/assignments/:idAffectation/reassign` | RESPONSABLE_AFFECTATION | Annule une affectation en attente ou remplace une affectation refusée |

Les routes de découverte ne sont qu'une aide à la sélection : le backend revalide toujours le contenu, l'équipe, la compétence, la disponibilité et l'unicité dans la transaction de création/réaffectation.

Les créations et réaffectations exigent un en-tête `Idempotency-Key` de 8 à 128 caractères. Une affectation déjà acceptée ou ayant une intervention n’est pas réaffectable par ce parcours.

## Limites de cette tranche

Le module ne démarre pas d’intervention et ne clôture pas de dossier. La saisie de mission, les preuves et les photos sont traitées par les phases Interventions et Vérification.
