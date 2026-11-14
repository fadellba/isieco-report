# Documentation ISI-Eco Report

Cette documentation distingue le modèle conceptuel du PFE, le schéma réellement implémenté, l'état des validations et le cadrage produit/UX.

## Navigation

| Rubrique | Contenu |
|---|---|
| [Vision produit & UX](product/vision-ux-blueprint.md) | Vision ISIECO, personas, parcours Web/Mobile, design system, écarts API et feuille de route UX. |
| [Architecture](architecture/README.md) | Architecture applicative, décisions, sécurité et état des livrables. |
| [Feuille de route lots 1 à 4](architecture/roadmap-lots-1-4.md) | Documentation, reprise, fonctionnalités Mobile et cartographie du centre Web. |
| [Actualisation événementielle du centre Web](architecture/command-center-realtime.md) | PostgreSQL LISTEN/NOTIFY + SSE livré, contrôles d'accès, reconnexion et validation staging. |
| [Déploiement](deployment/README.md) | GitHub Actions, Vercel, Render, Supabase et distribution mobile. |
| [Technologies](technologies/README.md) | Stack, versions épinglées et compatibilités. |
| [Merise](merise/README.md) | Modèle simplifié et traduction Prisma/PostgreSQL. |
| [UML](uml/README.md) | Contexte, acteurs, cas d'utilisation et diagramme de classes. |
| [API](api/README.md) | Contrat OpenAPI, authentification et endpoints. |
| [Stockage des médias](storage/README.md) | Bucket privé, upload, liens signés et purge. |
| [Staging Supabase](deployment/staging-database.md) | Migration Prisma, sauvegarde/restauration et contrôles de sécurité. |

## Sources de vérité

Le diagramme de classes simplifié du PFE définit le périmètre conceptuel. prisma/schema.prisma décrit le modèle physique effectivement implémenté. La migration 20261105000000_simplified_domain_model transforme l'ancien schéma historique de 38 modèles en 18 modèles cibles. Les écarts techniques, les pertes d'historique et les limites sont documentés dans la matrice UML et la note de migration.

En cas de divergence, ne pas recopier une ancienne référence MLD v2.13 sans la confronter au modèle courant.

## État du dépôt au 13 novembre 2026

- La révision fonctionnelle de référence est `652d16d56b0e7898b639ca09a822a35de5fb2e3b` (PR #86, #94, #96 et #98). La PR #97 a ensuite synchronisé les documents sans modifier le code applicatif.
- La CI de `main` est verte ([#43530992124](https://github.com/fadellba/isieco-report/actions/runs/43530992124)); les CI des PR #96 et #98 sont vertes ([#43516567328](https://github.com/fadellba/isieco-report/actions/runs/43516567328), [#43530017692](https://github.com/fadellba/isieco-report/actions/runs/43530017692)).
- 14 migrations sont versionnées dans Git ; 11 sont enregistrées en staging. Trois restent en attente : les deux migrations d'ordre du ledger et `20261113215000_command_center_event_notifications`.
- Le workflow staging [#43516567399](https://github.com/fadellba/isieco-report/actions/runs/43516567399) s'arrête avant Render/readiness/E2E ; le trigger SSE n'est pas encore actif en staging.
- Les étapes de déploiement Web/API en production ont été ignorées après les contrôles car `PRODUCTION_DEPLOY_ENABLED` n'est pas `true` ([Web #43530992214](https://github.com/fadellba/isieco-report/actions/runs/43530992214), [API #43530992105](https://github.com/fadellba/isieco-report/actions/runs/43530992105)).
- Le centre Web dispose du viewport, de la pagination keyset et d'un flux SSE d'invalidation PostgreSQL ; le polling 60 secondes reste le fallback. Depuis PR #98, la carte est vidée sur HTTP 401/403 et le profil est rafraîchi.
- Le mode hors ligne, la carte native agent et les notifications métier restent absents ([#87](https://github.com/fadellba/isieco-report/issues/87), [#88](https://github.com/fadellba/isieco-report/issues/88), [#90](https://github.com/fadellba/isieco-report/issues/90)).
- Aucun test physique Android/iOS n'est attesté ([#53](https://github.com/fadellba/isieco-report/issues/53)).
- La restauration indépendante PostgreSQL + Storage n'est pas démontrée ([#54](https://github.com/fadellba/isieco-report/issues/54)).

La feuille de route exécutable et les dépendances sont détaillées dans [architecture/roadmap-lots-1-4.md](architecture/roadmap-lots-1-4.md).

## Règle de validation

Une migration verte sur une base vierge ne prouve pas la conservation de données historiques. Un test synthétique ne remplace pas la validation sur une sauvegarde réelle restaurée. Un workflow de déploiement dont l'appel de déploiement est ignoré ne constitue pas une mise en production.

- [Répétition de restauration staging](deployment/staging-restore-drill.md) : périmètre, déclenchement manuel, confidentialité et limites RPO/RTO.
