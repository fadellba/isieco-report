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
- `PORT` : port HTTP, compris entre 1 et 65535 (3000 par défaut) ;
- `WEB_ORIGIN` : liste d’origines HTTP(S) autorisées, séparées par des virgules ;
- `NODE_ENV` : `development`, `test` ou `production`.

Ne pas utiliser de clé Supabase `service_role` dans les clients ni la journaliser. Les variables publiques Web/Mobile ont leur propre préfixe et ne remplacent pas la configuration serveur.

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
pnpm --filter @isieco/api test
```

Le client Prisma doit être généré. Préparer le dépôt avec `pnpm install` puis `pnpm db:generate`. Démarrer PostgreSQL local avec `docker compose up -d postgres`.

## Comptes et habilitations

Le module Accounts provisionne uniquement le rôle `CITOYEN` lors de l'initialisation publique d'un profil Supabase confirmé. Les attributions/révocations administratives sont réservées au rôle `ADMINISTRATEUR_COMPTES`, sérialisées côté PostgreSQL et journalisées dans `EvenementMetier` au sein de la même transaction. La révocation du dernier administrateur actif est refusée.

Les tests de service couvrent le provisionnement citoyen, les attributions concurrentes, l'audit transactionnel, les dates de fin planifiées et la protection du dernier administrateur. Les tests d'intégration PostgreSQL d'intégrité sont séparés dans `pnpm db:test:invariants`.

## Modules métier initialisés

Comptes, signalements, qualification, dossiers, affectations, interventions, vérification, référentiels et audit. Les modules métier autres que Comptes sont encore des squelettes ; leurs règles seront implémentées progressivement à partir des cas d’utilisation et règles de gestion existants.
