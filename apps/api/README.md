# API — NestJS

Backend modulaire d’ISI-Eco Report. L’API REST est préfixée par `/api/v1`.

## Configuration

L’API valide sa configuration au démarrage et échoue immédiatement si une variable obligatoire ou une URL est invalide. Les valeurs sensibles ne sont jamais incluses dans les messages de validation.

Variables obligatoires :

- `DATABASE_URL` : URL PostgreSQL utilisée par Prisma ;
- `SUPABASE_URL` : URL HTTP(S) du projet Supabase ;
- `SUPABASE_ANON_KEY` : clé publique/anon du projet, utilisée uniquement côté serveur pour valider les sessions.

Variables facultatives :

- `DIRECT_URL` : URL PostgreSQL directe pour les opérations Prisma ;
- `SHADOW_DATABASE_URL` : URL d'une base PostgreSQL shadow séparée ;
- `PORT` : port HTTP, compris entre 1 et 65535 (3000 par défaut) ;
- `WEB_ORIGIN` : liste d’origines HTTP(S) autorisées, séparées par des virgules ;
- `NODE_ENV` : `development`, `test` ou `production` ;
- `SUPABASE_SECRET_KEY` : secret API réservé au serveur, facultatif tant que Storage n'est pas activé ;
- `SUPABASE_STORAGE_BUCKET` : bucket Storage privé (par défaut `isieco-private-media`) ;
- `MEDIA_RETENTION_DAYS` : durée métier validée, entier entre 1 et 3650 ; sans cette valeur, l'upload photo est refusé.

Ne jamais copier `SUPABASE_SECRET_KEY` dans les variables `VITE_*` ou `EXPO_PUBLIC_*), ni l'inclure dans un bundle, un log ou un artefact CI. Ne pas utiliser de clé Supabase privilégiée dans les clients.

## Documentation OpenAPI

- Swagger UI : `http://localhost:3000/docs` ;
- Spécification JSON : `http://localhost:3000/docs-json` ;
- Génération du document local : `pnpm api:openapi` depuis la racine du monorepo.

Les endpoints doivent décrire les paramètres, DTO, réponses, erreurs, mécanismes d’authentification et habilitations avec les décorateurs `@nestjs/swagger`. Voir [`docs/api/README.md`](../../docs/api/README.md).

## Commandes

Depuis la racine :

```bash
pnpm dev:api
pnpm api:openapi
pnpm storage:purge
pnpm --filter @isieco/api test
TEST_DATABASE_URL="postgresql://isieco:isieco_dev_password@localhost:5432/isieco_report" pnpm db:test:invariants
```

Le client Prisma doit être généré. Préparer le dépôt avec `pnpm install` puis `pnpm db:generate`. Démarrer PostgreSQL local et la base shadow avec `docker compose up -d postgres postgres-shadow`.

## Comptes et habilitations

Le module Accounts provisionne uniquement le rôle `CITOYEN` lors de l'initialisation publique d'un profil Supabase confirmé. Les attributions/révocations administratives sont réservées au rôle `ADMINISTRATEUR_COMPTES`, sérialisées côté PostgreSQL et journalisées dans `EvenementMetier` au sein de la même transaction. La révocation du dernier administrateur actif est refusée.

## Référentiels

Le module Referentials expose les types de déchets, les subdivisions géographiques, les équipes, leurs appartenances, compétences, disponibilités et délégations. L'administration est réservée au rôle `GESTIONNAIRE_REFERENTIEL`. Les relations temporelles sont préservées, les mutations sensibles sont auditées dans la transaction et les références géographiques ne sont jamais supprimées physiquement. Voir [le guide Referentials](src/modules/referentials/README.md).

## Modules métier intégrés

- Accounts : profils, comptes et rôles avec audit transactionnel.
- Referentials : types de déchets, géographie, équipes, appartenances, compétences, disponibilité et délégations.
- Reports : soumission idempotente, suivi citoyen, compléments et médias (upload privé en phase 10).
- Qualification : file, compléments, acceptation et rejet motivé.
- Cases : création de dossiers, rattachements et historiques de priorité/localisation.
- Assignments : affectation, acceptation/refus et réaffectation idempotente.
- Interventions : démarrage, compte rendu, exceptions et preuves photo.
- Verification : décision indépendante, reprise et clôture contrôlée.

Audit expose `GET /api/v1/audit/me` pour l'historique personnel (acteur ou compte cible) et `GET /api/v1/audit/accounts/:idUtilisateur/roles` pour l'historique des rôles, réservé à `ADMINISTRATEUR_COMPTES`. Les réponses sont paginées et filtrables ; snapshots JSON, motifs libres et données de destinataire sont exclus. Aucun endpoint global ni export n'est fourni. Cette API est sur la branche Phase 11 en attente de CI.

## Stockage privé des médias

Les routes de dépôt sont `POST /api/v1/reports/:id/photos` et `POST /api/v1/interventions/:idIntervention/photos`, en multipart/form-data avec le champ `file`. Les fichiers sont limités à 10 MiB et aux signatures JPEG, PNG ou WebP. Les métadonnées sont conservées dans les modèles photo existants. Les clients ne reçoivent jamais les chemins Storage.

Les liens temporaires sont délivrés par `GET /api/v1/reports/:id/photos/:photoId/url` et `GET /api/v1/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url`. Ils expirent après 60 secondes et sont précédés d'un contrôle de propriété/droit métier. Voir [la procédure Storage](../../docs/storage/README.md).

La commande `pnpm storage:purge` supprime les objets dont la période de conservation est échue, conserve les lignes photo pour l'historique, renseigne `mediaPurgeAt` et écrit l'événement de purge. Elle traite au maximum 100 photos par type et doit être appelée par un job Cron externe. Voir [la procédure Storage](../../docs/storage/README.md).

Les interfaces de dépôt et de consultation dans Web/Mobile, le bucket distant et la planification du job Cron restent à configurer/réaliser.
