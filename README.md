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

Le modèle métier courant comporte 18 modèles Prisma dans le schéma PostgreSQL public. La classe conceptuelle Dossier est représentée par DossierTraitement dans le code et par la table dossier_traitement. Supabase Auth gère les identités et sessions ; auth_user_id est une référence externe. Le journal d'audit métier n'est pas un 19e modèle Prisma : il est hébergé séparément dans le schéma PostgreSQL audit sous la table audit.evenement_metier, protégée par RLS et des triggers append-only. Les 13 migrations Prisma suivies dans le dépôt comprennent six migrations historiques, la simplification du modèle, quatre migrations additives pour le ledger d'audit et deux migrations supplémentaires qui ordonnent les événements du ledger et rétro-remplissent leur séquence. Au dernier état staging attesté (7 novembre 2026), 11 migrations étaient appliquées ; les deux dernières sont en attente sur staging au 13 novembre 2026. Le staging avait initialement reçu les sept premières migrations le 6 novembre, puis son historique a été porté à 11 migrations. La transformation simplifiée reste destructive pour certaines anciennes tables et colonnes ; le replay CI sur données synthétiques ne remplace pas une sauvegarde restaurable des données réelles.

La CI #184 et la PR #34 sont des validations historiques du socle et du replay de migration depuis l'ancien schéma avec données synthétiques. Le registre des livrables contient les exécutions plus récentes, dont la CI et le parcours E2E staging du 7 novembre. Voir docs/merise/README.md et le registre des livrables.

## État du dépôt au 13 novembre 2026

Le commit courant de `main` est [`dab3b2dc3aecc140709beae91cefa1525edec0be`](https://github.com/fadellba/isieco-report/commit/dab3b2dc3aecc140709beae91cefa1525edec0be). Il intègre la PR #86 (signalement mobile sans photo sous condition d'information utile) et la PR #94 (filtrage cartographique par viewport et pagination keyset).

- **CI :** le workflow [#43513727264](https://github.com/fadellba/isieco-report/actions/runs/43513727264) est réussi sur le révision de fusion `dab3b2dc3aecc140709beae91cefa1525edec0be` : migrations de test, replay historique, génération Prisma/OpenAPI, typecheck, tests et builds Web/API/Mobile.
- **Staging :** le workflow [Staging Forward Deploy #43513727249](https://github.com/fadellba/isieco-report/actions/runs/43513727249) s'arrête à la porte `prisma migrate status`. Le dépôt contient 13 migrations ; deux ne sont pas appliquées au staging : `20261109100000_business_audit_event_order` et `20261109110000_backfill_business_audit_event_sequence_order`. Render, readiness et E2E n'ont pas été déclenchés.
- **Production :** les workflows [Web #43513727175](https://github.com/fadellba/isieco-report/actions/runs/43513727175) et [API #43513727195](https://github.com/fadellba/isieco-report/actions/runs/43513727195) ont réussi leurs jobs de garde, mais les logs confirment `PRODUCTION_DEPLOY_ENABLED` différent de `true`, `deployed=false` et les smoke tests ignorés. Aucun déploiement production n'a été réalisé.
- **Migrations :** 13 fichiers SQL sont versionnés dans `prisma/migrations`. Le contrôle staging le plus récent confirme que les deux migrations du 9 novembre restent en attente ; aucune migration distante n'a été appliquée par la PR #94.
- **Mobile :** les parcours citoyen et agent connectés existent. Le mode hors ligne reste absent ([#87](https://github.com/fadellba/isieco-report/issues/87)), la carte native agent reste un placeholder ([#88](https://github.com/fadellba/isieco-report/issues/88)) et les notifications métier ne sont pas implémentées ([#90](https://github.com/fadellba/isieco-report/issues/90)). Aucun APK signé ni test physique Android/iOS n'est attesté ([#53](https://github.com/fadellba/isieco-report/issues/53)).
- **Sauvegarde / reprise :** aucune restauration indépendante depuis une sauvegarde PostgreSQL et un export Storage datés n'est attestée. Le drill actuel copie la source staging active et ne prouve pas le RPO d'un snapshot historique ([#54](https://github.com/fadellba/isieco-report/issues/54), [#51](https://github.com/fadellba/isieco-report/issues/51)).
- **Centre de commandement Web :** l'API filtre maintenant par bounding box et fournit une pagination keyset stable, avec un plafond de 250 éléments par page et un curseur lié au viewport. Le Web recharge après déplacement/zoom et propose « Charger les éléments suivants ». L'actualisation reste un polling REST de 60 secondes ; aucun flux événementiel n'est livré. Aucun suivi GPS des agents n'est prévu ([#89](https://github.com/fadellba/isieco-report/issues/89)).

La feuille de route consolidée et les conditions de sortie sont dans [docs/architecture/roadmap-lots-1-4.md](docs/architecture/roadmap-lots-1-4.md). Le registre détaillé des validations distingue les fonctionnalités intégrées, les validations d'environnement et les travaux restants.

## CI

.github/workflows/ci.yml s'exécute sur les push vers main, les pull requests et les déclenchements manuels. Il installe les dépendances, applique les migrations sur PostgreSQL de test, génère Prisma et OpenAPI, vérifie TypeScript, exécute les tests du socle et construit Web/API/Mobile. Le workflow `staging-migrate.yml` applique manuellement les migrations versionnées à la base Supabase staging, uniquement depuis `main` et après confirmation explicite. Le workflow render-uml-class-diagrams.yml régénère les vues UML de classes. La génération d'un aperçu SQL en CI ne remplace pas une migration additive versionnée.

La PR #34 corrige le générateur UML et ajoute la répétition de migration depuis les six migrations historiques avec des fixtures PostgreSQL ; sa CI complète est verte. Le staging distant a été migré avec succès le 6 novembre 2026 (run #42136250612). Les données et médias de test restent déclarés jetables ; une sauvegarde restaurable est facultative et n'était pas une précondition. Le workflow manuel exige les confirmations APPLY et YES pour autoriser la transformation du staging. Cette opération n'autorise aucun déploiement de production.
