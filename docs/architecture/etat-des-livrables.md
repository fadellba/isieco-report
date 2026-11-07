# État des livrables

État vérifié le **6 novembre 2026**. Le commit courant de `main` est `ec7e8b57c1b41cbc9e5f35a63bc4a11ea248e3ac`. La politique de périmètre sans abonnement payant est détaillée dans [Périmètre gratuit et reports liés aux coûts](../deployment/perimetre-offre-gratuite.md).

## Résultat des phases exécutables

| Domaine | État vérifié |
|---|---|
| Architecture | Monorepo pnpm : API NestJS, Web React/Vite, Mobile Expo/React Native, packages partagés. L'architecture modulaire monolithique est conservée. |
| Modèle métier | 18 modèles Prisma dans `public`. Le ledger métier est une table séparée dans le schéma PostgreSQL `audit`. |
| Migrations staging | **11 migrations Prisma appliquées**, aucune migration en attente signalée par `prisma migrate status`. Les trois dernières sont `20261106140000_business_audit_referential_targets`, `20261106150000_foreign_key_indexes` et `20261106160000_prisma_schema_alignment`. Elles étendent le contrôle d'audit, ajoutent 15 index FK et alignent les noms d'objets PostgreSQL. Aucun contenu métier n'a été supprimé par ces trois migrations. |
| Cohérence Prisma | L'artefact de diff SQL généré par la CI après alignement ne contenait que `-- This is an empty migration.` : le schéma Prisma et l'historique de migrations sont alignés. |
| CI main | Le run [#42309235973](https://github.com/fadellba/isieco-report/actions/runs/42309235973) a réussi sur le commit courant `ec7e8b57c1b41cbc9e5f35a63bc4a11ea248e3ac`. Il couvre migrations vierges et répétition historique, UML, génération Prisma, compilation API/OpenAPI, typecheck, tests et builds Web/API/Mobile. |
| API staging Render | Le run [Staging Forward Migrate and Deploy #42308007540](https://github.com/fadellba/isieco-report/actions/runs/42308007540) est terminé avec succès. Render sert le commit exact `29ce3f46634d80e33860ccda4abf21cf194f36a0` (`dep-dbn5m0rncjis73e7d2ag`, statut `live`). Readiness DB, liveness et Swagger ont réussi. |
| Autorisations staging | La matrice a réussi : 64 contrôles rôle/route (8 rôles × 8 routes) et 8 contrôles anonymes. Chaque rôle autorisé passe ; les sept autres rôles sont refusés sur chaque route ciblée. |
| Parcours métier E2E | Réussi de bout en bout : citoyen → signalement → qualification → dossier → affectation → intervention terrain → vérification → clôture. La fixture E2E a été créée dans le staging. |
| Audit | Les mutations de référentiels, les ajouts/purges de médias et les transitions métier couvertes écrivent dans le ledger dans la transaction métier. Les événements restent append-only ; le chemin Storage et les URL signées ne sont pas enregistrés. La fonction trigger utilise désormais `search_path=pg_catalog`. |
| Index / performance | Les 15 index FK signalés ont été ajoutés et vérifiés dans PostgreSQL. L'advisor Supabase ne signale plus de FK non indexées. Il signale 23 index « inutilisés » sur le staging peu chargé ; ne pas les supprimer sans observation de charge représentative. |
| RLS et privilèges | Les 20 tables observées ont RLS activé. Aucun droit table n'a été retourné pour `anon`, `authenticated`, `service_role` ou `PUBLIC`. Les notices « RLS sans policy » de l'advisor correspondent à ce modèle fermé par privilèges ; ne pas ajouter de policy permissive pour faire disparaître l'avis. |
| Storage staging | Contrôle du 6 novembre : bucket `isieco-private-media` privé (`public=false`), limite 10 MiB et MIME JPEG/PNG/WebP. Croisement SQL/Storage : 1 ligne photo de signalement, 1 objet correspondant présent, 0 objet manquant, 0 objet orphelin, 0 photo d'intervention et 0 média expiré. Les tests API synthétiques d'upload, d'URL signée, d'expiration et de purge restent à exécuter après décision de rétention. Ces tests ne nécessitent pas de montée en offre payante. |
| Purge média | Le workflow `.github/workflows/staging-media-purge.yml` est fusionné dans `main` et programmé quotidiennement à **02:15 UTC** sur staging ; le déclenchement manuel exige `RUN`. Le premier run planifié n'est pas encore confirmé. Les secrets `STAGING_PRISMA_URL` et `STAGING_SUPABASE_SECRET_KEY` sont référencés par le job, mais leur présence effective ne peut pas être vérifiée en lecture seule. |
| Rétention | Politique métier approuvée le 7 novembre 2026 : **365 jours à compter du dépôt** pour les photos de signalement et preuves d'intervention. `MEDIA_RETENTION_DAYS=365` a été enregistré sur Render `isieco-api-staging` ; le déploiement `dep-dbn6qfegekts739871t0` a été déclenché. La prise en compte runtime et les tests synthétiques d'upload, d'expiration et de purge restent à confirmer. |
| Auth Supabase | L'organisation Supabase est sur l'offre Free. La protection contre les mots de passe compromis via HaveIBeenPwned est réservée à Pro et supérieur ; elle est donc **différée pour raison de coût** (#55), sans contournement ni changement de plan. Il n'existe pas d'équivalent natif sur Free. Les règles générales de robustesse du mot de passe restent applicables, sans être présentées comme un remplacement de cette vérification. Voir [Password security](https://supabase.com/docs/guides/auth/password-security) et [Périmètre gratuit](../deployment/perimetre-offre-gratuite.md). |
| Application Mobile | `expo export --platform android` passe en CI mais ne produit pas d'APK signé. EAS Free inclut actuellement jusqu'à 15 builds Android et 15 builds iOS par mois, en file basse priorité ; le profil `preview-apk` peut donc être utilisé sans abonnement payant dans la limite du quota. L'identifiant Expo du projet n'est pas encore lié dans `app.json` et la présence de `EXPO_TOKEN`/credentials n'est pas vérifiable par l'intégration. Aucun APK signé n'est attesté. |
| Recette appareils | Aucun test physique n'est attesté. La recette Android avec un APK interne est réalisable avec le quota EAS Free. La distribution iOS interne ad hoc sur iPhone exige un compte Apple Developer payant ; elle est différée. Un smoke test sur iPhone avec Expo Go reste une alternative gratuite pour les parcours compatibles. Le protocole est dans [docs/mobile/recette-appareils.md](../mobile/recette-appareils.md). |
| Fonctionnalités Mobile restantes | Notifications, mode hors connexion et affichage des preuves d'intervention après upload restent hors du périmètre livré. |
| Sauvegarde / restauration | La voie gratuite par export logique manuel `supabase db dump --remote`, restauration dans une base isolée et export séparé des objets Storage est documentée dans [staging-database.md](../deployment/staging-database.md). La répétition réelle reste à exécuter. Les sauvegardes quotidiennes gérées Supabase (Pro+) et PITR (option payante) sont différées ; elles ne sont pas nécessaires pour réaliser le test manuel sur l'offre Free. |
| Production | **Non déployée.** Les workflows API [#42309236018](https://github.com/fadellba/isieco-report/actions/runs/42309236018) et Web [#42309236104](https://github.com/fadellba/isieco-report/actions/runs/42309236104) sur le commit courant ont terminé, mais leurs logs confirment `PRODUCTION_DEPLOY_ENABLED` différent de `true`, les Deploy Hooks de production non configurés et `deployed=false`. Aucun déploiement production n'a été effectué. |

## Corrections de code fusionnées

La PR #44 a corrigé les invariants de dossier, le quota photo concurrent, la séparation des tâches du vérificateur et la couverture d'audit. Les PR #45 à #47 ont ajouté puis fiabilisé le workflow contrôlé de migration et de déploiement staging : attente de CI sur le SHA exact, allowlist fermée de migrations, contrôle par Prisma Migrate sans relâcher la RLS du journal, déploiement Render exact et tests E2E.

## Périmètre d'exécution sans abonnement payant

Le projet reste sur les offres gratuites. Les sous-tâches réalisables sans achat restent dans le périmètre actif ; seules les fonctions qui exigent effectivement une formule payante sont différées. Le détail, les limites et les sources tarifaires sont dans [Périmètre gratuit et reports liés aux coûts](../deployment/perimetre-offre-gratuite.md).

### À réaliser dans le périmètre gratuit

1. Valider la politique métier de rétention, configurer `MEDIA_RETENTION_DAYS` après approbation, vérifier les secrets du job, puis exécuter le test Storage synthétique (upload, URL signée de 60 secondes, expiration, purge et audit).
2. Lier le projet Expo, configurer `EXPO_TOKEN` et les credentials nécessaires, produire un APK Android interne via `preview-apk` en restant dans le quota EAS Free, puis calculer son SHA-256 et le tester sur Android physique.
3. Réaliser le test de restauration manuel gratuit : export logique PostgreSQL via Supabase CLI, export distinct des objets Storage, restauration dans un environnement isolé, contrôle des références et consignation du RPO/RTO observés.
4. Réaliser sur iPhone un smoke test gratuit avec Expo Go pour les parcours compatibles. Les tests exigeant une distribution iOS ad hoc signée restent différés avec le compte Apple Developer payant.

### Différé jusqu'à décision budgétaire explicite

- Activer HaveIBeenPwned dans Supabase Auth : nécessite Supabase Pro ou supérieur (#55).
- Activer les sauvegardes quotidiennes gérées Supabase (Pro+) ou PITR (option payante). Le périmètre gratuit conserve l'export logique manuel et la sauvegarde séparée des objets Storage.
- Produire une build iOS interne ad hoc pour installation directe sur iPhone, ou publier sur les stores : un compte Apple Developer payant est requis pour la distribution ad hoc/App Store ; l'adhésion Google Play est requise pour publier sur Google Play.
- Passer à un plan EAS payant uniquement si le quota mensuel gratuit (15 builds Android et 15 builds iOS) devient insuffisant et après approbation.

Aucun achat, changement de plan, surcoût d'usage ni déploiement de production n'est autorisé par ce périmètre. La production reste désactivée jusqu'aux validations techniques, à la revue des risques résiduels et à une approbation explicite.

## Garde-fous à conserver

- Ne pas activer `PRODUCTION_DEPLOY_ENABLED` sur la base d'une CI verte seule.
- Ne pas traiter une migration sur base vierge comme preuve de restauration de données réelles.
- Ne pas supprimer les index « inutilisés » sur la seule base des statistiques d'un staging à faible volume.
- Ne pas ouvrir les tables à `anon`/`authenticated` ni ajouter de policy RLS permissive pour satisfaire le linter.
- Ne pas publier un APK de production avant la recette physique, la validation sécurité et la restauration du plan de reprise.
