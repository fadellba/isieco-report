# Organisation du monorepo

## Structure cible convenue

L'arborescence ci-dessous reprend la structure fonctionnelle validée pour le projet. Elle décrit la cible ; la section suivante précise les écarts actuels afin de ne pas confondre organisation attendue et code déjà livré.

~~~text
isieco-report/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── web-deploy.yml
│       └── api-deploy.yml
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
│   │   │   │   ├── authentication/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── reports/
│   │   │   │   ├── assignments/
│   │   │   │   ├── interventions/
│   │   │   │   └── administration/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   └── layout/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── routes/
│   │   │   └── styles/
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
│       │   │   ├── authentication/
│       │   │   ├── reports/
│       │   │   ├── tracking/
│       │   │   └── interventions/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── services/
│       └── package.json
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── constants/
│   │       ├── enums/
│   │       ├── schemas/
│   │       ├── types/
│   │       └── index.ts
│   └── api-client/
│       └── src/
│           ├── client/
│           ├── endpoints/
│           ├── types/
│           └── index.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docs/
│   ├── architecture/
│   ├── deployment/
│   ├── merise/
│   ├── technologies/
│   └── uml/
├── scripts/
├── .env.example
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .npmrc
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
~~~

## État réel sur main après la Phase 16

| Zone | Présent dans main | Évolution nécessaire |
|---|---|---|
| API | NestJS, configuration, auth, database, common/pipes, infrastructure/storage et les neuf modules métier avec contrôleurs, services et DTO. | Réorganiser progressivement les responsabilités auth/database vers infrastructure lors de changements isolés ; ajouter filters/interceptors/decorators uniquement lorsqu'un besoin concret apparaît. |
| Web | React/Vite, AuthProvider, shell, routes par rôle, dashboard, comptes, audit, qualification, dossiers, référentiels, affectations et espace Agent terrain (Phase 16 intégrée). | Interface de vérification en cours sur `feat/phase-17-web-verification` ; recette utilisateur et tests d'interaction à poursuivre. |
| Mobile | Expo Router, layout, authentification Supabase, parcours citoyen (Phase 18 intégrée) et espace Agent terrain en cours sur `feat/phase-19-mobile-agent-operations`. | Finaliser l'espace agent, ajouter image picker/géolocalisation compatibles SDK et compléter les parcours métier restants. |
| Packages | `shared` et `api-client` initialisés avec un client HTTP commun générique et des contrats encore limités. | Ajouter les types, schémas et endpoints partagés au rythme des consommateurs, sans dépendance circulaire. |
| CI/CD | `ci.yml` et `render-uml-class-diagrams.yml` présents. | Créer `web-deploy.yml` et `api-deploy.yml` après validation des secrets et des environnements. |
| Prisma | Schéma MLD v2.13 avec 38 modèles et quatre migrations versionnées. | Pas de migration identifiée pour les écrans Web restants ; toute évolution de schéma doit rester additive et testée. |

La Phase 15 (PR #20), la Phase 16 (PR #21), le parcours citoyen Mobile (PR #23) et la vérification Web (PR #22) sont intégrés dans `main`. La branche `feat/phase-19-mobile-agent-operations` développe le parcours Agent terrain Mobile ; elle n'est pas encore fusionnée.

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