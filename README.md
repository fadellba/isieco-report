# ISI-Eco Report

Plateforme de signalement citoyen et de suivi des interventions environnementales.

## Architecture du dépôt

Ce dépôt est un **monorepo pnpm** qui regroupe trois applications et deux packages TypeScript partagés :

```text
apps/
  api/       NestJS — API REST, règles métier, contrôle des droits
  web/       React + Vite + Tailwind CSS — administration et page publique /telecharger
  mobile/    React Native + Expo + NativeWind — citoyens et agents de terrain
packages/
  shared/    types et contrats partagés non liés à un framework
  api-client/ client HTTP commun au Web et au Mobile
prisma/      schéma Prisma et migrations SQL versionnées
docs/        documentation métier et technique
.github/     workflows CI
```

Le backend est un monolithe modulaire. Les applications Web et Mobile consomment la même API HTTPS. Les droits d'accès sont contrôlés côté API, jamais uniquement par l'interface.

## Prérequis

- Node.js 22.23.4 LTS ;
- pnpm 12.16.1 ;
- Docker Engine ou Docker Desktop pour PostgreSQL local ;
- projet Supabase de développement pour Auth et Storage.

## Démarrage local

1. Copier `.env.example` vers `.env` à la racine. Pour Expo, copier `apps/mobile/.env.example` vers `apps/mobile/.env`.
2. Renseigner les URL et clés publiques du projet Supabase. Ne jamais exposer une clé `secret` ou `service_role` dans un client.
3. Installer les dépendances : `pnpm install`.
4. Démarrer PostgreSQL : `docker compose up -d postgres`.
5. Générer Prisma : `pnpm db:generate`.
6. Appliquer la migration initiale : `pnpm db:migrate`.
7. Démarrer au choix `pnpm dev:api`, `pnpm dev:web` ou `pnpm dev:mobile`.

L'API écoute sur `http://localhost:3000`, Swagger UI sur `/docs` et OpenAPI JSON sur `/docs-json`. Le Web écoute sur `http://localhost:5173`. Pour un appareil Android physique, `EXPO_PUBLIC_API_BASE_URL` doit viser l'adresse IP LAN du poste, pas `localhost`.

## Architecture et règles de qualité

La sécurité, la maintenabilité et l'évolutivité sont des exigences centrales. Les règles d'ingénierie sont définies dans [`AGENTS.md`](./AGENTS.md) : SOLID, DI, DRY, KISS, YAGNI, validation stricte, contrôle d'accès serveur, tests et documentation.

Tous les commits suivent Conventional Commits, par exemple `feat(reports): create citizen report`. Les messages sont en anglais.

## Documentation de l'API

La documentation interactive est exposée sur `/docs`, et la spécification JSON sur `/docs-json`. Pour générer `docs/api/openapi.json`, exécuter `pnpm api:openapi`. Voir [`docs/api/README.md`](./docs/api/README.md).

## État du modèle de données

Le schéma Prisma actuel contient `Utilisateur`, `Role` et `UtilisateurRole`. Il ne représente **pas encore les 39 modèles du MLD**. La transposition complète du MLD v2.13 est une étape dédiée qui devra préserver les cardinalités, contraintes et règles de gestion.

Les mots de passe et les sessions sont gérés par Supabase Auth ; ils ne sont pas dupliqués dans la base métier. L'inscription publique attribue uniquement le rôle `CITOYEN` côté serveur. L'attribution du premier compte administrateur doit être contrôlée manuellement.

## État fonctionnel

Les trois applications et les packages partagés sont initialisés. L'API possède un module Comptes/Authentification et un endpoint de santé. Les autres modules métier sont des squelettes. Les parcours de signalement, qualification, affectation et intervention restent à développer. La CI n'a pas encore été validée par une exécution complète sur GitHub Actions.
