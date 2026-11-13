# Réinitialiser les mots de passe des comptes E2E staging

Cette procédure rétablit les mots de passe dérivés du secret `STAGING_E2E_PASSWORD_SEED` pour les neuf comptes E2E isolés du projet Supabase staging `mlhbdautaxufubaybzyt`. Chaque compte possède un mot de passe propre ; les deux comptes citoyens ont des clés de dérivation distinctes. Aucun mot de passe n'est affiché.

## Secrets requis

Dans GitHub, ouvrir **Settings → Environments → staging → Environment secrets** et vérifier la présence de :

- `STAGING_SUPABASE_SECRET_KEY` : clé serveur Supabase staging.
- `STAGING_SUPABASE_ANON_KEY` : clé publique Supabase staging.
- `STAGING_E2E_PASSWORD_SEED` : secret aléatoire d'au moins 32 octets, identique à celui utilisé par le provisioning et le runner E2E.

Ne pas partager ni inscrire ces valeurs dans le dépôt, les issues ou les logs.

## Lancer la réinitialisation

1. Ouvrir **Actions → Staging E2E Reset All Passwords**.
2. Choisir la branche `main`.
3. Choisir `RESET_ALL`, puis lancer le workflow.
4. Vérifier que le job termine avec succès et confirme la connexion des neuf comptes.

Le workflow refuse toute autre branche, tout projet Supabase autre que le staging attendu, tout compte dépourvu du marqueur `app_metadata.isieco_seed`, et toute liste incomplète. Le choix par défaut est `NO`.

Les mots de passe sont dérivés par HMAC-SHA256 à partir du secret `STAGING_E2E_PASSWORD_SEED` et d'une clé propre à chaque compte. Le second citoyen utilise la clé `CITOYEN_SECONDARY`, distincte de celle du compte citoyen principal.

Aucun mot de passe partagé n'est introduit. Cette procédure ne modifie ni les profils métier ni les rôles, et ne touche pas à la production.
