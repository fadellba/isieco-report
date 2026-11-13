# État des livrables

Dernier snapshot opérationnel détaillé du **7 novembre 2026**. Un delta du dépôt `main` a été vérifié après les fusions des PR #91 et #94, sur le commit `dab3b2dc3aecc140709beae91cefa1525edec0be` du **13 novembre 2026**. Les constats récents ci-dessous priment sur le snapshot historique. La politique de périmètre sans abonnement payant est détaillée dans [Périmètre gratuit et reports liés aux coûts](../deployment/perimetre-offre-gratuite.md).

## Delta vérifié sur main au 13 novembre 2026 — commit `dab3b2d`

| Domaine | État au commit `dab3b2dc` |
|---|---|
| CI main | **Réussie** sur le commit de fusion : [run #43513727264](https://github.com/fadellba/isieco-report/actions/runs/43513727264). Migrations vierges, replay historique, API/OpenAPI, typecheck, tests et builds Web/API/Mobile réussis. |
| Migrations dans Git | **13 migrations** sont présentes dans `prisma/migrations`. |
| Migrations staging | Le run [Staging Forward Deploy #43513727249](https://github.com/fadellba/isieco-report/actions/runs/43513727249) s'arrête à `prisma migrate status` : `20261109100000_business_audit_event_order` et `20261109110000_backfill_business_audit_event_sequence_order` ne sont pas appliquées. Aucun hook Render, readiness, smoke test ou E2E staging n'a été exécuté. |
| Production Web/API | Les workflows [Web #43513727175](https://github.com/fadellba/isieco-report/actions/runs/43513727175) et [API #43513727195](https://github.com/fadellba/isieco-report/actions/runs/43513727195) confirment que `PRODUCTION_DEPLOY_ENABLED` n'est pas `true`, que `deployed=false` et que les smoke tests ont été ignorés. **Aucun déploiement production réalisé.** |
| PR #86 | **Fusionnée** dans `main`. Le signalement mobile peut être envoyé sans photo si au moins une information utile est fournie. |
| Mode hors ligne Mobile | Absent ; backlog [#87](https://github.com/fadellba/isieco-report/issues/87). |
| Carte native Mobile | Absente ; `apps/mobile/app/(agent)/map.tsx` reste un placeholder. L'API d'affectation expose déjà les coordonnées ; backlog [#88](https://github.com/fadellba/isieco-report/issues/88). |
| Notifications Mobile | Aucune notification métier push/localisée identifiée dans le package Mobile ; backlog [#90](https://github.com/fadellba/isieco-report/issues/90). |
| Cartographie Web | **Viewport + pagination keyset livrés** par la PR #94 : bornes validées, filtre SQL avant pagination, curseur stable lié au viewport, tri déterministe, total viewport stable, lookahead, gestion des dates nulles, réponse HTTP 400 documentée. Plafond serveur de 250 par page. |
| Actualisation Web | Polling REST de 60 secondes maintenu. SSE/WebSocket, reconnexion/rattrapage et fallback événementiel restent à réaliser dans [#89](https://github.com/fadellba/isieco-report/issues/89). |
| Performance cartographique | Pas encore de validation sur dataset volumineux / plans SQL représentatifs ; choix d'index spatial/PostGIS et clustering à mesurer avant implémentation. |
| GPS agents | Aucune télémétrie GPS des agents collectée, stockée ou diffusée. La géolocalisation ponctuelle citoyenne à l'avant-plan est distincte. |
| Tests physiques | Aucun test attesté sur appareils Android/iOS réels ; [#53](https://github.com/fadellba/isieco-report/issues/53) reste ouvert. |
| Sauvegarde / restauration | Aucune preuve d'une restauration indépendante depuis des sauvegardes PostgreSQL et Storage datées. Le drill actuel copie la source staging active ; il ne mesure pas le RPO d'un snapshot historique. [#54](https://github.com/fadellba/isieco-report/issues/54) et la porte de production [#51](https://github.com/fadellba/isieco-report/issues/51) restent ouvertes. |

La tranche viewport/pagination est fusionnée via [PR #94](https://github.com/fadellba/isieco-report/pull/94). Le chantier [#89](https://github.com/fadellba/isieco-report/issues/89) reste ouvert pour l'actualisation événementielle et les vérifications de performance/clustering.

## Snapshot historique des validations staging du 7 novembre



| Domaine | État vérifié |
|---|---|
| Architecture | Monorepo pnpm : API NestJS, Web React/Vite, Mobile Expo/React Native, packages partagés. L'architecture modulaire monolithique est conservée. |
| Modèle métier | 18 modèles Prisma dans `public`. Le ledger métier est une table séparée dans le schéma PostgreSQL `audit`. |
| Migrations staging au 7 novembre | **11 migrations Prisma appliquées** à cette date, aucune migration en attente signalée par `prisma migrate status` lors de ce contrôle. Les trois dernières sont `20261106140000_business_audit_referential_targets`, `20261106150000_foreign_key_indexes` et `20261106160000_prisma_schema_alignment`. Elles étendent le contrôle d'audit, ajoutent 15 index FK et alignent les noms d'objets PostgreSQL. Aucun contenu métier n'a été supprimé par ces trois migrations. |
| Cohérence Prisma | L'artefact de diff SQL généré par la CI après alignement ne contenait que `-- This is an empty migration.` : le schéma Prisma et l'historique de migrations sont alignés. |
| CI main | Le run [#42319641976](https://github.com/fadellba/isieco-report/actions/runs/42319641976) a réussi sur `d0a0deabd239e5adde8833a8488f5ff7a00442d6`. Il couvre migrations vierges et répétition historique, UML, génération Prisma, compilation API/OpenAPI, typecheck, tests et builds Web/API/Mobile. |
| API staging Render | Le run [Staging Forward Migrate and Deploy #42319641856](https://github.com/fadellba/isieco-report/actions/runs/42319641856) est terminé avec succès. Render sert le commit exact `d0a0deabd239e5adde8833a8488f5ff7a00442d6` (`dep-dbn78bbrjlhs739mvl0g`, statut `live`). Readiness DB, liveness et Swagger ont réussi. |
| Autorisations staging | Le run #42319641856 a réussi la matrice : 64 contrôles rôle/route (8 rôles × 8 routes) et 8 contrôles anonymes. Chaque rôle autorisé passe ; les sept autres rôles sont refusés sur chaque route ciblée. |
| Parcours métier E2E | Le run #42319641856 a réussi de bout en bout : citoyen → signalement → qualification → dossier → affectation → intervention terrain → vérification → clôture. La fixture E2E a été créée dans le staging. |
| Audit | Les mutations de référentiels, les ajouts/purges de médias et les transitions métier couvertes écrivent dans le ledger dans la transaction métier. Les événements restent append-only ; le chemin Storage et les URL signées ne sont pas enregistrés. La fonction trigger utilise désormais `search_path=pg_catalog`. |
| Index / performance | Les 15 index FK signalés ont été ajoutés et vérifiés dans PostgreSQL. L'advisor Supabase ne signale plus de FK non indexées. Il signale 23 index « inutilisés » sur le staging peu chargé ; ne pas les supprimer sans observation de charge représentative. |
| RLS et privilèges | Les 20 tables observées ont RLS activé. Aucun droit table n'a été retourné pour `anon`, `authenticated`, `service_role` ou `PUBLIC`. Les notices « RLS sans policy » de l'advisor correspondent à ce modèle fermé par privilèges ; ne pas ajouter de policy permissive pour faire disparaître l'avis. |
| Storage staging | Le run #42319641856 a validé le cycle réel de photo de signalement : upload via API, bucket privé, refus de téléchargement anonyme, URL signée de 60 secondes, téléchargement des octets attendus, expiration à 365 jours, purge ciblée, `mediaPurgeAt`, suppression confirmée de l'objet (`storage.objects_remaining=0`) et audit. Le test synthétique ne laisse aucun objet non purgé. Le chemin photo d'intervention reste à tester. |
| Purge média | Le workflow `.github/workflows/staging-media-purge.yml` est programmé chaque jour à **02:15 UTC** sur staging ; le déclenchement manuel exige `RUN`. Le service `MediaPurgeService` a été exercé avec succès sur une fixture isolée par le run E2E #42319641856. Le premier run du workflow planifié/manuel reste à observer ; les secrets propres à ce job n'ont pas encore été vérifiés par son exécution. |
| Rétention | Politique métier approuvée le 7 novembre 2026 : **365 jours à compter du dépôt** pour les photos de signalement et preuves d'intervention. `MEDIA_RETENTION_DAYS=365` est présent dans le run staging et l'API a effectivement persisté une échéance à 365 jours sur la fixture E2E. |
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

1. Observer le premier run du workflow quotidien `staging-media-purge.yml` à 02:15 UTC et vérifier ses compteurs ; compléter le test des preuves d'intervention et des scénarios d'échec/reprise Storage.
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
