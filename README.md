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

Commencer par [l'index de la documentation](docs/README.md). Les décisions structurantes sont consignées dans [les ADR](docs/architecture/decisions.md). Le registre [état des livrables](docs/architecture/etat-des-livrables.md) distingue les éléments intégrés, initialisés et restant à réaliser.

## Versions et prérequis

Les versions sont épinglées dans le dépôt : Node.js 22.23.4, pnpm 12.16.1, TypeScript 5.9.3, NestJS 11.2.5, Prisma 7.10.1, React 19.2.3, Vite 8.3.5, Expo SDK 57, React Native 0.86.3 et NativeWind 4.2.7.

Docker Engine ou Docker Desktop est nécessaire pour lancer PostgreSQL localement. Un projet Supabase est nécessaire pour tester l'authentification et le stockage.

## Démarrage local

1. Copier .env.example vers .env et renseigner les variables de développement.
2. Copier apps/mobile/.env.example vers apps/mobile/.env.
3. Installer les dépendances avec pnpm install.
4. Démarrer PostgreSQL et sa base shadow isolée : docker compose up -d postgres postgres-shadow.
5. Générer le client : pnpm db:generate.
6. Appliquer les migrations locales versionnées : pnpm db:migrate.
7. Prévisualiser le SQL additif restant : pnpm db:migration:preview (la commande utilise SHADOW_DATABASE_URL, qui doit cibler une base distincte).
8. Exécuter les tests d'intégrité PostgreSQL après application des migrations : `TEST_DATABASE_URL="postgresql://isieco:isieco_dev_password@localhost:5432/isieco_report" pnpm db:test:invariants`.
9. Démarrer :
   - pnpm dev:api : API sur http://localhost:3000, Swagger sur /docs ;
   - pnpm dev:web : Web sur http://localhost:5173 ;
   - pnpm dev:mobile : serveur Expo.

Pour tester sur un appareil Android physique, EXPO_PUBLIC_API_BASE_URL doit pointer vers l'adresse IP locale du poste, pas localhost.

Ne jamais exposer dans le Web ou le Mobile une clé Supabase service_role, un secret serveur ou une chaîne de connexion PostgreSQL.

## Modèle de données et authentification

prisma/schema.prisma traduit les 38 tables métier du MLD v2.13. auth.users est géré par Supabase Auth ; utilisateur.auth_user_id référence l'identité externe. Les mots de passe, sessions et bearer tokens ne sont pas copiés dans la base métier.

Le schéma Prisma et les migrations versionnées sont appliqués sur une base PostgreSQL vierge et contrôlés par la CI. Voir docs/merise/README.md et le registre des livrables.

## État du projet au 31 octobre 2026

Le backend a intégré les workflows Accounts, Referentials, Reports, Qualification, Cases, Assignments, Interventions et Verification. Les phases Médias (PR #15) et Audit à portée limitée (PR #16) sont également intégrées : upload privé, liens signés, purge bornée et journal métier à portée limitée.

Le back-office Web a intégré les phases 12 et 13 : shell et navigation par rôle, administration des comptes, journal personnel, qualification des signalements et gestion des dossiers (PR #17 et #18). La Phase 14, administration Web des référentiels, est intégrée dans `main` (PR #19). La Phase 15, gestion Web des affectations, est en cours sur `feat/phase-15-web-assignments` et n'est pas encore fusionnée. Les interfaces Web d'intervention et de vérification restent à réaliser. Le Mobile est encore au stade du squelette Expo et de ses écrans placeholders ; les parcours métier citoyens et agents restent à construire.

La CI sur main valide les migrations PostgreSQL, OpenAPI, TypeScript, les tests et les builds Web/API/Mobile. Le bucket Supabase distant, la politique de rétention, la planification Cron, les déploiements automatiques et l'APK Android signé restent à finaliser. L'état détaillé et les limites sont consignés dans docs/architecture/etat-des-livrables.md et docs/storage/README.md.

## CI

.github/workflows/ci.yml s'exécute sur les push vers main, les pull requests et les déclenchements manuels. Il installe les dépendances, génère Prisma et OpenAPI, vérifie TypeScript, exécute les tests du socle et construit Web/API/Mobile. Le workflow render-uml-class-diagrams.yml régénère les vues UML de classes. La génération d'un aperçu SQL en CI ne remplace pas une migration additive versionnée.