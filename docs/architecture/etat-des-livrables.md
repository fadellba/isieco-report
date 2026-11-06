# État des livrables

État de référence : **6 novembre 2026**. Le commit de référence sur `main` pendant la vérification est `f14b89e6132fe2921e60449de8740d8f53c9ec50`. La simplification du modèle est intégrée (PR #33) et la PR #34 apporte la répétition de migration et la génération UML.

| Domaine | État vérifié |
|---|---|
| Architecture | Monorepo pnpm : API NestJS, Web React/Vite, Mobile Expo/React Native et packages partagés. |
| Modèle métier | 18 modèles Prisma dans `public`. Le journal d'audit est un schéma PostgreSQL distinct `audit`, hors du modèle métier Prisma. |
| Migrations sur `main` | Huit migrations Prisma présentes au commit de référence ; la migration de simplification transforme l'ancien schéma de 38 tables en 18 modèles métier. La migration du journal d'audit est incluse. |
| CI sur `main` | Le run [#42268959982](https://github.com/fadellba/isieco-report/actions/runs/42268959982) a réussi sur le commit exact de référence. La branche PR #44 a aussi validé la CI complète au run [#42303745540](https://github.com/fadellba/isieco-report/actions/runs/42303745540), commit `7f3df4841993d8f0955422f33df9d391b17f2f4a` : migration vierge + répétition historique, UML, typecheck, tests et builds Web/API/Mobile. |
| Répétition historique | La CI rejoue les migrations historiques sur une base PostgreSQL jetable, les fixtures synthétiques, la simplification et les assertions de conservation documentées. |
| UML/Merise | Générateur pour 18 classes, 32 associations et artefacts graphiques ; sources Mermaid et matrices de correspondance versionnées. |
| API / Web / Mobile | Compilation, tests et builds intégrés à la CI. La compilation ne remplace pas la recette utilisateur ni les tests physiques Android/iOS. |
| API staging Render | Le workflow [#42279020301](https://github.com/fadellba/isieco-report/actions/runs/42279020301) a déployé le commit de référence sur `isieco-api-staging`. La révision exacte, la readiness DB, liveness, Swagger, la matrice des huit rôles et le parcours citoyen → vérification ont tous réussi. |
| Supabase staging | Au moment du run #42279020301, `prisma migrate status` a confirmé l'absence de migration en attente sur le commit de référence. Le schéma public contenait les 18 tables métier et la table Prisma de suivi. |
| Storage staging | Le bucket privé `isieco-private-media` a été vérifié le 5 novembre (10 MiB, JPEG/PNG/WebP). Le workflow staging ne prouve pas encore l'upload, la lecture signée, l'expiration ou la purge depuis l'API. |
| Secrets et rétention | Les valeurs des secrets runtime ne sont pas lisibles par le connecteur. `SUPABASE_SECRET_KEY`, `MEDIA_RETENTION_DAYS` et la politique métier de conservation restent à contrôler dans l'environnement ; aucune durée ne doit être inventée. |
| Purge média | Le workflow `.github/workflows/staging-media-purge.yml` de la branche de durcissement planifie une exécution quotidienne à 02:15 UTC sur staging et propose un déclenchement manuel `RUN`. Il utilise les secrets existants de l'environnement GitHub `staging`, valide l'URL DB et le bucket cible, et traite au plus 100 médias de chaque type. Il ne devient actif qu'après fusion dans `main` ; une exécution réelle devra encore être vérifiée. |
| Sécurité/performance staging | Les 20 tables observées (18 tables métier, `_prisma_migrations`, audit) ont RLS activé. La requête de privilèges ne retourne aucun droit table pour `anon`, `authenticated`, `service_role` ou `PUBLIC`. L'advisor signale 20 tables RLS sans policy (cohérent avec ce modèle fermé par grants), la protection contre les mots de passe compromis désactivée, et 15 FK sans index. La branche ajoute les 15 index manquants au schéma Prisma et à une migration additive ; l'advisor devra être relancé après application staging. Les 8 index « inutilisés » du staging ne sont pas supprimés sans mesures sur une charge représentative. La migration d'audit fixe également le `search_path` de sa fonction trigger. |
| Sauvegarde | Aucune restauration complète d'une sauvegarde PostgreSQL et Storage n'est prouvée. Une sauvegarde non restaurée ne constitue pas un plan de reprise validé. |
| Production | Les workflows Render/Vercel existent mais le drapeau de déploiement production reste désactivé. Aucun déploiement production ni smoke test production n'est confirmé. |
| Mobile natif | La recette sur appareils Android/iOS réels, l'APK signé et la GitHub Release restent à produire. Notifications, mode hors connexion et affichage des preuves d'intervention après upload restent hors périmètre livré. |
| Branche de durcissement | La branche `codex/phase1-5-hardening` regroupe les corrections métier, le verrouillage du quota photo, l'audit des référentiels/médias et une migration additive d'extension du contrôle `entity_type`. La migration doit être appliquée au staging avant le déploiement de cette branche. |

## Séquence de clôture

1. CI complète réussie sur la branche de durcissement : run #42303745540, incluant tests, typecheck, OpenAPI et builds.
2. Faire relire puis fusionner la PR de durcissement.
3. Avant le déploiement staging de cette nouvelle migration, vérifier la nature des données présentes et satisfaire explicitement la confirmation de données jetables demandée par le workflow manuel. La migration ajoutée étend seulement les valeurs autorisées du journal d'audit, mais le workflow de migration exige une confirmation générale sur les données staging.
4. Vérifier les variables runtime Storage sans exposer les secrets, faire valider `MEDIA_RETENTION_DAYS`, fusionner puis observer le workflow de purge staging quotidien, et tester upload, URL signée, expiration et purge avec données synthétiques.
5. Tester Web/Mobile et les droits inter-comptes sur appareils réels Android/iOS ; produire et vérifier l'APK signé.
6. Effectuer une sauvegarde réelle et une restauration complète, incluant séparément les objets Storage.
7. N'activer la production qu'après validation formelle de la restauration, des secrets, de la rétention, de la purge, des tests, des Deploy Hooks et des smoke tests.

## Conditions de clôture

- Une migration sur base vierge ne prouve pas la préservation des données historiques.
- Le scénario CI synthétique ne remplace pas une sauvegarde réelle restaurée.
- Un workflow de déploiement vert peut signifier que le déploiement a été volontairement ignoré.
- La compilation ne remplace pas la recette utilisateur ni les tests d'autorisation.
