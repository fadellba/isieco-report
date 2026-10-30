# Stack technique

## Versions effectivement épinglées

État lu dans les manifestes et fichiers de version de main au 30 octobre 2026. Les valeurs du dépôt priment sur les documents préparatoires antérieurs.

| Domaine | Technologie | Version |
|---|---|---|
| Runtime | Node.js | 22.23.4 (.nvmrc et .node-version) |
| Package manager | pnpm | 12.16.1 |
| Langage | TypeScript | 5.9.3 |
| Backend | NestJS | 11.2.5 |
| Web | React / React DOM | 19.2.3 |
| Build Web | Vite | 8.3.5 |
| Navigation Web | React Router DOM | 7.9.0 |
| Styles Web | Tailwind CSS | 3.4.17 |
| Mobile | Expo | SDK 57, expo ~57.0.31 |
| Runtime natif | React Native | 0.86.3 |
| Navigation Mobile | Expo Router | 57.0.27 |
| Styles Mobile | NativeWind | 4.2.7 |
| Interop styles Mobile | react-native-css-interop | 0.2.7 |
| ORM | Prisma ORM / Client | 7.10.1 |
| Auth et Storage | Supabase JS | 2.118.0 |

@types/node est un paquet de déclarations TypeScript et ne change pas le runtime fixé par .nvmrc.

## Raisons des choix

**TypeScript** réduit la duplication entre Web, API et Mobile. **NestJS** structure l'API en modules, guards, pipes et couches. **React + Vite** suffisent à un back-office SPA et sa page publique de téléchargement. **React Native + Expo** fournit une application installable et l'accès aux capacités natives. **NativeWind** conserve une approche Tailwind dans React Native.

**PostgreSQL + Prisma** correspondent au MLD relationnel, aux clés composées, aux transactions et aux contraintes d'intégrité. Les contraintes non prises en charge directement par Prisma seront ajoutées en SQL versionné. **Supabase** fournit PostgreSQL, Auth et Storage ; NestJS conserve l'autorité sur les règles métier. **pnpm Workspaces** gère les applications indépendantes et leurs packages communs.

## Alternatives non retenues

| Alternative | Décision | Motif |
|---|---|---|
| Microservices | Non retenus | Partage des données et transactions ; aucun besoin d'échelle autonome démontré. |
| Kubernetes | Non retenu | Coût d'exploitation disproportionné pour le MVP. |
| Flutter | Non retenu | Ajouterait Dart à une stack TypeScript commune. |
| MongoDB | Non retenu | Le modèle et les contraintes sont relationnels. |
| PWA comme mobile principal | Non retenue | Le besoin Android prévoit une application installable et un APK. |
| Tailwind 4 / NativeWind 5 | Non retenus dans la config courante | NativeWind 4.2.7 est configuré avec Tailwind 3.4.17. Toute migration exige un test compatibilité dédié. |

## Commandes principales

| Commande | Rôle |
|---|---|
| pnpm install | Installer les dépendances du workspace. |
| pnpm build:packages | Compiler shared et api-client. |
| pnpm db:generate | Générer Prisma Client. |
| pnpm db:migrate | Migrations de développement. |
| pnpm db:deploy | Migrations versionnées validées. |
| pnpm typecheck | Vérifier TypeScript. |
| pnpm test | Lancer les tests du dépôt et applications. |
| pnpm build | Construire Web, API et Mobile. |
| pnpm api:openapi | Générer OpenAPI. |

## Politique d'évolution

Pas de dépendances alpha, beta, canary ou rc dans les versions livrées. Épingler les versions directes et commiter pnpm-lock.yaml. La CI utilise `pnpm install --frozen-lockfile` pour refuser toute dérive non committée du graphe de dépendances. Une mise à jour doit vérifier la compatibilité Expo SDK/React Native/NativeWind, générer Prisma, examiner SQL, exécuter les tests et construire les trois applications.

## Références

- Node.js : https://nodejs.org/en/about/previous-releases
- pnpm : https://pnpm.io/workspaces
- NestJS : https://docs.nestjs.com/
- React : https://react.dev/
- Vite : https://vite.dev/guide/
- Expo : https://docs.expo.dev/
- NativeWind : https://www.nativewind.dev/
- Prisma : https://www.prisma.io/docs
- PostgreSQL : https://www.postgresql.org/docs/
- Supabase : https://supabase.com/docs
