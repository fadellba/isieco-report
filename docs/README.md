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

- Le commit courant de `main` est `47f846abd006cdff66a3bc4c396d84d408a64486` ; la PR #86 est fusionnée.
- Le dépôt contient 13 migrations Prisma. Le dernier état staging vérifié le 7 novembre en comptait 11 ; les deux migrations du 9 novembre restent en attente. Le workflow staging [#43484030393](https://github.com/fadellba/isieco-report/actions/runs/43484030393) s'est arrêté sur cette divergence avant le déclenchement de Render.
- La CI du commit courant est verte ([run #43484030472](https://github.com/fadellba/isieco-report/actions/runs/43484030472)). Cela ne vaut pas validation du déploiement staging.
- Le mode hors ligne et la carte native agent ne sont pas implémentés ([#87](https://github.com/fadellba/isieco-report/issues/87), [#88](https://github.com/fadellba/isieco-report/issues/88)). Les notifications métier restent à créer ([#90](https://github.com/fadellba/isieco-report/issues/90)).
- Le centre Web dispose d'une réponse cartographique bornée, mais n'a ni filtre viewport, ni pagination spatiale, ni actualisation événementielle ([#89](https://github.com/fadellba/isieco-report/issues/89)).
- Aucun test Android/iOS sur appareil physique n'est attesté ([#53](https://github.com/fadellba/isieco-report/issues/53)).
- La répétition de restauration disponible ne prouve pas une restauration indépendante depuis des sauvegardes PostgreSQL et Storage datées ([#54](https://github.com/fadellba/isieco-report/issues/54)).

La feuille de route exécutable, les dépendances et les critères de sortie sont détaillés dans [architecture/roadmap-lots-1-4.md](architecture/roadmap-lots-1-4.md). Le registre des validations distingue les preuves obtenues, les fonctionnalités manquantes et les contrôles à réaliser.

## Règle de validation

Une migration verte sur une base vierge ne prouve pas la conservation de données historiques. Un test synthétique ne remplace pas la validation sur une sauvegarde réelle restaurée. Un workflow de déploiement dont l'appel de déploiement est ignoré ne constitue pas une mise en production.

- [Répétition de restauration staging](deployment/staging-restore-drill.md) : périmètre, déclenchement manuel, confidentialité et limites RPO/RTO.
