# État des livrables

État de référence : **5 novembre 2026**. La simplification du modèle est dans main via la PR #33. La CI #184 du commit 2db03a7b1443a35e96dd06daee032fa00ed73bcd est verte sur base vierge. La PR #34 apporte les tests de répétition de migration, les corrections de génération UML et les verrous de sauvegarde staging.

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
| Staging Supabase | Projet isieco-report-staging, six anciennes migrations enregistrées. Données publiques observées : 3 profils métier, 8 rôles, 1 signalement, 1 photo et 6 événements ; aucun dossier, équipe, affectation, intervention ou vérification. Les schémas gérés contiennent aussi 3 identités Auth, 1 bucket et 1 objet Storage. Dataset non représentatif des migrations métier complexes. |
| Sauvegarde | Offre Supabase Free : aucune sauvegarde quotidienne gérée. Le dump logique CLI du schéma public doit être exporté, conservé hors dépôt et restauré dans un projet isolé. Auth (3 identités) et Storage (1 objet) sont exclus du dump et exigent une stratégie séparée. Aucune restauration complète n'a été vérifiée. |
| Workflow staging | staging-migrate.yml reste manuel, limité à main, et exige deux confirmations : APPLY et YES pour attester qu'une sauvegarde a été restaurée. Ce verrou ne remplace pas la preuve opérateur. |
| Production | Les workflows Vercel/Render existent, mais les appels de déploiement de production sont désactivés. Aucun déploiement ni smoke test production n'est confirmé. |
| PFE | Diagramme UML, matrice conceptuel/Prisma/PostgreSQL, documentation de migration et pertes d'historique sont synchronisés dans la branche de suivi. Figer le dossier après validation staging. |
| Mobile natif | Permissions, caméra, galerie, upload, localisation et parcours métier à recetter sur appareils réels. APK Android signé et GitHub Release à produire. |

## Ordre restant

1. Exporter le schéma métier public, conserver les checksums hors du dépôt et vérifier sa restauration dans un projet isolé. Préserver séparément les identités Supabase Auth et l'objet Storage existant ; le dump PostgreSQL ne les contient pas.
2. Comparer les volumes réels et les cas historiques sur une restauration isolée, puis valider explicitement les données supprimées et les vérifications non appariées.
3. Après validation de la PR #34 et du backup, configurer le secret GitHub STAGING_PRISMA_URL et exécuter manuellement le workflow staging. Vérifier les 18 tables, sept migrations, RLS, privilèges, volumes et relations.
4. Recetter les parcours API/Web/Mobile, les droits inter-comptes, Storage, puis Android/iOS réels.
5. N'envisager la production qu'après restauration éprouvée, fenêtre de changement, variables/Deploy Hooks et smoke tests.
6. Figer les livrables du PFE et préparer l'APK signé.

## Conditions de clôture

- Une migration sur base vierge ne prouve pas la préservation des données historiques.
- Le scénario CI synthétique ne remplace pas une sauvegarde réelle restaurée.
- La présence d'un workflow de déploiement ne prouve pas une mise en production.
- La compilation ne remplace pas la recette utilisateur ni les tests d'autorisation.
