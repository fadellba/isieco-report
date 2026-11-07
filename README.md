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

Ne jamais exposer dans le Web ou le Mobile une clé Supabase service_role, un secret serveur ou une chaîne de connexion PostgreSQL. La procédure d'initialisation de la base Supabase staging est décrite dans [docs/deployment/staging-database.md](docs/deployment/staging-database.md).

## Modèle de données et authentification

Le modèle métier courant comporte 18 modèles Prisma alignés sur le périmètre simplifié du PFE. La classe conceptuelle Dossier est représentée par DossierTraitement dans le code et par la table dossier_traitement. Supabase Auth continue de gérer les identités et sessions ; auth_user_id est une référence externe. Les six premières migrations construisent l'ancien modèle de 38 classes ; la migration 20261105000000_simplified_domain_model transforme ce schéma en 18 tables. Son scénario de répétition sur un ancien schéma peuplé de données synthétiques est validé en CI. Elle a été appliquée au projet Supabase staging le 6 novembre 2026 ; le run GitHub Actions #42136250612 confirme les sept migrations et un schéma Prisma à jour. Cette opération reste manuelle et destructive, et n'a pas touché la production.

La CI #184 sur main a validé la génération Prisma, les migrations sur une base vierge, OpenAPI, TypeScript, tests et builds Web/API/Mobile. La PR #34 ajoute et valide le scénario de répétition de migration depuis l'ancien schéma avec données synthétiques. Voir docs/merise/README.md et le registre des livrables.

## État du projet au 6 novembre 2026

Le backend a intégré les workflows Accounts, Referentials, Reports, Qualification, Cases, Assignments, Interventions et Verification. Les fonctions conservées incluent l'upload privé, les liens signés et la purge bornée des médias. L'audit générique et les fonctions de gamification/publication ont été retirés du périmètre relationnel simplifié.

Le back-office Web a intégré les phases 12 et 13 : shell et navigation par rôle, administration des comptes, qualification des signalements et gestion des dossiers (PR #17 et #18). Les fonctions d'historique générique/audit retirées du modèle ne sont plus une partie du périmètre simplifié. La Phase 14, administration Web des référentiels, est intégrée dans `main` (PR #19). La Phase 15, gestion Web des affectations, est intégrée dans `main` (PR #20). La Phase 16, espace Agent terrain pour les missions et interventions, est intégrée dans `main` (PR #21). La Phase 17, interface de vérification indépendante, est intégrée dans `main` (PR #22). Le parcours Mobile citoyen (dépôt, suivi et réponses aux compléments) est intégré dans `main` (PR #23). Le parcours Mobile Agent terrain (équipes, missions, acceptation/refus, démarrage et compte rendu) est intégré dans `main` (PR #24). La Phase 21 (PR #26) est intégrée dans `main` : sélection/capture photo citoyenne et agent, upload privé, aperçu par URL signée et localisation ponctuelle au premier plan. Sa CI complète est verte ; la recette sur appareils Android/iOS réels reste à effectuer.

La CI #184 sur le commit `2db03a7b1443a35e96dd06daee032fa00ed73bcd` est verte : migrations PostgreSQL vierge, OpenAPI, TypeScript, tests et builds Web/API/Mobile réussis. La PR #34 a ajouté le replay des six migrations historiques sur une base peuplée de données synthétiques et la validation de la migration simplifiée. Les workflows Vercel/Render sont intégrés dans `main` (Phase 20, PR #25), mais les runs #41253417596 et #41253417593 ont ignoré les déploiements : `PRODUCTION_DEPLOY_ENABLED` et les Deploy Hooks n'étaient pas renseignés. Aucun déploiement ni smoke test de production n'est confirmé. Le bucket privé `isieco-private-media` du staging avait été vérifié le 5 novembre. Le 6 novembre, le run [#42136250612](https://github.com/fadellba/isieco-report/actions/runs/42136250612) a appliqué la migration simplifiée : sept migrations enregistrées, 18 tables métier, état Prisma à jour. Le contrôle SQL a confirmé RLS sur les 18 tables et `_prisma_migrations`, sans privilèges directs pour `anon`, `authenticated` ou `service_role`, conformément à l'accès exclusivement via NestJS. Le run staging [#42319641856](https://github.com/fadellba/isieco-report/actions/runs/42319641856) a réussi le 7 novembre 2026 sur `d0a0deabd239e5adde8833a8488f5ff7a00442d6` : readiness DB, smoke tests, matrice 8 rôles (64 contrôles rôle/route et 8 contrôles anonymes), parcours citoyen → clôture et cycle réel Storage. Le cycle Storage a vérifié l'upload privé, le refus d'accès anonyme, une URL signée de 60 secondes, une expiration à 365 jours, la purge ciblée, la suppression effective de l'objet et l'audit. Render staging sert ce commit (`dep-dbn78bbrjlhs739mvl0g`, `live`). Restent l'observation du premier Cron quotidien de purge, le test des preuves d'intervention et des erreurs/reprises Storage, la restauration PostgreSQL/Storage, la recette sur appareils Android/iOS réels, puis l'APK Android signé. Voir [la documentation Storage](docs/storage/README.md), la [procédure staging](docs/deployment/staging-database.md) et l'[état des livrables](docs/architecture/etat-des-livrables.md).

## CI

.github/workflows/ci.yml s'exécute sur les push vers main, les pull requests et les déclenchements manuels. Il installe les dépendances, applique les migrations sur PostgreSQL de test, génère Prisma et OpenAPI, vérifie TypeScript, exécute les tests du socle et construit Web/API/Mobile. Le workflow `staging-migrate.yml` applique manuellement les migrations versionnées à la base Supabase staging, uniquement depuis `main` et après confirmation explicite. Le workflow render-uml-class-diagrams.yml régénère les vues UML de classes. La génération d'un aperçu SQL en CI ne remplace pas une migration additive versionnée.

La PR #34 corrige le générateur UML et ajoute la répétition de migration depuis les six migrations historiques avec des fixtures PostgreSQL ; sa CI complète est verte. Le staging distant a été migré avec succès le 6 novembre 2026 (run #42136250612). Les données et médias de test restent déclarés jetables ; une sauvegarde restaurable est facultative et n'était pas une précondition. Le workflow manuel exige les confirmations APPLY et YES pour autoriser la transformation du staging. Cette opération n'autorise aucun déploiement de production.
