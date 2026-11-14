# Initialisation de la base Supabase staging

## Projet cible

Le projet Supabase de staging est `isieco-report-staging` (`mlhbdautaxufubaybzyt`), région `eu-west-1`. Le 6 novembre 2026, le workflow [#42136250612](https://github.com/fadellba/isieco-report/actions/runs/42136250612) a d'abord appliqué la septième migration `20261105000000_simplified_domain_model` après les six migrations historiques. Les migrations additives suivantes ont ensuite porté l'historique staging à 11 migrations Prisma : création du ledger `audit.evenement_metier`, extension des cibles d'audit, index FK et alignement Prisma. Le registre des livrables du 7 novembre rapporte `prisma migrate status` à jour. Le modèle comprend 18 tables métier dans public, le ledger dans audit et la table de métadonnées `_prisma_migrations`. Le jeu de données de staging reste déclaré jetable.

### État des migrations vérifié le 14 novembre 2026

Le dépôt contient **14 migrations**. Le staging enregistre encore 11 migrations ; les trois migrations suivantes sont présentes dans Git mais restent à appliquer :

- `20261109100000_business_audit_event_order`
- `20261109110000_backfill_business_audit_event_sequence_order`
- `20261113215000_command_center_event_notifications`

Le workflow [Staging Forward Deploy #43516567399](https://github.com/fadellba/isieco-report/actions/runs/43516567399) s'est arrêté à `prisma migrate status`, avant Render, readiness et E2E. Aucun déploiement staging sur cette révision et aucune activation du trigger SSE ne doivent être déduits de ce run. L'application des migrations reste une action manuelle via **Staging Database Migrate** sur `main), avec les sélections explicites `APPLY` et `YES`. Ne pas contourner cette porte.

Avant l'application, produire et vérifier une sauvegarde PostgreSQL datée et une sauvegarde distincte des objets Storage, puis restaurer chacune dans une cible isolée. Le workflow de répétition actuel copie la source staging active et mesure un proxy de RTO ; il ne prouve pas la restauration d'un snapshot historique et ne mesure pas le RPO. Cette distinction doit rester explicite dans la décision d'exploitation.

Après validation de la sauvegarde indépendante et approbation de l'opération, exécuter le workflow de migration, confirmer `prisma migrate status` à jour, contrôler RLS/privilèges/triggers, puis relancer le déploiement staging sur la révision exacte et exécuter les smoke tests et E2E. Aucune étape ne doit cibler la production.

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

### Résultat vérifié le 6 novembre 2026

Le run [#42136250612](https://github.com/fadellba/isieco-report/actions/runs/42136250612) a réussi sur `main`. Les logs montrent l'application de `20261105000000_simplified_domain_model`, puis `Database schema is up to date!`.

Un contrôle SQL en lecture seule confirme :

- 18 tables métier dans `public`, `public._prisma_migrations` et `audit.evenement_metier` dans le schéma `audit` ;
- 11 migrations Prisma terminées, aucune migration annulée selon le registre de livrables du 7 novembre ;
- RLS activé sur les 20 tables observées (18 métier + métadonnées Prisma + ledger d'audit) ;
- aucune policy RLS permissive et aucun privilège direct de table pour `anon`, `authenticated` ou `service_role` sur ces tables ;
- les rôles Data API ne peuvent donc pas accéder directement au modèle métier ; les opérations restent exclusivement derrière NestJS.

Le lint « RLS enabled without policy » est attendu sur les tables verrouillées par privilèges : ne pas ajouter de policy permissive pour faire disparaître cet avis. Le registre indique que les 15 index FK manquants ont été ajoutés par `20261106150000_foreign_key_indexes` ; l'ancien constat d'Advisor est donc historique et doit être réexécuté avant d'en tirer une conclusion actuelle. La protection des mots de passe compromis était signalée désactivée (WARN) dans le dernier contrôle documenté ; revérifier ce réglage avant production. Les index signalés comme inutilisés ne doivent pas être supprimés sur la seule base d'un staging encore peu sollicité.

Les tests d'API et d'upload nécessitent les variables runtime serveur : `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET` et `MEDIA_RETENTION_DAYS=365`. Pour le runner E2E qui ouvre Prisma directement depuis GitHub Actions, le secret `STAGING_SUPABASE_CA_CERT` fournit le certificat CA Supabase avec vérification TLS stricte (`rejectUnauthorized=true`). Le run [#42319641856](https://github.com/fadellba/isieco-report/actions/runs/42319641856) a validé le déploiement Render exact, la readiness DB, les smoke tests et le cycle réel d'upload privé, URL signée de 60 secondes, expiration à 365 jours et purge ciblée. Le workflow planifié de purge quotidienne à 02:15 UTC reste à observer séparément.

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


## Export et restauration Storage séparés (offre Free)

Le dump logique PostgreSQL ne contient pas les objets binaires Supabase Storage. Sur l'offre Free, les objets peuvent être exportés séparément sans activer de sauvegarde managée payante : utiliser `supabase storage ls` pour inventorier puis `supabase storage cp` pour copier les fichiers, ou un client S3 compatible si le protocole S3 est activé sur le bucket. La [documentation Supabase Download Objects](https://supabase.com/docs/guides/storage/management/download-objects) détaille les options disponibles.

Pour ISI-Eco, limiter l'export au bucket privé `isieco-private-media`, conserver les chemins relatifs et calculer un SHA-256 pour chaque objet. Conserver le manifeste en dehors du dépôt et dans un emplacement protégé. Restaurer les binaires dans le bucket privé cible via l'API Storage/CLI, pas par insertion directe dans `storage.objects`. Contrôler ensuite chaque ligne photo métier : l'objet correspondant doit exister, le bucket doit rester privé et les URLs signées doivent être régénérées à la demande (ne jamais restaurer ou conserver des URLs signées).

Cette opération manuelle PostgreSQL + Storage constitue la voie de reprise actuelle sans frais d'abonnement. Les sauvegardes quotidiennes gérées (Pro+) et PITR (option payante) restent différées. Le périmètre et les limites sont récapitulés dans [Périmètre gratuit et reports liés aux coûts](perimetre-offre-gratuite.md).