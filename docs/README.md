# Documentation ISI-Eco Report

Cette documentation rassemble les décisions d'architecture, la stack technique, les livrables de conception et les procédures d'exploitation. Elle distingue systématiquement la cible retenue de l'état réellement implémenté.

## Navigation

| Rubrique | Contenu |
|---|---|
| [Architecture](architecture/README.md) | Architecture applicative, structure du monorepo, ADR, sécurité et état des livrables. |
| [Déploiement](deployment/README.md) | Cible GitHub, Vercel, Render, Supabase, CI/CD et distribution Android. |
| [Technologies](technologies/README.md) | Stack, versions épinglées, compatibilités et alternatives. |
| [Merise](merise/README.md) | MLD v2.13 et traduction Prisma. |
| [UML](uml/README.md) | Contexte, acteurs, cas d'utilisation et modèle conceptuel. |
| [API](api/README.md) | Contrat OpenAPI, authentification et documentation des endpoints. |
| [Stockage des médias](storage/README.md) | Bucket privé, upload API, liens signés, configuration et purge. |

## Références faisant autorité

En cas de divergence, appliquer cet ordre : décisions acceptées dans les ADR, versions et scripts déclarés dans le dépôt, MLD v2.13 et livrables UML validés, puis documents descriptifs. Toute évolution doit mettre à jour le document concerné dans le même changement que le code.

## État au 31 octobre 2026

- Monorepo pnpm avec API NestJS, Web React, Mobile Expo et deux packages partagés.
- Backend : Accounts, Referentials, Reports, Qualification, Cases, Assignments, Interventions et Verification intégrés à main.
- Prisma : 38 modèles métier du MLD v2.13 ; Supabase Auth gère les identités et sessions.
- Migrations : quatre migrations versionnées ; application sur PostgreSQL vierge, vérification du statut et tests d'intégrité dans la CI.
- CI : ci.yml existe et le dernier run connu sur main a réussi.
- Médias : endpoints d'upload et liens privés en cours de livraison sur la branche phase 10 ; provisionnement du bucket et purge restent nécessaires.
- Web/Mobile : authentification et profil présents ; interfaces métier à réaliser.
- web-deploy.yml et api-deploy.yml restent à créer ; aucun déploiement de production ni APK signé confirmé.

Consulter [l'état des livrables](architecture/etat-des-livrables.md) avant de considérer une fonctionnalité comme terminée.