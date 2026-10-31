# Initialisation de la base Supabase staging

## Projet cible

Le projet Supabase de staging est `isieco-report-staging` (`mlhbdautaxufubaybzyt`), région `eu-west-1`. Le projet a été vérifié le 31 octobre 2026 : la base métier était vierge et aucune migration Prisma n'était enregistrée.

Le bucket privé `isieco-private-media` existe déjà, avec limite 10 MiB et types autorisés JPEG, PNG et WebP. Cette configuration Storage est distincte des migrations de la base métier.

## Pourquoi passer par Prisma Migrate

La source de vérité du schéma métier est `prisma/schema.prisma` et les cinq migrations SQL versionnées dans `prisma/migrations/`. L'historique d'application est conservé dans `_prisma_migrations`.

Ne pas copier les fichiers SQL dans le Dashboard Supabase et ne pas appeler manuellement `apply_migration` pour ce schéma : cela ne mettrait pas à jour l'historique `_prisma_migrations` de Prisma et rendrait le déploiement suivant incohérent.

La migration `20261031000000_supabase_business_data_api_lockdown` ajoute également une protection importante pour Supabase : RLS sur les 38 tables métier, révocation des privilèges des rôles `anon`, `authenticated` et `service_role`, et suppression de leurs privilèges par défaut sur les futurs objets du schéma `public`. Les clients ISI-Eco ne consomment pas PostgreSQL directement ; ils passent par NestJS.

Cette protection est nécessaire car les privilèges par défaut observés sur le projet staging accordaient encore des droits aux rôles Data API sur les tables futures. La configuration réelle du projet prime sur les valeurs par défaut supposées.

## Connexion GitHub Actions

Le workflow `.github/workflows/staging-migrate.yml` applique uniquement les migrations déjà commitées. Il est manuel, limité à la branche `main`, protégé par un choix explicite `APPLY` et utilise l'environnement GitHub `staging`.

1. Dans GitHub, ouvrir **Settings → Environments** et créer l'environnement `staging`.
2. Ajouter dans **Environment secrets** le secret `STAGING_PRISMA_URL`.
3. Dans Supabase Dashboard, ouvrir le projet `isieco-report-staging`, cliquer sur **Connect**, puis sélectionner **Session pooler**.
4. Copier la chaîne PostgreSQL de session pooler (port **5432**, base `postgres`, utilisateur `postgres.mlhbdautaxufubaybzyt`) et ajouter `?sslmode=require` si ce paramètre n'est pas déjà présent.
5. Enregistrer cette chaîne comme secret GitHub `STAGING_PRISMA_URL`. Ne jamais la placer dans le dépôt, un commentaire de PR, un fichier client ou une sortie de terminal.
6. Dans **Actions → Staging Database Migrate → Run workflow**, choisir la branche `main`, puis `APPLY`.

Le workflow vérifie le projet cible à partir du hostname, du port, du nom de base et de l'utilisateur avant de se connecter. Il refuse le pooler transactionnel (port 6543) et ne peut pas être utilisé depuis une branche de fonctionnalité.

Le pooler Session est retenu parce que les runners GitHub Actions sont IPv4 ; les connexions directes Supabase sont généralement IPv6. Le port 5432 du pooler Session est adapté aux opérations Prisma Migrate. Ne pas utiliser le pooler transactionnel 6543 pour cette opération.

## Vérification après exécution

Le workflow exécute :

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm exec prisma migrate status
```

Après réussite, vérifier dans Supabase :

- les 38 tables métier attendues dans le schéma `public` ;
- les cinq entrées de migration dans `_prisma_migrations` ;
- RLS activé sur les 38 tables ;
- aucun privilège direct `SELECT/INSERT/UPDATE/DELETE` pour `anon`, `authenticated` et `service_role` sur les tables métier ;
- absence de privilèges par défaut accordés à ces rôles sur les futures tables, séquences et fonctions.

Le Security Advisor doit être relancé après l'application. Les tests d'API et d'upload ne doivent commencer qu'après configuration des variables serveur, notamment `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` et une valeur approuvée pour `MEDIA_RETENTION_DAYS`.

## Sécurité et exploitation

- Ne pas accorder de droits `anon` ou `authenticated` sur les tables métier pour contourner l'API NestJS.
- Ne pas ajouter de policy RLS permissive « pour que le client fonctionne » ; les clients ne doivent pas lire ou écrire ces tables via PostgREST.
- Ne pas activer les déploiements Vercel/Render de production dans le cadre de cette opération.
- Les migrations Prisma sont additives et versionnées. Pour corriger un problème après déploiement, préparer une migration corrective ; ne pas supprimer ou modifier les migrations déjà appliquées.
- Pour une base staging déjà utilisée, sauvegarder et vérifier les données avant toute migration. Le constat de base vierge date du 31 octobre 2026 et doit être confirmé au moment de l'exécution.
