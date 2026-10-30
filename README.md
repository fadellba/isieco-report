# ISI-Eco Report

Plateforme de signalement citoyen et de suivi des interventions environnementales.

## Architecture

Monorepo pnpm organisé autour d'un backend NestJS modulaire :

- apps/api : API REST, règles métier et autorisations côté serveur ;
- apps/web : interface d'administration React, Vite et Tailwind CSS ;
- apps/mobile : application Expo/React Native commune aux citoyens et agents ;
- packages/shared et packages/api-client : contrats et utilitaires partagés ;
- prisma : schéma relationnel et migrations SQL versionnées ;
- docs : décisions d'architecture, livrables UML/Merise, stack technique et déploiement.

Le Web et le Mobile consomment la même API HTTPS. Les clients ne se connectent pas directement à PostgreSQL. Les contrôles d'accès sont effectués par l'API.

## Documentation projet

Commencer par [l'index de la documentation](docs/README.md). Les décisions structurantes sont consignées dans [les ADR](docs/architecture/decisions.md). Le registre [état des livrables](docs/architecture/etat-des-livrables.md) distingue les éléments présents, initialisés et restant à réaliser.

## Versions et prérequis

Les versions sont épinglées dans le dépôt : Node.js 22.23.4, pnpm 12.16.1, TypeScript 5.9.3, NestJS 11.2.5, Prisma 7.10.1, React 19.2.3, Vite 8.3.5, Expo SDK 57, React Native 0.86.3 et NativeWind 4.2.7.

Docker Engine ou Docker Desktop est nécessaire pour lancer PostgreSQL localement. Un projet Supabase est nécessaire pour tester l'authentification et le stockage.

## Démarrage local

1. Copier .env.example vers .env et renseigner les variables de développement.
2. Copier apps/mobile/.env.example vers apps/mobile/.env.
3. Installer les dépendances avec pnpm install.
4. Démarrer PostgreSQL local : docker compose up -d postgres.
5. Générer le client : pnpm db:generate.
6. Appliquer les migrations locales versionnées : pnpm db:migrate.
7. Démarrer :
   - pnpm dev:api : API sur http://localhost:3000, Swagger sur /docs ;
   - pnpm dev:web : Web sur http://localhost:5173 ;
   - pnpm dev:mobile : serveur Expo.

Pour tester sur un appareil Android physique, EXPO_PUBLIC_API_BASE_URL doit pointer vers l'adresse IP locale du poste, pas localhost.

Ne jamais exposer dans le Web ou le Mobile une clé Supabase service_role, un secret serveur ou une chaîne de connexion PostgreSQL.

## Modèle de données et authentification

prisma/schema.prisma traduit les 38 tables métier du MLD v2.13. auth.users est géré par Supabase Auth ; utilisateur.auth_user_id référence l'identité externe. Les mots de passe, sessions et bearer tokens ne sont pas copiés dans la base métier.

Le schéma Prisma complet ne signifie pas que toutes les migrations sont déjà versionnées et validées sur PostgreSQL. Voir docs/merise/README.md et le registre des livrables.

## État du projet

Le socle du monorepo, les trois applications, deux packages partagés, le module initial de comptes et rôles, le schéma Prisma et la CI sont présents. Les autres modules métier sont des squelettes. Les parcours complets, les migrations intégrales testées, les déploiements automatiques, le projet Supabase distant et l'APK Android signé ne sont pas considérés comme livrés.

## CI

.github/workflows/ci.yml s'exécute sur les push vers main, les pull requests et les déclenchements manuels. Il installe les dépendances, génère Prisma et OpenAPI, vérifie TypeScript, exécute les tests du socle et construit Web/API/Mobile. La génération d'un aperçu SQL en CI ne remplace pas une migration additive versionnée.