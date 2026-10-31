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
- Phase 14 intégrée dans main (PR #19) : administration Web des types de déchets, géographie, équipes, appartenances, compétences, disponibilité et délégations.
- Phase 15 intégrée dans main (PR #20) : pilotage des affectations, découverte des contenus et équipes éligibles, création, réponse d'équipe et réaffectation idempotentes.
- Phase 16 intégrée dans main (PR #21) : espace Agent terrain, équipes du compte connecté, réponse aux affectations, démarrage, preuves photo multipart et soumission des comptes rendus.
- Phase 17 intégrée dans main (PR #22) : file de vérification, preuves signées, décision conforme ou demande de reprise motivée.
- Phase 18 intégrée dans main (PR #23) : dépôt idempotent, liste paginée, détail et réponses aux demandes de complément sur les endpoints Reports existants.
- Phase 19 intégrée dans main (PR #24) : équipes propres au compte, missions, acceptation/refus, démarrage, compte rendu et reprise après décision du vérificateur.
- Phase 21 en cours sur `feat/phase-21-mobile-native-media` : caméra/galerie, upload privé citoyen et agent, aperçu par URL signée et localisation ponctuelle au premier plan. CI et recette sur appareils à valider.
- Prisma : 38 modèles métier du MLD v2.13 ; Supabase Auth gère les identités et sessions.
- Migrations : quatre migrations versionnées ; la CI les applique sur PostgreSQL vierge, vérifie l'historique, produit un aperçu additif et exécute les tests d'intégrité.
- CI : ci.yml et render-uml-class-diagrams.yml sont présents ; la CI de la PR #24 a réussi. Le run push de `main` après sa fusion reste à confirmer.
- Médias : upload privé, liens signés et commande de purge intégrés ; provisionnement du bucket, décision de rétention et planification Cron restent nécessaires.
- Web restant après la Phase 17 : aucun parcours métier Web principal ; restent la recette d'usage, la revue d'accessibilité et les fonctions secondaires de gestion.
- Mobile : authentification Supabase, parcours citoyen et parcours Agent terrain intégrés. Photo native et géolocalisation restent à réaliser.
- Phase 20 en cours sur `feat/phase-20-deployment-workflows-v2` : workflows de déploiement Vercel/Render déclenchés sur `main` ou manuellement et bloqués tant que la CI du même commit n'est pas verte. Deploy Hooks et URLs de smoke test à configurer comme secrets GitHub ; le secret `PRODUCTION_DEPLOY_ENABLED=true` est requis pour autoriser tout appel de déploiement. Aucun déploiement de production confirmé.
- Aucun APK Android de release signé n'est confirmé.

Consulter [l'état des livrables](architecture/etat-des-livrables.md) avant de considérer une fonctionnalité comme terminée.