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
- Backend intégré dans main : Accounts, Referentials, Reports, Qualification, Cases, Assignments, Interventions, Verification, Médias privés (PR #15) et Audit à portée limitée (PR #16).
- Web intégré dans main : shell et authentification par rôle, gestion des comptes et activité personnelle (PR #17), file/détail de qualification et gestion des dossiers (PR #18).
- Phase 14 en cours sur la branche `feat/phase-14-web-referentials` : écran d'administration des types de déchets, géographie, équipes, appartenances, compétences, disponibilité et délégations. La branche n'est pas encore fusionnée dans main.
- Prisma : 38 modèles métier du MLD v2.13 ; Supabase Auth gère les identités et sessions.
- Migrations : quatre migrations versionnées ; la CI les applique sur PostgreSQL vierge, vérifie l'historique, produit un aperçu additif et exécute les tests d'intégrité.
- CI : ci.yml et render-uml-class-diagrams.yml sont présents. Le dernier run de main après la fusion de la PR #18 a réussi le 31 octobre 2026.
- Médias : upload privé, liens signés et commande de purge intégrés ; provisionnement du bucket, décision de rétention et planification Cron restent nécessaires.
- Web restant après la Phase 14 : affectations, interventions et vérification.
- Mobile : squelette Expo, configuration et écrans placeholders ; parcours métier citoyen/agent, médias et géolocalisation à réaliser.
- web-deploy.yml et api-deploy.yml restent à créer ; aucun déploiement de production ni APK signé confirmé.

Consulter [l'état des livrables](architecture/etat-des-livrables.md) avant de considérer une fonctionnalité comme terminée.