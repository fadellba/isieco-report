# Réinitialiser les mots de passe des comptes E2E staging

Cette procédure rétablit les mots de passe pour les comptes E2E isolés du projet Supabase staging `mlhbdautaxufubaybzyt` (y compris le compte superadmin multi-rôles).

Il supporte :
- Soit un **mot de passe unique commun** pour tous les comptes de test (renseigné lors du déclenchement du workflow dans `common_password` ou via le secret `STAGING_COMMON_PASSWORD`),
- Soit les mots de passe dérivés par HMAC-SHA256 à partir du secret `STAGING_E2E_PASSWORD_SEED` (si `common_password` est laissé vide).

## Secrets requis

Dans GitHub, ouvrir **Settings → Environments → staging → Environment secrets** et vérifier la présence de :

- `STAGING_SUPABASE_SECRET_KEY` : clé serveur Supabase staging.
- `STAGING_SUPABASE_ANON_KEY` : clé publique Supabase staging.
- `STAGING_E2E_PASSWORD_SEED` : secret aléatoire d'au moins 32 octets (requis seulement si un mot de passe commun n'est pas utilisé).
- `STAGING_COMMON_PASSWORD` : *(optionnel)* mot de passe commun par défaut (ex. `IsiEco2026!Test`).

Ne pas partager ni inscrire ces valeurs dans le dépôt, les issues ou les logs.

## Lancer la réinitialisation

1. Ouvrir **Actions → Staging E2E Reset All Passwords**.
2. Choisir la branche `main`.
3. Choisir `RESET_ALL` pour `reset_all_passwords`.
4. *(Optionnel)* Saisir un mot de passe commun dans le champ `common_password` (ex: `IsiEco2026!Test`).
5. Lancer le workflow et vérifier que le job termine avec succès et confirme la connexion de l'ensemble des comptes de test.
