# Documentation ISI-Eco Report

Cette documentation distingue le modèle conceptuel du PFE, le schéma réellement implémenté, l'état des validations et le cadrage produit/UX.

## Navigation

| Rubrique | Contenu |
|---|---|
| [Vision produit & UX](product/vision-ux-blueprint.md) | Vision ISIECO, personas, parcours Web/Mobile, design system, écarts API et feuille de route UX. |
| [Architecture](architecture/README.md) | Architecture applicative, décisions, sécurité et état des livrables. |
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

## État au 5 novembre 2026

- Le schéma Prisma courant compte 18 modèles correspondant aux classes métier retenues pour le PFE.
- La PR #33 a intégré la simplification dans main. La CI #184 a validé les migrations sur une base vierge, les tests, OpenAPI, TypeScript et les builds Web/API/Mobile.
- La CI de suivi ajoute une répétition depuis les six migrations historiques sur PostgreSQL jetable avec données synthétiques, y compris les cas de qualification sans contenu déclaré préalable et de vérification sans intervention correspondante.
- Le générateur UML est aligné sur 18 classes et produit quatre vues de domaine, une vue d'ensemble et un SVG relationnel.
- Le projet Supabase isieco-report-staging contient toujours les six migrations historiques et un jeu de données très limité : 3 utilisateurs, 8 rôles, 1 signalement, 1 photo et 6 événements. Il ne contient aucun dossier, équipe, affectation, intervention ou vérification.
- Le staging utilise l'offre Free : aucune sauvegarde quotidienne gérée n'est fournie. Une exportation logique manuelle et une restauration vérifiée dans un environnement isolé sont obligatoires avant la migration destructive.
- Aucun déploiement de production ni smoke test post-déploiement n'est confirmé. Les workflows Vercel/Render conservent leurs gardes d'activation.
- La recette fonctionnelle sur staging, la recette Android/iOS réels et la génération d'un APK signé restent à effectuer.

## Règle de validation

Une migration verte sur une base vierge ne prouve pas la conservation de données historiques. Un test synthétique ne remplace pas la validation sur une sauvegarde réelle restaurée. Un workflow de déploiement dont l'appel de déploiement est ignoré ne constitue pas une mise en production.

- [Répétition de restauration staging](deployment/staging-restore-drill.md) : périmètre, déclenchement manuel, confidentialité et limites RPO/RTO.
