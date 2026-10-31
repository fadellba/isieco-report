# Organisation du monorepo

## Structure cible convenue

L'arborescence ci-dessous reprend la structure fonctionnelle validée pour le projet. Elle décrit la cible ; la section suivante précise les écarts actuels afin de ne pas confondre organisation attendue et code déjà livré.

~~~text
isieco-report/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── web-deploy.yml
│       ├── api-deploy.yml
│       └── staging-migrate.yml
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   └── pipes/
│   │   │   ├── config/
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/
│   │   │   │   ├── storage/
│   │   │   │   └── authentication/
│   │   │   └── modules/
│   │   │       ├── accounts/
│   │   │       ├── reports/
│   │   │       ├── cases/
│   │   │       ├── qualification/
│   │   │       ├── assignments/
│   │   │       ├── interventions/
│   │   │       ├── verification/
│   │   │       ├── referentials/
│   │   │       └── audit/
│   │   ├── test/
│   │   └── package.json
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── lib/
│   │   │   ├── pages/
│   │   │   └── styles.css
│   │   ├── public/
│   │   └── package.json
│   └── mobile/
│       ├── app/
│       │   ├── _layout.tsx
│       │   ├── (auth)/
│       │   ├── (citizen)/
│       │   └── (agent)/
│       ├── src/
│       │   ├── features/
│       │   └── lib/
│       └── package.json
├── packages/
│   ├── shared/
│   │   └── src/
│   │       └── index.ts
│   └── api-client/
│       └── src/
│           └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture/
│   ├── deployment/
│   ├── merise/
│   ├── technologies/
│   ├── mobile/
│   ├── storage/
│   └── uml/
├── scripts/
├── .env.example
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .npmrc
├── .prettierrc.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.base.json
~~~

L'arborescence ci-dessus est volontairement simplifiée : les fichiers de configuration et les sous-dossiers techniques existants restent décrits par le tree Git réel. Le fichier `prisma/seed.ts` et `eslint.config.mjs` ne sont pas présents dans `main` à la date de cette mise à jour.

## État réel sur main après la Phase 21

| Zone | Présent dans main | Évolution nécessaire |
|---|---|---|
| API | NestJS, configuration, `src/auth`, `src/database`, `common/pipes`, `infrastructure/storage` et les neuf modules métier avec contrôleurs, services, DTO et tests. | Réorganiser progressivement auth/database vers `infrastructure/authentication` et `infrastructure/database` lors de changements isolés ; ajouter filters/interceptors/decorators uniquement lorsqu'un besoin concret apparaît. |
| Web | React/Vite, AuthProvider, shell, navigation par rôle, dashboard, comptes, audit, qualification, dossiers, référentiels, affectations, interventions et vérification (Phases 12 à 17 intégrées, PR #17 à #22). | Recette utilisateur, accessibilité, recherche avancée de comptes, détails d'événements et fonctions secondaires de gestion à poursuivre. |
| Mobile | Expo Router, authentification Supabase, parcours citoyen (Phase 18), Agent terrain (Phase 19), photos natives et géolocalisation ponctuelle (Phase 21), intégrés dans main (PR #23, #24 et #26). | Recette sur appareils réels, notifications, mode hors connexion et distribution Android signée. |
| Packages | `shared` et `api-client` initialisés ; le client HTTP commun et les contrats restent limités. | Ajouter les types, schémas et endpoints partagés au rythme des besoins réels des consommateurs, sans dépendance circulaire. |
| CI/CD | `ci.yml`, `render-uml-class-diagrams.yml`, `web-deploy.yml` et `api-deploy.yml` intégrés (PR #25). Le workflow manuel `staging-migrate.yml` est ajouté pour appliquer l'historique Prisma au projet staging après configuration de `STAGING_PRISMA_URL`. | Configurer les secrets des Deploy Hooks Vercel/Render et les URLs de smoke test. Les déploiements production restent désactivés. |
| Prisma | Schéma MLD v2.13 avec 38 modèles et cinq migrations versionnées, dont le verrouillage RLS/Data API. | Le projet Supabase staging reste vierge jusqu'à l'exécution du workflow manuel ; toute évolution de schéma doit rester additive, révisée et testée sur PostgreSQL. |

Les Phases 12 à 21 sont intégrées dans `main` (PR #17 à #26). Les PR #27 à #29 ont synchronisé le registre des livrables, le guide de recette Mobile, les limites opérationnelles et les statuts des parcours Web. La CI du commit de référence `7b02e5a` est verte (run #41253417586) ; cela ne confirme ni un déploiement de production ni une recette sur appareils réels.

La structure cible demeure un guide d'organisation et non une obligation de déplacer immédiatement tous les fichiers. En particulier, l'authentification et Prisma sont encore dans `src/auth` et `src/database` ; leur migration vers `src/infrastructure` devra être isolée, testée et faite sans changer les contrats métier.

## Règles de dépendance

- Web et Mobile peuvent dépendre de shared et api-client.
- API peut dépendre de shared, jamais de composants clients.
- shared reste indépendant des frameworks, du réseau et de la base.
- api-client encapsule HTTP, authentification transport et gestion des erreurs.
- Prisma est consommé par l'API uniquement.
- Aucun client ne se connecte directement à PostgreSQL.

## Adoption

La cible est adoptée progressivement. Les déplacements de fichiers sont isolés dans des changements dédiés avec mise à jour des imports et tests. Éviter de coupler un grand déplacement structurel, une évolution de comportement métier et une migration de données dans le même lot.
