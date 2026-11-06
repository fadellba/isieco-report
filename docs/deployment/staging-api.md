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

Créer ce dernier depuis **Render → isieco-api-staging → Settings → Deploy Hook**. Le conserver uniquement comme secret GitHub. Le workflow valide l'hôte et le service ID du hook avant toute requête et ne l'affiche jamais.

Le workflow valide également que `STAGING_PRISMA_URL` vise le pooler Session du projet Supabase staging (port 5432, utilisateur du projet, base `postgres`, TLS). Il exécute ensuite `prisma migrate status` en lecture seule. Si les migrations ne sont pas à jour, le déploiement applicatif est bloqué ; appliquer d'abord les migrations approuvées via le workflow staging dédié.

## Déroulement

`.github/workflows/api-staging-deploy.yml` est déclenché par un push sur `main` qui touche le code API, les packages partagés, Prisma ou les fichiers de dépendances. Il peut aussi être lancé manuellement depuis `main`, en choisissant explicitement `DEPLOY`.

Il attend la CI réussie sur le SHA exact, vérifie l'état des migrations staging, demande à Render de déployer ce SHA précis, puis interroge `GET /api/v1/health/ready`.

La readiness doit renvoyer HTTP 200, `checks.database = ok` et `revision = GITHUB_SHA`. La révision provient de la variable système Render `RENDER_GIT_COMMIT`. Cela évite de considérer l'ancienne instance comme validée lorsque le nouveau déploiement est encore en cours.

## Contrôle manuel

- Liveness : `GET /api/v1/health`
- Readiness DB + révision : `GET /api/v1/health/ready`

Un déploiement Render accepté ou mis en file d'attente n'est pas une preuve de réussite. La preuve est la réponse readiness sur le commit attendu et l'état DB OK. Le test de readiness ne remplace pas le parcours métier E2E ni les tests d'autorisation.
