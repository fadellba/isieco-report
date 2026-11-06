# Déploiement de l’API staging

## Cible

- Service Render : `isieco-api-staging`
- Service ID : `srv-dbj97gh42hec73cc2olg`
- URL : https://isieco-api-staging.onrender.com
- Projet Supabase : `isieco-report-staging` (`mlhbdautaxufubaybzyt`)
- Branche Render : `main`

La production est exclue de ce workflow. Il ne lit ni n'utilise `PRODUCTION_DEPLOY_ENABLED`, le Deploy Hook Render de production ou des secrets de production.

## Préparer les secrets GitHub

Dans **Settings → Environments → staging → Environment secrets**, conserver `STAGING_PRISMA_URL` et ajouter `STAGING_RENDER_DEPLOY_HOOK_URL`.

Dans **Settings → Secrets and variables → Actions → Variables**, créer la variable de dépôt `STAGING_API_DEPLOY_ENABLED=true` uniquement après avoir ajouté et vérifié le secret du Deploy Hook dans l'environnement `staging`. Tant que cette variable de dépôt n'existe pas ou vaut autre chose que `true`, un push sur `main` ne déclenche pas de déploiement automatique. Le lancement manuel avec le choix explicite `DEPLOY` reste disponible.

Créer le Deploy Hook depuis **Render → isieco-api-staging → Settings → Deploy Hook**. Conserver son URL uniquement comme secret `STAGING_RENDER_DEPLOY_HOOK_URL` dans l'environnement GitHub `staging`. Le workflow valide l'hôte et le service ID du hook avant toute requête et ne l'affiche jamais.

Le workflow valide également que `STAGING_PRISMA_URL` vise le pooler Session du projet Supabase staging (port 5432, utilisateur du projet, base `postgres`, TLS). Il exécute ensuite `prisma migrate status` en lecture seule. Si les migrations ne sont pas à jour, le déploiement applicatif est bloqué ; appliquer d'abord les migrations approuvées via le workflow staging dédié.

## Déroulement

`.github/workflows/api-staging-deploy.yml` surveille les pushs sur `main` qui touchent le code API, les packages partagés, Prisma ou les fichiers de dépendances. Le job de déploiement automatique reste désactivé tant que `STAGING_API_DEPLOY_ENABLED` n'est pas défini à `true`. Il peut aussi être lancé manuellement depuis `main`, en choisissant explicitement `DEPLOY`.

Il attend la CI réussie sur le SHA exact, vérifie l'état des migrations staging, demande à Render de déployer ce SHA précis, puis interroge `GET /api/v1/health/ready`. Il exécute ensuite des smoke tests sur le endpoint de liveness et l'interface Swagger.

La readiness doit renvoyer HTTP 200, `checks.database = ok` et `revision = GITHUB_SHA`. La révision provient de la variable système Render `RENDER_GIT_COMMIT`. Cela évite de considérer l'ancienne instance comme validée lorsque le nouveau déploiement est encore en cours.

## Contrôle manuel

- Liveness : `GET /api/v1/health`
- Readiness DB + révision : `GET /api/v1/health/ready`

Un déploiement Render accepté ou mis en file d'attente n'est pas une preuve de réussite. La preuve est la réponse readiness sur le commit attendu et l'état DB OK. Les smoke tests confirment seulement que l'API répond et que sa documentation est servie. Ils ne remplacent pas le parcours métier E2E ni les tests d'autorisation ; ces deux validations restent obligatoires avant de déclarer P0.1 terminé.
