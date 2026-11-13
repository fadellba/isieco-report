# Documentation ISI-Eco Report

Cette documentation distingue le modèle conceptuel du PFE, le schéma réellement implémenté, l'état des validations et le cadrage produit/UX.

## Navigation

| Rubrique | Contenu |
|---|---|
| [Vision produit & UX](product/vision-ux-blueprint.md) | Vision ISIECO, personas, parcours Web/Mobile, design system, écarts API et feuille de route UX. |
| [Architecture](architecture/README.md) | Architecture applicative, décisions, sécurité et état des livrables. |
| [Feuille de route lots 1 à 4](architecture/roadmap-lots-1-4.md) | Documentation, reprise, fonctionnalités Mobile et cartographie du centre Web. |
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

- Le commit courant de `main` est `dab3b2dc3aecc140709beae91cefa1525edec0be`. Il inclut les PR #86 et #94.
- La CI du commit de fusion est verte ([run #43513727264](https://github.com/fadellba/isieco-report/actions/runs/43513727264)).
- Le dépôt contient 13 migrations Prisma ; le workflow staging [#43513727249](https://github.com/fadellba/isieco-report/actions/runs/43513727249) s'arrête avant Render car les deux migrations du 9 novembre ne sont pas appliquées.
- Les workflows de déploiement Web/API ont été volontairement ignorés : `PRODUCTION_DEPLOY_ENABLED` n'est pas activé et aucun smoke test de production n'a été exécuté ([Web #43513727175](https://github.com/fadellba/isieco-report/actions/runs/43513727175), [API #43513727195](https://github.com/fadellba/isieco-report/actions/runs/43513727195)).
- Le mode hors ligne et la carte native agent restent absents ([#87](https://github.com/fadellba/isieco-report/issues/87), [#88](https://github.com/fadellba/isieco-report/issues/88)) ; les notifications métier sont à réaliser ([#90](https://github.com/fadellba/isieco-report/issues/90)).
- Le centre Web filtre désormais selon le viewport et pagine les résultats par curseur stable. L'actualisation événementielle reste à faire ; polling 60 secondes conservé ([#89](https://github.com/fadellba/isieco-report/issues/89)).
- Aucun test physique Android/iOS n'est attesté ([#53](https://github.com/fadellba/isieco-report/issues/53)).
- La restauration indépendante PostgreSQL + Storage depuis des sauvegardes datées n'est pas démontrée ([#54](https://github.com/fadellba/isieco-report/issues/54)).

La feuille de route exécutable, les dépendances et les critères de sortie sont détaillés dans [architecture/roadmap-lots-1-4.md](architecture/roadmap-lots-1-4.md).

## Règle de validation

Une migration verte sur une base vierge ne prouve pas la conservation de données historiques. Un test synthétique ne remplace pas la validation sur une sauvegarde réelle restaurée. Un workflow de déploiement dont l'appel de déploiement est ignoré ne constitue pas une mise en production.

- [Répétition de restauration staging](deployment/staging-restore-drill.md) : périmètre, déclenchement manuel, confidentialité et limites RPO/RTO.
