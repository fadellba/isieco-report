# ISI-Eco Report

Plateforme de signalement citoyen et de suivi des interventions environnementales.

## Architecture

Monorepo pnpm, organisé autour d'un backend NestJS modulaire :

- `apps/api` : API REST, règles métier et autorisations côté serveur ;
- `apps/web` : interface d'administration React, Vite et Tailwind CSS ;
- `apps/mobile` : application Expo/React Native commune aux citoyens et agents ;
- `packages/shared` et `packages/api-client` : contrats partagés ;
- `prisma` : schéma relationnel et migrations SQL versionnées ;
- `docs` : architecture, décisions, modèles Merise et procédures.

Le Web et le Mobile consomment la même API HTTPS. Les contrôles d'accès sont réalisés côté API, pas uniquement dans les interfaces.

## Versions et prérequis

Les versions d'outils et dépendances sont épinglées dans le dépôt : Node.js 22.23.4 LTS, pnpm 12.16.1, NestJS 11, Prisma 7.10.1, React 19, Vite 8, Expo SDK 57 et NativeWind 4.2.7.

Docker Engine ou Docker Desktop est nécessaire pour lancer PostgreSQL localement. Un projet Supabase est nécessaire pour tester l'authentification et le stockage gérés par Supabase.

## Démarrage local

1. Copier `.env.example` vers `.env` à la racine, puis renseigner les URL et clés publiques Supabase. Copier également `apps/mobile/.env.example` vers `apps/mobile/.env`.
2. Installer les dépendances avec `pnpm install`.
3. Démarrer PostgreSQL local : `docker compose up -d postgres`.
4. Générer le client : `pnpm db:generate`.
5. Appliquer les migrations en développement : `pnpm db:migrate`.
6. Démarrer les applications :
   - `pnpm dev:api` : API sur `http://localhost:3000`, documentation Swagger sur `/docs` ;
   - `pnpm dev:web` : Web sur `http://localhost:5173` ;
   - `pnpm dev:mobile` : serveur Expo.

Pour un déploiement ou une base déjà provisionnée, utiliser `pnpm db:deploy`. Pour tester sur un appareil Android physique, `EXPO_PUBLIC_API_BASE_URL` doit pointer vers l'adresse IP locale du poste, et non `localhost`.

Ne jamais exposer dans le Web ou le Mobile une clé Supabase `service_role`, une clé secrète ou une chaîne de connexion PostgreSQL.

## Modèle de données et authentification

`prisma/schema.prisma` traduit les **38 tables métier du MLD v2.13**. Les noms logiques sont traduits en modèles Prisma PascalCase et tables SQL snake_case. Les clés primaires, étrangères, clés composées, unicités et relations sont décrites dans le schéma.

La table `auth.users` reste externe et gérée par Supabase Auth. `utilisateur.auth_user_id` conserve son identifiant UUID unique. Les mots de passe, sessions et bearer tokens ne sont pas copiés dans la base métier ; il n'existe pas de modèle `SESSION`.

Les codes de statut et de décision restent des chaînes contrôlées par le dictionnaire métier, afin de permettre les migrations de référentiel sans transformer chaque évolution de statut en changement d'énumération Prisma. Les invariants qui dépassent les possibilités du schéma Prisma (unicité conditionnelle, cohérence inter-colonnes, cibles exclusives et transitions) doivent être portés par les migrations SQL ou les transactions métier.

## État d'avancement

Le schéma des 38 tables est modélisé. Cela ne signifie pas que l'ensemble des parcours métier est déjà exposé dans l'API ou les interfaces. Les modules NestJS de qualification, affectation, intervention, vérification, référentiels, médias et publication doivent encore être implémentés et testés. Les tests de génération/compilation ne remplacent pas une validation sur une instance PostgreSQL/Supabase dédiée, ni un test complet des parcours sur appareils.

## CI

Le workflow `.github/workflows/ci.yml` s'exécute sur les push de `main`, les pull requests et les déclenchements manuels. Il installe les dépendances, génère Prisma, vérifie TypeScript, exécute les tests et construit les trois applications. Lorsqu'un schéma Prisma change sur `main`, il génère également un aperçu SQL de migration et l'archive en artefact Actions pour revue avant versionnement.

