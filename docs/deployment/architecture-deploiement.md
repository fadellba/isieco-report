# Architecture de déploiement

## Diagramme

![Diagramme de déploiement ISI-Eco Report](architecture-deploiement.svg)

Le diagramme représente la cible du MVP : applications Web et Mobile, Vercel, Render, Supabase, GitHub Actions et publication de l'APK via GitHub Releases.

## Composants

| Élément | Plateforme | Responsabilité |
|---|---|---|
| Source et collaboration | GitHub | Monorepo, branches, revues, issues et versions. |
| Intégration continue | GitHub Actions | Tests, typecheck, builds et contrôle des migrations. |
| Frontend Web | Vercel | Back-office React/Vite et page publique /telecharger. |
| API | Render | Un backend NestJS modulaire exposant REST. |
| Base de données | Supabase PostgreSQL | Données relationnelles, contraintes et transactions. |
| Authentification | Supabase Auth | Identités, sessions et JWT. |
| Médias | Supabase Storage | Photos et preuves dans des buckets privés. |
| APK Android | GitHub Releases | Binaire signé, SHA-256 et notes de version. |

Les plans gratuits sont une cible de développement/démonstration soumise à quotas. Render peut mettre en veille une instance inactive, Supabase peut mettre en pause les projets inactifs et Vercel Hobby est soumis à ses conditions d'usage. Ne pas considérer cette configuration comme une plateforme de production critique.

## Flux

1. Les clients s'authentifient auprès de Supabase Auth.
2. Ils transmettent le JWT à l'API par HTTPS.
3. NestJS valide l'identité et résout les rôles métier en base.
4. L'API applique les permissions, exécute les transactions PostgreSQL et contrôle l'accès aux médias.
5. Le Web est destiné à être déployé sur Vercel ; l'API sur Render.
6. Une version Android doit produire un APK signé, calculer son SHA-256 et le publier dans une GitHub Release. La page /telecharger pointera vers cet actif.

Le stockage métier ne doit jamais dépendre du disque local Render.

## Chaîne de livraison

Les workflows `web-deploy.yml` et `api-deploy.yml` sont intégrés dans `main` (Phase 20, PR #25). Ils se déclenchent sur un push vers `main` ou manuellement depuis `main`, puis exigent une exécution du workflow `CI` de type `push` réussie pour le SHA exact avant tout appel de Deploy Hook.

Les secrets GitHub requis pour activer les appels de production sont :

- `VERCEL_DEPLOY_HOOK_URL` ;
- `RENDER_DEPLOY_HOOK_URL` ;
- `PRODUCTION_DEPLOY_ENABLED`, qui doit valoir exactement `true`.

Les URLs `WEB_SMOKE_URL` et `API_SMOKE_URL` sont facultatives et doivent être des URL HTTPS de santé. Sans opt-in ou sans Deploy Hook, aucun déploiement n'est envoyé. Les migrations Supabase de production restent une opération séparée après tests PostgreSQL, revue du SQL, sauvegarde et validation du plan de reprise.

## État vérifié au 31 octobre 2026

Sur le commit `ec1c7e08` :

- la CI (#41249349801) a réussi : installation figée, migrations PostgreSQL vierge, validation de l'historique, génération OpenAPI, TypeScript, tests et builds Web/API/Mobile ;
- le workflow Web Deploy (#41249349926) a confirmé la CI sur le SHA exact, mais a ignoré l'appel Vercel parce que `PRODUCTION_DEPLOY_ENABLED` n'était pas activé et que `VERCEL_DEPLOY_HOOK_URL` était absent ;
- le workflow API Deploy (#41249349921) a confirmé la CI sur le SHA exact, mais a ignoré l'appel Render parce que `PRODUCTION_DEPLOY_ENABLED` n'était pas activé et que `RENDER_DEPLOY_HOOK_URL` était absent ;
- les smoke tests ont été ignorés, puisqu'aucun Deploy Hook n'a été appelé.

Un résultat GitHub Actions `success` signifie ici que la garde de déploiement s'est terminée correctement ; il ne signifie pas qu'un déploiement a eu lieu. Aucun déploiement de production ni APK de release signé n'est confirmé à cette date.
