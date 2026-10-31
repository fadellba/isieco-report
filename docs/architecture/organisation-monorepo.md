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

## Écart avec le dépôt actuel

| Zone | Présent dans main | Évolution nécessaire |
|---|---|---|
| API | NestJS, auth, database, common/pipes, accounts et modules métier vides. | Déplacer progressivement auth et database vers infrastructure ; ajouter config et les autres éléments transversaux au besoin. |
| Web | React/Vite, AuthProvider, shell, gardes par rôles, dashboard, gestion des comptes et journal d'activité (branche Phase 12). | Compléter progressivement les features métier (qualification, dossiers, référentiels, affectations, interventions et vérification), composants UI et tests d'interaction. |
| Mobile | Expo Router, layout, index, connexion, inscription, client API et Supabase. | Créer les groupes de routes auth/citizen/agent et les features métier. |
| Packages | shared et api-client initialisés. | Compléter types/schémas/endpoints sans créer de dépendances cycliques. |
| CI/CD | ci.yml présent. | web-deploy.yml et api-deploy.yml non présents. |
| Prisma | 38 modèles MLD v2.13. | Compléter et tester l'historique des migrations. |

## Règles de dépendance

- Web et Mobile peuvent dépendre de shared et api-client.
- API peut dépendre de shared, jamais de composants clients.
- shared reste indépendant des frameworks, du réseau et de la base.
- api-client encapsule HTTP, authentification transport et gestion des erreurs.
- Prisma est consommé par l'API uniquement.
- Aucun client ne se connecte directement à PostgreSQL.

## Adoption

La cible est adoptée progressivement. Les déplacements de fichiers sont isolés dans des changements dédiés avec mise à jour des imports et tests. Éviter de coupler un grand déplacement structurel, une évolution de comportement métier et une migration de données dans le même lot.