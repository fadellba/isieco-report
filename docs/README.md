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

## Références faisant autorité

En cas de divergence, appliquer cet ordre : décisions acceptées dans les ADR, versions et scripts déclarés dans le dépôt, MLD v2.13 et livrables UML validés, puis documents descriptifs. Toute évolution doit mettre à jour le document concerné dans le même changement que le code.

## État au 30 octobre 2026

- Monorepo pnpm avec API, Web, Mobile et deux packages partagés.
- Architecture cible : deux clients, une API REST et un backend NestJS modulaire.
- Prisma : 38 modèles métier du MLD v2.13. SESSION n'est pas reproduite ; Supabase Auth gère les sessions.
- Migrations : la migration initiale comptes/rôles existe ; l'historique complet des 38 tables n'est pas encore versionné et testé sur PostgreSQL.
- CI : ci.yml existe et le dernier run connu sur main a réussi.
- web-deploy.yml et api-deploy.yml restent à créer.
- Les modules métier hors comptes sont des squelettes ; la réussite du build ne vaut pas validation fonctionnelle.

Consulter [l'état des livrables](architecture/etat-des-livrables.md) avant de considérer une fonctionnalité comme terminée.