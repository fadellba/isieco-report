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
| [Initialisation Supabase staging](deployment/staging-database.md) | Secret de connexion, migration Prisma manuelle et vérifications de sécurité. |

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
- Phase 20 intégrée dans `main` (PR #25) : workflows Vercel/Render attendant la CI verte du même commit avant tout appel de Deploy Hook. Les workflows ont été exécutés sur le commit de référence ; la garde `PRODUCTION_DEPLOY_ENABLED` a empêché tout déploiement effectif.
- Phase 21 intégrée dans `main` (PR #26) : caméra/galerie, upload privé citoyen et agent, aperçu par URL signée et localisation ponctuelle au premier plan. CI complète verte ; recette sur appareils Android/iOS réels restante.
- Prisma : 38 modèles métier du MLD v2.13 ; Supabase Auth gère les identités et sessions.
- Staging : le projet Supabase `isieco-report-staging` est actif, mais sa base métier reste vierge tant que le workflow manuel `Staging Database Migrate` n'a pas été lancé depuis `main` avec le secret `STAGING_PRISMA_URL`. Voir [la procédure détaillée](deployment/staging-database.md).
- Migrations : cinq migrations Prisma versionnées ; la CI les applique sur PostgreSQL vierge, vérifie l'historique, produit un aperçu additif et teste les invariants ainsi que le verrouillage des accès Data API. Le workflow staging est manuel et n'est pas exécuté tant que `STAGING_PRISMA_URL` n'est pas configuré.
- CI : ci.yml et render-uml-class-diagrams.yml sont présents ; le run push de `main` sur le commit `7b02e5a` (31 octobre 2026) est vert : migrations PostgreSQL, génération OpenAPI, TypeScript, tests et builds Web/API/Mobile (run #41253417586).
- Médias : upload privé, liens signés et commande de purge intégrés ; bucket privé du projet Supabase de staging provisionné et vérifié le 31 octobre 2026. La migration Prisma de staging, les secrets API, la politique de rétention et le Cron restent à finaliser.
- Web restant après la Phase 17 : aucun parcours métier Web principal ; restent la recette d'usage, la revue d'accessibilité et les fonctions secondaires de gestion.
- Mobile : authentification Supabase, parcours citoyen et parcours Agent terrain intégrés ; photos natives et géolocalisation ponctuelle intégrées (PR #26). Notifications, mode hors connexion et recette appareils restent à réaliser.
- Déploiement : les workflows Web/API de la Phase 20 sont intégrés (PR #25). Les runs #41253417596 et #41253417593 ont attendu la CI du commit `7b02e5a`, puis ont explicitement ignoré l'appel Vercel/Render parce que `PRODUCTION_DEPLOY_ENABLED` et les URLs de Deploy Hook étaient absents. Les smoke tests ont donc été ignorés ; aucun déploiement de production n'est confirmé.
- Aucun APK Android de release signé n'est confirmé.

Consulter [l'état des livrables](architecture/etat-des-livrables.md) avant de considérer une fonctionnalité comme terminée.