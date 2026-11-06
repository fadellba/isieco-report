# Module Referentials

Gestion des référentiels opérationnels par le rôle `GESTIONNAIRE_REFERENTIEL`.

## Fonctionnalités effectivement exposées

- Types de déchets : liste, création et modification du libellé, de la description et de l'état actif.
- Équipes : liste, création et modification du nom, de la description et de l'état.
- Appartenances : ajout d'un compte actif à une équipe et clôture d'une période d'appartenance.
- Compétences : ajout, réactivation et désactivation d'une compétence équipe/type de déchet.

Les mutations écrivent un événement dans `audit.evenement_metier` dans la même transaction que la modification. Les cibles sont `REFERENTIEL`, `EQUIPE`, `APPARTENANCE` et `COMPETENCE`. Les événements ne stockent pas les coordonnées, e-mails, motifs libres ou données sensibles.

## Routes API

Toutes les routes sont préfixées par `/api/v1`, authentifiées par Supabase Auth et protégées par le rôle serveur `GESTIONNAIRE_REFERENTIEL`.

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/referentials/waste-types` | Liste les types de déchets ; `includeInactive=true` inclut les inactifs |
| POST | `/referentials/waste-types` | Crée un type de déchet |
| PATCH | `/referentials/waste-types/:id` | Modifie un type de déchet |
| GET | `/referentials/teams` | Liste équipes, membres actifs et compétences actives |
| POST | `/referentials/teams` | Crée une équipe |
| PATCH | `/referentials/teams/:teamId` | Modifie une équipe |
| POST | `/referentials/teams/:teamId/memberships` | Ajoute une appartenance |
| POST | `/referentials/teams/:teamId/memberships/close` | Termine une appartenance |
| POST | `/referentials/teams/:teamId/skills` | Ajoute ou réactive une compétence |
| POST | `/referentials/teams/:teamId/skills/close` | Désactive une compétence |

## Limites du modèle simplifié

Les routes de géographie, d'indisponibilité/calendrier d'équipe et de délégation ne sont pas exposées par cette version du modèle simplifié. Les documents historiques qui les décrivent comme livrées sont obsolètes. La sélection d'équipes affectables repose sur l'équipe active et la compétence active ; elle ne dépend pas d'un calendrier d'indisponibilité.
