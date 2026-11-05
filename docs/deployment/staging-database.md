# Initialisation de la base Supabase staging

## Projet cible

Le projet Supabase de staging est `isieco-report-staging` (`mlhbdautaxufubaybzyt`), région `eu-west-1`. Au contrôle du 5 novembre 2026, six migrations Prisma historiques étaient terminées et le schéma correspondait encore au modèle historique. Le jeu de données présent est un jeu de test déclaré jetable ; son contenu n'entre pas dans les critères de validation de la migration.

Le bucket privé `isieco-private-media` existe déjà, avec limite 10 MiB et types autorisés JPEG, PNG et WebP. Cette configuration Storage est distincte des migrations de la base métier.

## Pourquoi passer par Prisma Migrate

La source de vérité du schéma métier est `prisma/schema.prisma` et les migrations SQL versionnées dans `prisma/migrations/`. Les six premières migrations construisent l'ancien modèle de 38 tables ; la migration `20261105000000_simplified_domain_model` le transforme en 18 tables. L'historique d'application est conservé dans `_prisma_migrations`.

Ne pas copier les fichiers SQL dans le Dashboard Supabase et ne pas appeler manuellement `apply_migration` pour ce schéma : cela ne mettrait pas à jour l'historique `_prisma_migrations` de Prisma et rendrait le déploiement suivant incohérent.

La migration `20261031000000_supabase_business_data_api_lockdown` ajoute une protection importante pour Supabase : RLS sur les anciennes tables métier, puis sur les 18 tables du modèle simplifié, révocation des privilèges des rôles `anon`, `authenticated` et `service_role`, et suppression de leurs privilèges par défaut sur les futurs objets créés par le rôle de migration. La migration corrective `20261101000000_supabase_prisma_migration_history_lockdown` protège également `public._prisma_migrations`, que Prisma crée automatiquement avant d'appliquer les migrations versionnées : RLS y est activé et les privilèges des rôles Data API lui sont retirés. Les clients ISI-Eco ne consomment pas PostgreSQL directement ; ils passent par NestJS.

Cette protection est nécessaire car les privilèges par défaut observés sur le projet staging accordaient encore des droits aux rôles Data API sur les tables futures. La configuration réelle du projet prime sur les valeurs par défaut supposées.

## Connexion GitHub Actions

Le workflow `.github/workflows/staging-migrate.yml` applique uniquement les migrations déjà commitées. Il est manuel, limité à la branche `main`, protégé par deux choix explicites : `APPLY` et `YES` pour confirmer que les données du projet staging et son ancien schéma peuvent être supprimés ou transformés. Cette confirmation est limitée au staging et utilise l'environnement GitHub `staging`.

1. Dans GitHub, ouvrir **Settings → Environments** et créer l'environnement `staging`.
2. Ajouter dans **Environment secrets** le secret `STAGING_PRISMA_URL`.
3. Dans Supabase Dashboard, ouvrir le projet `isieco-report-staging`, cliquer sur **Connect**, puis sélectionner **Session pooler**.
4. Copier la chaîne PostgreSQL de session pooler (port **5432**, base `postgres`, utilisateur `postgres.mlhbdautaxufubaybzyt`) et ajouter `?sslmode=require` si ce paramètre n'est pas déjà présent.
5. Enregistrer cette chaîne comme secret GitHub `STAGING_PRISMA_URL`. Ne jamais la placer dans le dépôt, un commentaire de PR, un fichier client ou une sortie de terminal.
6. Dans **Actions → Staging Database Migrate → Run workflow**, choisir la branche `main`, `APPLY`, puis `YES` uniquement après avoir accepté explicitement la suppression/transformation des données existantes du projet `isieco-report-staging`.

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

- les 18 tables métier attendues dans le schéma `public` ;
- les sept entrées de migration dans `_prisma_migrations` ;
- RLS activé sur les 18 tables métier et sur `public._prisma_migrations` ;
- aucun privilège direct `SELECT/INSERT/UPDATE/DELETE` pour `anon`, `authenticated` et `service_role` sur les tables métier ou sur `public._prisma_migrations` ;
- absence de privilèges par défaut accordés à ces rôles sur les futures tables, séquences et fonctions.

Le Security Advisor doit être relancé après l'application. Les tests d'API et d'upload ne doivent commencer qu'après configuration des variables serveur, notamment `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` et une valeur approuvée pour `MEDIA_RETENTION_DAYS`.

## Sécurité et exploitation

- Ne pas accorder de droits `anon` ou `authenticated` sur les tables métier pour contourner l'API NestJS.
- Ne pas ajouter de policy RLS permissive « pour que le client fonctionne » ; les clients ne doivent pas lire ou écrire ces tables via PostgREST.
- Ne pas activer les déploiements Vercel/Render de production dans le cadre de cette opération.
- Les migrations Prisma sont versionnées et immuables après application. La migration simplifiée est destructive : elle supprime des tables et colonnes historiques et ne possède pas de rollback automatique. Pour corriger un problème après déploiement, préparer une migration corrective ; ne pas supprimer ou modifier les migrations déjà appliquées.
- Le staging contient un jeu de données de test déclaré jetable ; la confirmation `YES` autorise explicitement sa perte ou sa transformation.


## Sauvegarde facultative et retour arrière

La migration simplifiée supprime les anciennes tables et colonnes d'historique. Elle ne dispose pas d'un rollback permettant de restaurer les lignes supprimées. Les données du staging ont été déclarées jetables : une sauvegarde restaurable n'est donc pas une précondition fonctionnelle pour ce projet. La migration reste destructive et la confirmation `YES` signifie que les données existantes du staging peuvent être perdues ou transformées. Une exportation hors site reste recommandée pour toute possibilité de retour arrière ; le test CI sur données synthétiques ne remplace pas une vraie sauvegarde.
## Export manuel et test de restauration sur l'offre Free

Le projet connecté est sur l'offre Free. Supabase ne fournit pas de sauvegarde quotidienne gérée sur cette offre ; la documentation recommande les exports logiques via Supabase CLI et leur conservation hors site. Références officielles : [Database Backups](https://supabase.com/docs/guides/platform/backups) et [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

Installer Supabase CLI **v3** et Docker. Depuis un répertoire de travail temporaire (pas le dépôt applicatif), initialiser et lier explicitement le projet staging. La CLI v3 cible les bases distantes avec `--remote` ; ne pas dépendre de son ancien comportement par défaut :

```bash
umask 077
BACKUP_DIR="$(pwd)/.backups/isieco-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 -p "$BACKUP_DIR"
BACKUP_WORKDIR="$(mktemp -d)"
trap 'rm -rf "$BACKUP_WORKDIR"' EXIT

(
  cd "$BACKUP_WORKDIR"
  supabase init
  supabase login
  supabase link --project-ref mlhbdautaxufubaybzyt

  supabase db dump --remote -f "$BACKUP_DIR/roles.sql" --role-only
  supabase db dump --remote -f "$BACKUP_DIR/schema.sql"
  supabase db dump --remote -f "$BACKUP_DIR/data.sql" --use-copy --data-only \
    -x "storage.buckets_vectors" -x "storage.vector_indexes"
)
(
  cd "$BACKUP_DIR"
  sha256sum roles.sql schema.sql data.sql > SHA256SUMS
  sha256sum --check SHA256SUMS
)
```

Conserver le dossier hors du dépôt dans un espace chiffré à accès restreint. Le chemin .backups/ est ignoré par Git. La commande Supabase CLI exclut les schémas gérés `auth`, `storage` et les schémas d'extensions. Les comptes Supabase Auth, les paramètres/policies personnalisés du Storage et les objets binaires ne sont donc pas restaurés par ces trois dumps. Ils doivent être traités séparément si une restauration applicative intégrale est nécessaire. Pour la répétition de la migration métier, le dump `public` contient en revanche les tables relationnelles historiques visées.

Tester la restauration du schéma métier dans une **base PostgreSQL isolée** (locale ou projet Supabase distinct), jamais sur le staging source. Le dump CLI exclut les schémas gérés `auth`, `storage` et les schémas d’extensions ; le test du schéma `public` peut donc utiliser des identifiants synthétiques. Configurer préalablement les extensions nécessaires. Le contrôle du 5 novembre 2026 a trouvé le schéma `vault` mais aucune entrée dans `vault.secrets`, et l’extension `pgsodium` n’est pas activée. Restaurer les rôles, le schéma et les données avec la procédure officielle :

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$BACKUP_DIR/roles.sql" \
  --file "$BACKUP_DIR/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$BACKUP_DIR/data.sql" \
  --dbname "$RESTORE_DB_URL"
```

La commande `SET session_replication_role = replica` désactive les triggers pendant l'import ; elle fait partie de la procédure Supabase et doit être utilisée uniquement sur la base isolée de restauration. Pour un projet utilisant le chiffrement de colonnes, suivre en plus la variante officielle qui transfère la clé racine de chiffrement. Un export n'est pas un backup validé tant que les checksums et une restauration complète du périmètre visé n'ont pas été vérifiés. Les comptes Supabase Auth, les paramètres/policies Storage et les objets Storage ne sont pas rétablis par ces seuls dumps PostgreSQL.

Après restauration, vérifier que les **six migrations historiques** sont présentes et terminées dans `public._prisma_migrations`. Si l'historique manque ou diffère, arrêter ici : ne pas lancer `migrate deploy` sur un schéma déjà créé sans avoir réconcilié l'historique.

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM public._prisma_migrations
ORDER BY migration_name;
```

Depuis une révision du dépôt contenant `20261105000000_simplified_domain_model`, appliquer la migration uniquement à cette copie isolée :

```bash
export DATABASE_URL="$RESTORE_DB_URL"
export DIRECT_URL="$RESTORE_DB_URL"
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm exec prisma migrate status
TEST_DATABASE_URL="$RESTORE_DB_URL" pnpm db:test:invariants
```

Le résultat attendu est **7 migrations terminées** : les six historiques et la migration de simplification. Le test d'invariants vérifie les 18 tables, RLS et plusieurs contraintes relationnelles dans une transaction annulée à la fin. Comparer et conserver les inventaires de lignes avant/après ; analyser séparément les transformations explicitement documentées (qualification la plus récente, rattachement actif, réponses, vérifications non appariées et événements de statut).

Le workflow staging demande deux confirmations : APPLY et YES pour attester que le schéma historique et les données du projet staging peuvent être supprimés ou transformés. La confirmation est limitée au projet `mlhbdautaxufubaybzyt`. Elle n'autorise aucune opération sur la production.
