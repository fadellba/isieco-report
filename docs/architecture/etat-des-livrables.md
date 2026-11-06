# État des livrables

État de référence : **6 novembre 2026**. La simplification du modèle est dans `main` via la PR #33. La PR #34 apporte les tests de répétition de migration et les corrections de génération UML. La migration distante staging est appliquée et vérifiée par le run GitHub Actions [#42136250612](https://github.com/fadellba/isieco-report/actions/runs/42136250612).

| Domaine | État vérifié |
|---|---|
| Architecture | Monorepo pnpm, API NestJS, Web React et Mobile Expo. |
| Modèle métier | 18 modèles Prisma : identité/rôles, référentiels/équipes, signalements, dossiers, affectations, interventions et vérifications. |
| Migration | Sept migrations versionnées. La dernière transforme l'ancien schéma de 38 tables en 18 tables et supprime volontairement des historiques/modules hors périmètre. |
| CI de base | CI #184 sur main réussie : migrations à blanc, OpenAPI, TypeScript, tests et builds Web/API/Mobile. |
| Répétition historique | La PR #34 ajoute le replay des six anciennes migrations sur une base PostgreSQL jetable, des fixtures synthétiques, l'application de la migration simplifiée et des assertions de conservation. La validation couvre aussi l'insertion d'un contenu absent et une vérification ancienne non appariable. |
| UML/Merise | Le générateur cible 18 classes, 32 associations et six artefacts graphiques : vue d'ensemble, quatre vues de domaine et SVG relationnel. Les sources Mermaid et matrices de correspondance ont été mises à jour. |
| API | Les modules Accounts, Reports, Qualification, Cases, Assignments, Interventions et Verification ont été adaptés au modèle simplifié. OpenAPI, tests et compilation passent dans la CI de suivi. |
| Web/Mobile | Les clients Web et Mobile ont été adaptés au schéma simplifié. Les builds passent ; la recette utilisateur et les tests sur appareils Android/iOS réels restent à faire. |
| Médias | Upload privé, liens signés et commande de purge présents. Configuration des secrets serveur, politique de rétention, Cron de purge et recette Storage staging encore requis. |
| Staging Supabase | Run #42136250612 réussi le 6 novembre 2026. Sept migrations Prisma terminées ; 18 tables métier présentes dans `public`, plus `_prisma_migrations`. `prisma migrate status` confirme que le schéma est à jour. |
| Sauvegarde | Aucune restauration complète n'a été vérifiée. Les données et médias staging étant déclarés jetables, une sauvegarde restaurable n'était pas un prérequis à la migration. Un export hors site reste recommandé avant d'utiliser ce staging avec des données utiles. |
| Workflow staging | `staging-migrate.yml` reste manuel et limité à `main`. Le run #42136250612 a validé `APPLY` et la confirmation de données jetables, puis appliqué les sept migrations sur le seul projet staging. |
| Sécurité staging | RLS est activé sur les 18 tables métier et `_prisma_migrations`. Aucun privilège de table direct n'est accordé à `anon`, `authenticated` ou `service_role` et aucune policy RLS n'est définie : c'est le verrouillage attendu puisque les clients passent par NestJS. Le Security Advisor signale néanmoins la protection des mots de passe compromis désactivée (WARN) et 15 clés étrangères sans index dédié (INFO). |\n| Production | Les workflows Vercel/Render existent, mais les appels de déploiement de production sont désactivés. Aucun déploiement ni smoke test production n'est confirmé. |
| PFE | Diagramme UML, matrice conceptuel/Prisma/PostgreSQL, documentation de migration et pertes d'historique sont synchronisés dans la branche de suivi. Figer le dossier après validation staging. |
| Mobile natif | Permissions, caméra, galerie, upload, localisation et parcours métier à recetter sur appareils réels. APK Android signé et GitHub Release à produire. |

## Ordre restant

1. Configurer et vérifier les variables runtime de l'API staging (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` et `SUPABASE_STORAGE_BUCKET`) sans exposer les secrets aux clients.
2. Faire valider une durée de conservation métier, puis définir `MEDIA_RETENTION_DAYS` ; ne pas inventer cette valeur.
3. Activer la protection Supabase Auth contre les mots de passe compromis et documenter le contrôle.
4. Planifier `pnpm storage:purge` dans l'environnement d'hébergement, puis tester upload, URL signée, expiration et purge avec des données synthétiques.
5. Recetter les parcours API/Web/Mobile et les droits inter-comptes, puis tester les fonctions caméra, galerie et localisation sur appareils Android/iOS réels.
6. Corriger les index FK après examen des requêtes et mesures de charge ; les avertissements d'index inutilisés sur ce staging peu sollicité ne justifient pas leur suppression immédiate.
7. N'envisager la production qu'après validation des tests, des secrets, de la rétention, de la purge, des Deploy Hooks et des smoke tests. Figer ensuite les livrables PFE et préparer l'APK signé.

## Conditions de clôture

- Une migration sur base vierge ne prouve pas la préservation des données historiques.
- Le scénario CI synthétique ne remplace pas une sauvegarde réelle restaurée.
- La présence d'un workflow de déploiement ne prouve pas une mise en production.
- La compilation ne remplace pas la recette utilisateur ni les tests d'autorisation.
