# ISI-Eco Report

Plateforme de signalement citoyen et de suivi des interventions environnementales.

Le dépôt est organisé autour de trois applications : Web (React/Vite/Tailwind), Mobile (React Native/Expo/NativeWind) et API REST (NestJS/Prisma/PostgreSQL), ainsi que des packages TypeScript partagés.

## Principes de développement

La sécurité, la maintenabilité et l'évolutivité sont des exigences centrales. Les règles de contribution, d'architecture et de qualité sont définies dans [AGENTS.md](./AGENTS.md).

L'API est versionnée sous `/api/v1` et documentée avec OpenAPI 3 / Swagger. Voir [la convention de documentation API](./docs/api/README.md).

## État du dépôt

Le dépôt est en cours d'initialisation. Le socle applicatif, les workflows CI et les premières fonctionnalités seront ajoutés par commits successifs respectant Conventional Commits.
