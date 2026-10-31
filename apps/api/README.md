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

Ne jamais copier `SUPABASE_SECRET_KEY` dans les variables `VITE_*` ou `EXPO_PUBLIC_*`, ni l'inclure dans un bundle, un log ou un artefact CI. Ne pas utiliser de clé Supabase privilégiée dans les clients.

## Documentation OpenAPI

- Swagger UI : `http://localhost:3000/docs` ;
- Spécification JSON : `http://localhost:3000/docs-json` ;
- Génération du document local : `pnpm api:openapi` depuis la racine du monorepo.

Les endpoints doivent décrire les paramètres, DTO, réponses, erreurs, mécanismes d’authentification et habilitations avec les décorateurs `@nestjs/swagger`. Voir [docs/api/README.md](../../docs/api/README.md).

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

## Modules métier intégrés

- Accounts : profils, provisionnement citoyen, administration des rôles et protection du dernier administrateur actif.
- Referentials : types de déchets, géographie, équipes, appartenances, compétences, disponibilité, délégations et audit transactionnel.
- Reports : soumission idempotente, suivi propriétaire, compléments et médias privés.
- Qualification : file, compléments, acceptation, rejet motivé et accès temporaire aux photos de la file.
- Cases : création, rattachements/détachements, priorité et localisation historisées ; file des signalements qualifiés non rattachés.
- Assignments : découverte des contenus affectables et équipes éligibles, affectation idempotente, contrôle compétence/disponibilité, réponse d'équipe et réaffectation.
- Interventions : démarrage, compte rendu, exceptions et preuves photo privées.
- Verification : vérification indépendante, reprise et clôture contrôlée.
- Audit : journal personnel et historique ciblé des rôles réservé à l'administration des comptes.

L'API Audit est intégrée dans main (PR #16). Elle n'expose ni listing global ni export. Les snapshots JSON, motifs libres, destinataires externes et identifiants de corrélation sont exclus des réponses.

## Découverte des affectations

Le module expose deux lectures réservées à `RESPONSABLE_AFFECTATION` afin d'alimenter le back-office sans ouvrir les routes Cases ou Referentials à ce rôle :

- `GET /api/v1/assignments/pending-contents` : contenus `ACTIF`, `EN_ATTENTE`, dans un dossier non clôturé et sans affectation active ; pagination `page` / `pageSize`.
- `GET /api/v1/assignments/eligible-teams/:idTypeDechet` : équipes actives possédant une compétence valide pour le type ; une indisponibilité courante explicite les exclut. Une indisponibilité échue ne bloque pas l'affectation.

Ces lectures guident l'interface, mais ne constituent pas une autorisation ni une réservation. La création et la réaffectation revalident toutes les règles dans une transaction sérialisable.

## Stockage privé des médias

Les routes de dépôt sont `POST /api/v1/reports/:id/photos` et `POST /api/v1/interventions/:idIntervention/photos`, en multipart/form-data avec le champ `file`. Les fichiers sont limités à 10 MiB et aux signatures JPEG, PNG ou WebP. Les chemins Storage ne sont jamais renvoyés aux clients.

Les liens temporaires sont délivrés par `GET /api/v1/reports/:id/photos/:photoId/url`, `GET /api/v1/qualification/:idSignalement/photos/:idPhotoSignalement/url` et `GET /api/v1/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url`. Ils expirent après 60 secondes et sont précédés d'un contrôle de droit métier. Voir [la procédure Storage](../../docs/storage/README.md).

La commande `pnpm storage:purge` supprime les objets dont la période de conservation est échue, conserve les lignes photo pour l'historique, renseigne `mediaPurgeAt` et écrit l'événement de purge. Elle traite au maximum 100 photos par type et doit être appelée par un job Cron externe.

Le bucket distant, la politique de rétention et la planification Cron restent des opérations d'environnement.