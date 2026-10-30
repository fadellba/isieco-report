# API — NestJS

Backend modulaire d’ISI-Eco Report. L’API REST est préfixée par `/api/v1`.

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
```

L’API attend `DATABASE_URL`, `SUPABASE_URL` et `SUPABASE_ANON_KEY`. Le client Prisma doit être généré. Préparer le dépôt avec `pnpm install` puis `pnpm db:generate`. Démarrer PostgreSQL local avec `docker compose up -d postgres`.

## Modules métier initialisés

Comptes, signalements, qualification, dossiers, affectations, interventions, vérification, référentiels et audit. Les modules métier autres que Comptes sont encore des squelettes ; leurs règles seront implémentées progressivement à partir des cas d’utilisation et règles de gestion existants.
