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

Le modèle métier courant comporte 18 modèles Prisma dans le schéma PostgreSQL public. La classe conceptuelle Dossier est représentée par DossierTraitement dans le code et par la table dossier_traitement. Supabase Auth gère les identités et sessions ; auth_user_id est une référence externe. Le journal d'audit métier n'est pas un 19e modèle Prisma : il est hébergé séparément dans le schéma PostgreSQL audit sous la table audit.evenement_metier, protégée par RLS et des triggers append-only. Les 14 migrations Prisma suivies dans le dépôt comprennent six migrations historiques, la simplification du modèle, quatre migrations additives pour le ledger d'audit, deux migrations qui ordonnent les événements du ledger et rétro-remplissent leur séquence, puis une migration de notification du centre Web par PostgreSQL LISTEN/NOTIFY. Au contrôle staging du 13 novembre 2026, 11 migrations étaient appliquées ; les trois migrations restantes sont en attente. Le staging avait initialement reçu les sept premières migrations le 6 novembre, puis son historique a été porté à 11 migrations. La transformation simplifiée reste destructive pour certaines anciennes tables et colonnes ; le replay CI sur données synthétiques ne remplace pas une sauvegarde restaurable des données réelles.

La CI #184 et la PR #34 sont des validations historiques du socle et du replay de migration depuis l'ancien schéma avec données synthétiques. Le registre des livrables contient les exécutions plus récentes, dont la CI et le parcours E2E staging du 7 novembre. Voir docs/merise/README.md et le registre des livrables.

## État du dépôt au 13 novembre 2026

Le commit courant de `main` est [`652d16d56b0e7898b639ca09a822a35de5fb2e3b`](https://github.com/fadellba/isieco-report/commit/652d16d56b0e7898b639ca09a822a35de5fb2e3b). Il intègre les PR #86 (signalement mobile sans photo), #94 (viewport et pagination keyset), #96 (actualisation événementielle PostgreSQL LISTEN/NOTIFY + SSE) et #98 (purge du centre Web après refus d'accès SSE).

- **CI :** le workflow [#43530992124](https://github.com/fadellba/isieco-report/actions/runs/43530992124) est réussi sur le commit courant de `main`.
- **Migrations :** 14 migrations sont versionnées dans Git ; 11 sont enregistrées dans le staging. Trois migrations restent en attente : `20261109100000_business_audit_event_order`, `20261109110000_backfill_business_audit_event_sequence_order` et `20261113215000_command_center_event_notifications`.
- **Staging :** le workflow [#43516567399](https://github.com/fadellba/isieco-report/actions/runs/43516567399) s'arrête à la porte de cohérence des migrations avant Render, readiness et E2E. Le trigger SSE n'est donc pas encore activé dans la base staging.
- **Production :** les contrôles Web [#43530992214](https://github.com/fadellba/isieco-report/actions/runs/43530992214) et API [#43530992105](https://github.com/fadellba/isieco-report/actions/runs/43530992105) ont tourné, mais `PRODUCTION_DEPLOY_ENABLED` n'est pas `true`, les étapes de déploiement ont produit `deployed=false` et les smoke tests ont été ignorés. Aucun déploiement production n'a eu lieu.
- **Centre Web :** viewport et pagination keyset sont livrés via PR #94. Le flux SSE est livré via PR #96 ; le polling REST de 60 secondes demeure le fallback. Depuis la PR #98, le client purge la carte sur HTTP 401/403 et rafraîchit le profil pour que les gardes retirent le centre si le rôle a été révoqué ([#89](https://github.com/fadellba/isieco-report/issues/89), [PR #98](https://github.com/fadellba/isieco-report/pull/98)).
- **Mobile :** le mode hors ligne, la carte native agent et les notifications métier restent absents ([#87](https://github.com/fadellba/isieco-report/issues/87), [#88](https://github.com/fadellba/isieco-report/issues/88), [#90](https://github.com/fadellba/isieco-report/issues/90)). Aucun APK signé ni test physique Android/iOS n'est attesté ([#53](https://github.com/fadellba/isieco-report/issues/53)).
- **Sauvegarde / reprise :** aucune restauration indépendante depuis une sauvegarde PostgreSQL et un export Storage datés n'est attestée ([#54](https://github.com/fadellba/isieco-report/issues/54), [#51](https://github.com/fadellba/isieco-report/issues/51)).

La feuille de route consolidée et les conditions de sortie sont dans [docs/architecture/roadmap-lots-1-4.md](docs/architecture/roadmap-lots-1-4.md).

## CI

.github/workflows/ci.yml s'exécute sur les push vers main, les pull requests et les déclenchements manuels. Il installe les dépendances, applique les migrations sur PostgreSQL de test, génère Prisma et OpenAPI, vérifie TypeScript, exécute les tests du socle et construit Web/API/Mobile. Le workflow `staging-migrate.yml` applique manuellement les migrations versionnées à la base Supabase staging, uniquement depuis `main` et après confirmation explicite. Le workflow render-uml-class-diagrams.yml régénère les vues UML de classes. La génération d'un aperçu SQL en CI ne remplace pas une migration additive versionnée.

La PR #34 corrige le générateur UML et ajoute la répétition de migration depuis les six migrations historiques avec des fixtures PostgreSQL ; sa CI complète est verte. Le staging distant a été migré avec succès le 6 novembre 2026 (run #42136250612). Les données et médias de test restent déclarés jetables ; une sauvegarde restaurable est facultative et n'était pas une précondition. Le workflow manuel exige les confirmations APPLY et YES pour autoriser la transformation du staging. Cette opération n'autorise aucun déploiement de production.
