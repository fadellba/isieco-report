# Réinitialiser les mots de passe des comptes E2E staging

Cette procédure restaure les mots de passe déterministes attendus par le parcours E2E pour les neuf identités isolées du projet Supabase staging `mlhbdautaxufubaybzyt`. Les deux comptes citoyens ont des mots de passe distincts : `CITOYEN` pour le principal et `CITOYEN_SECONDARY` pour le second. Leurs identités Auth et profils métier restent distincts.

## Secret utilisé

Le workflow utilise le secret existant `STAGING_E2E_PASSWORD_SEED` dans **Settings → Environments → staging → Environment secrets**. Il doit contenir au moins 32 octets. C'est le même secret que celui déjà utilisé par le workflow de provisionnement et le parcours E2E.

Aucun mot de passe n'est affiché. Le secret n'est jamais écrit dans le dépôt ou les logs. Le secret historique `STAGING_E2E_SHARED_PASSWORD` n'est plus nécessaire à cette procédure.

## Lancer la réinitialisation

1. Ouvrir **Actions → Staging E2E Reset All Passwords**.
2. Choisir la branche `main`.
3. Choisir `RESET_ALL`, puis lancer le workflow.
4. Attendre la conclusion `success`. Le job met à jour les neuf comptes explicitement autorisés puis vérifie une connexion Supabase Auth pour chacun avec le mot de passe dérivé de sa clé de compte.

Le workflow refuse toute autre branche, tout projet Supabase autre que le staging attendu, tout compte dépourvu du marqueur `app_metadata.isieco_seed`, et toute liste incomplète. Le choix par défaut est `NO`.

## Comptes disponibles

| Rôle | Identifiant |
|---|---|
| Citoyen principal | `e2e.citoyen@staging.isieco.test` |
| Citoyen secondaire, pour les tests d'isolation inter-utilisateurs | `e2e.citoyen-secondaire@staging.isieco.test` |
| Agent qualification | `e2e.agent-qualification@staging.isieco.test` |
| Responsable traitement | `e2e.responsable-traitement@staging.isieco.test` |
| Responsable affectation | `e2e.responsable-affectation@staging.isieco.test` |
| Agent terrain | `e2e.agent-terrain@staging.isieco.test` |
| Vérificateur clôture | `e2e.verificateur-cloture@staging.isieco.test` |
| Gestionnaire référentiel | `e2e.gestionnaire-referentiel@staging.isieco.test` |
| Administrateur comptes | `e2e.administrateur-comptes@staging.isieco.test` |

Le compte citoyen secondaire utilise la clé `CITOYEN_SECONDARY`, les autres comptes utilisent leur code rôle. Après un changement temporaire de mot de passe, relancer ce workflow pour restaurer les identifiants dérivés attendus par l'E2E. Le workflow de provisionnement **Staging E2E Test Users** utilise le même secret et peut également remettre les neuf comptes dans cet état.
