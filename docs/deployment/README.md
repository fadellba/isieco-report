# Déploiement et exploitation

## Schéma de déploiement

![Architecture de déploiement ISI-Eco Report](architecture-deploiement.svg)

Voir [l'architecture de déploiement détaillée](architecture-deploiement.md) pour la description des flux, des plateformes et des limites.

## Cible MVP

GitHub héberge le monorepo et les workflows. Vercel héberge le Web React/Vite, Render exécute l'API NestJS, Supabase fournit PostgreSQL, Auth et Storage. L'application Android Expo est compilée séparément ; l'APK signé sera publié dans une GitHub Release et lié depuis la page publique /telecharger.

| Élément | Plateforme | Responsabilité |
|---|---|---|
| Source et collaboration | GitHub | Dépôt, branches, revues, issues, tags et Releases. |
| Intégration continue | GitHub Actions | Dépendances, génération Prisma/OpenAPI, tests, typecheck et builds. |
| Frontend Web | Vercel | Back-office et page /telecharger. Vérifier que l'usage est éligible au plan retenu. |
| Backend | Render | Une instance de l'API NestJS modulaire. |
| Base métier | Supabase PostgreSQL | Données relationnelles et transactions. |
| Identité | Supabase Auth | Identifiants, sessions et JWT. |
| Médias | Supabase Storage | Photos et preuves dans des buckets privés. |
| Distribution Android | GitHub Releases | APK signé, versionné, avec somme SHA-256. |

Les offres gratuites sont destinées au développement, aux tests et à la démonstration. Elles ne garantissent ni disponibilité permanente, ni support, ni coût nul en exploitation réelle. Render Free peut mettre en veille un service inactif ; Supabase Free a des quotas et conditions de pause ; Vercel Hobby est soumis à ses conditions d'utilisation personnelle/non commerciale. Vérifier les conditions avant mise en service publique.

## Parcours d'une requête

Le client crée une session Supabase Auth, transmet l'access token à l'API par HTTPS, puis NestJS vérifie le JWT et résout les rôles depuis la base métier. L'API applique les permissions, exécute la transaction PostgreSQL et utilise Storage pour les médias privés. Les clients ne reçoivent aucune clé privilégiée. Le disque local Render n'est jamais un stockage métier.

## Chaîne de livraison cible

1. Développement sur une branche.
2. Pull request et CI réussie.
3. Revue du code, des tests, du contrat OpenAPI et des migrations SQL.
4. Fusion dans la branche de livraison.
5. Déploiement du Web sur Vercel et de l'API sur Render.
6. Application contrôlée des migrations sur Supabase après test et sauvegarde.
7. Smoke tests de santé API, authentification, autorisations, signalement, affectation, intervention et média.
8. Si le Mobile a changé : build Android, signature, calcul SHA-256, publication GitHub Release et mise à jour du lien /telecharger.

## Docker et production

Docker Compose sert à lancer PostgreSQL et les dépendances locales. Kubernetes n'est pas retenu pour le MVP.

Avant un usage opérationnel, prévoir un plan d'hébergement adapté à la disponibilité attendue, sauvegardes indépendantes de la base et des médias, tests de restauration, supervision, gestion/rotation des secrets, domaine/TLS, politique de conservation et rollback des migrations.

## État dans le dépôt

Les workflows `web-deploy.yml` et `api-deploy.yml` sont intégrés dans `main` (Phase 20, PR #25). Ils se déclenchent sur un push vers `main` ou manuellement (sur `main` uniquement), puis exigent une exécution `CI` de type `push` réussie pour le SHA exact avant tout appel de Deploy Hook. Configurer les secrets GitHub `VERCEL_DEPLOY_HOOK_URL` et `RENDER_DEPLOY_HOOK_URL` pour activer les hooks ; le secret `PRODUCTION_DEPLOY_ENABLED` doit en plus valoir exactement `true` pour autoriser un appel en production. Ce verrou explicite reste désactivé par défaut. `WEB_SMOKE_URL` et `API_SMOKE_URL` sont facultatifs et doivent être des URL HTTPS de santé. Sur le commit de référence `6bfc822` (31 octobre 2026), les runs #41248396500 et #41248396526 ont attendu puis confirmé la CI verte (#41248396450), mais leurs journaux montrent que l'opt-in et les Deploy Hooks étaient vides : aucun appel Vercel/Render n'a été envoyé et les smoke tests ont été ignorés. Un statut GitHub Actions `success` signifie ici que le workflow de garde s'est terminé correctement, pas qu'un déploiement a eu lieu. Aucun déploiement de production ni APK de release signé n'est confirmé. Le SQL snapshot CI n'est pas l'équivalent d'une migration additive appliquée à PostgreSQL.