# Réinitialiser les mots de passe des comptes E2E staging

Cette procédure applique un mot de passe temporaire commun aux huit comptes E2E isolés du projet Supabase staging `mlhbdautaxufubaybzyt`. Elle ne modifie ni les profils métier ni les rôles.

## Préparer le secret

Dans GitHub, ouvrir **Settings → Environments → staging → Environment secrets** et ajouter :

| Secret | Valeur |
|---|---|
| `STAGING_E2E_SHARED_PASSWORD` | Mot de passe temporaire choisi pour les huit comptes, 16 octets minimum |

Saisir le secret directement dans GitHub. Ne pas le mettre dans le dépôt, les variables publiques, les issues ou les messages. Le workflow n'imprime jamais sa valeur.

Les deux secrets déjà utilisés par l'E2E doivent également être présents dans l'environnement `staging` : `STAGING_SUPABASE_SECRET_KEY` et `STAGING_SUPABASE_ANON_KEY`.

## Lancer la réinitialisation

1. Ouvrir **Actions → Staging E2E Reset All Passwords**.
2. Choisir la branche `main`.
3. Choisir `RESET_ALL`, puis lancer le workflow.
4. Attendre la conclusion `success`. Le job met à jour les huit comptes explicitement autorisés puis vérifie une connexion Supabase Auth pour chacun.

Le workflow refuse toute autre branche, tout projet Supabase autre que le staging attendu, tout compte dépourvu du marqueur `app_metadata.isieco_seed`, et toute liste incomplète. Le choix par défaut est `NO`.

## Comptes disponibles

Le mot de passe temporaire est identique pour ces huit comptes :

| Rôle | Identifiant |
|---|---|
| Citoyen | `e2e.citoyen@staging.isieco.test` |
| Agent qualification | `e2e.agent-qualification@staging.isieco.test` |
| Responsable traitement | `e2e.responsable-traitement@staging.isieco.test` |
| Responsable affectation | `e2e.responsable-affectation@staging.isieco.test` |
| Agent terrain | `e2e.agent-terrain@staging.isieco.test` |
| Vérificateur clôture | `e2e.verificateur-cloture@staging.isieco.test` |
| Gestionnaire référentiel | `e2e.gestionnaire-referentiel@staging.isieco.test` |
| Administrateur comptes | `e2e.administrateur-comptes@staging.isieco.test` |

Ce mot de passe partagé est une facilité temporaire pour la recette staging, pas un modèle à reprendre en production. Pendant son utilisation, les prochains parcours E2E automatisés qui attendent les mots de passe propres à chaque rôle ne pourront pas s'authentifier.

**Après la recette**, rétablir les mots de passe distincts attendus par l'E2E :
1. Ouvrir **Actions → Staging E2E Test Users**.
2. Depuis `main`, choisir `CREATE` et lancer le workflow.
3. Ce workflow réattribue à chaque rôle son mot de passe dérivé de `STAGING_E2E_PASSWORD_SEED`, sans afficher les mots de passe.

Les secrets sensibles sont transmis uniquement aux étapes de validation et de réinitialisation, pas à l'installation des dépendances. Aucun mot de passe ni secret n'est écrit dans le dépôt ou les logs.
