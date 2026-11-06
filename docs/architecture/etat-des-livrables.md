# État des livrables

État vérifié le **6 novembre 2026**. Le commit courant de `main` est `29ce3f46634d80e33860ccda4abf21cf194f36a0`.

## Résultat des phases exécutables

| Domaine | État vérifié |
|---|---|
| Architecture | Monorepo pnpm : API NestJS, Web React/Vite, Mobile Expo/React Native, packages partagés. L'architecture modulaire monolithique est conservée. |
| Modèle métier | 18 modèles Prisma dans `public`. Le ledger métier est une table séparée dans le schéma PostgreSQL `audit`. |
| Migrations staging | **11 migrations Prisma appliquées**, aucune migration en attente signalée par `prisma migrate status`. Les trois dernières sont `20261106140000_business_audit_referential_targets`, `20261106150000_foreign_key_indexes` et `20261106160000_prisma_schema_alignment`. Elles étendent le contrôle d'audit, ajoutent 15 index FK et alignent les noms d'objets PostgreSQL. Aucun contenu métier n'a été supprimé par ces trois migrations. |
| Cohérence Prisma | L'artefact de diff SQL généré par la CI après alignement ne contenait que `-- This is an empty migration.` : le schéma Prisma et l'historique de migrations sont alignés. |
| CI main | Le run [#42308007514](https://github.com/fadellba/isieco-report/actions/runs/42308007514) a réussi sur le commit exact `29ce3f46634d80e33860ccda4abf21cf194f36a0`. Il couvre migrations vierges et répétition historique, UML, génération Prisma, compilation API/OpenAPI, typecheck, tests et builds Web/API/Mobile. |
| API staging Render | Le run [Staging Forward Migrate and Deploy #42308007540](https://github.com/fadellba/isieco-report/actions/runs/42308007540) est terminé avec succès. Render sert le commit exact `29ce3f46634d80e33860ccda4abf21cf194f36a0` (`dep-dbn5m0rncjis73e7d2ag`, statut `live`). Readiness DB, liveness et Swagger ont réussi. |
| Autorisations staging | La matrice a réussi : 64 contrôles rôle/route (8 rôles × 8 routes) et 8 contrôles anonymes. Chaque rôle autorisé passe ; les sept autres rôles sont refusés sur chaque route ciblée. |
| Parcours métier E2E | Réussi de bout en bout : citoyen → signalement → qualification → dossier → affectation → intervention terrain → vérification → clôture. La fixture E2E a été créée dans le staging. |
| Audit | Les mutations de référentiels, les ajouts/purges de médias et les transitions métier couvertes écrivent dans le ledger dans la transaction métier. Les événements restent append-only ; le chemin Storage et les URL signées ne sont pas enregistrés. La fonction trigger utilise désormais `search_path=pg_catalog`. |
| Index / performance | Les 15 index FK signalés ont été ajoutés et vérifiés dans PostgreSQL. L'advisor Supabase ne signale plus de FK non indexées. Il signale 23 index « inutilisés » sur le staging peu chargé ; ne pas les supprimer sans observation de charge représentative. |
| RLS et privilèges | Les 20 tables observées ont RLS activé. Aucun droit table n'a été retourné pour `anon`, `authenticated`, `service_role` ou `PUBLIC`. Les notices « RLS sans policy » de l'advisor correspondent à ce modèle fermé par privilèges ; ne pas ajouter de policy permissive pour faire disparaître l'avis. |
| Storage staging | Le bucket `isieco-private-media` a été contrôlé le 5 novembre : privé, 10 MiB, JPEG/PNG/WebP. Le workflow de déploiement staging n'exécute pas de scénario réel d'upload, de lecture signée, d'expiration ou de purge. Ces quatre vérifications Storage restent à faire avec des objets synthétiques. |
| Purge média | Le workflow `.github/workflows/staging-media-purge.yml` est fusionné dans `main` et programmé quotidiennement à **02:15 UTC** sur staging ; le déclenchement manuel exige `RUN`. Le premier run planifié n'est pas encore confirmé. Les secrets `STAGING_PRISMA_URL` et `STAGING_SUPABASE_SECRET_KEY` sont référencés par le job, mais leur présence effective ne peut pas être vérifiée en lecture seule. |
| Rétention | La valeur runtime `MEDIA_RETENTION_DAYS` et la durée métier approuvée ne sont pas confirmées. Aucun délai de conservation ne doit être inventé. Les uploads sont refusés par l'API tant que la configuration requise n'est pas valide. |
| Auth Supabase | L'advisor continue de signaler la protection contre les mots de passe compromis désactivée. Elle doit être activée dans la configuration Auth Supabase par un administrateur du projet. Voir [Password security](https://supabase.com/docs/guides/auth/password-security). |
| Application Mobile | Les tests, le typecheck et `expo export --platform android` passent en CI. Les profils EAS `preview-apk` et `production-apk` existent, mais aucun APK signé ni GitHub Release n'a été produit ou vérifié dans cette exécution. |
| Recette appareils | Aucun test sur appareil Android/iOS physique n'est attesté. Le protocole est dans [docs/mobile/recette-appareils.md](../mobile/recette-appareils.md). |
| Fonctionnalités Mobile restantes | Notifications, mode hors connexion et affichage des preuves d'intervention après upload restent hors du périmètre livré. |
| Sauvegarde / restauration | Aucune restauration complète d'une sauvegarde PostgreSQL et Storage n'est attestée. La sauvegarde de base ne suffit pas à restaurer les objets du bucket. |
| Production | **Non déployée.** Les workflows API [#42308007371](https://github.com/fadellba/isieco-report/actions/runs/42308007371) et Web [#42308007491](https://github.com/fadellba/isieco-report/actions/runs/42308007491) ont terminé, mais leurs logs confirment `PRODUCTION_DEPLOY_ENABLED` différent de `true`, les Deploy Hooks de production non configurés et `deployed=false`. Aucun déploiement production n'a été effectué. |

## Corrections de code fusionnées

La PR #44 a corrigé les invariants de dossier, le quota photo concurrent, la séparation des tâches du vérificateur et la couverture d'audit. Les PR #45 à #47 ont ajouté puis fiabilisé le workflow contrôlé de migration et de déploiement staging : attente de CI sur le SHA exact, allowlist fermée de migrations, contrôle par Prisma Migrate sans relâcher la RLS du journal, déploiement Render exact et tests E2E.

## Conditions restantes avant clôture complète

1. Valider la politique métier de rétention, confirmer `MEDIA_RETENTION_DAYS`, vérifier les secrets Storage du job, puis observer un run réel du workflow de purge staging.
2. Faire un test synthétique complet du flux Storage : upload citoyen, preuve intervention, URL signée, expiration, purge et audit de purge.
3. Exécuter la recette sur au moins un appareil Android et un iPhone physiques, en suivant la matrice du protocole.
4. Vérifier la configuration Expo/EAS et les credentials Android, produire un APK signé via le profil `preview-apk`, calculer son SHA-256 et publier une release de test.
5. Effectuer et restaurer une sauvegarde de test de PostgreSQL **et** des objets Storage ; consigner les résultats et le RPO/RTO obtenus.
6. Activer la protection contre les mots de passe compromis dans Supabase Auth.
7. Ne débloquer la production qu'après ces preuves, l'approbation explicite de la mise en production et la configuration des Deploy Hooks/secrets de production.

## Garde-fous à conserver

- Ne pas activer `PRODUCTION_DEPLOY_ENABLED` sur la base d'une CI verte seule.
- Ne pas traiter une migration sur base vierge comme preuve de restauration de données réelles.
- Ne pas supprimer les index « inutilisés » sur la seule base des statistiques d'un staging à faible volume.
- Ne pas ouvrir les tables à `anon`/`authenticated` ni ajouter de policy RLS permissive pour satisfaire le linter.
- Ne pas publier un APK de production avant la recette physique, la validation sécurité et la restauration du plan de reprise.
