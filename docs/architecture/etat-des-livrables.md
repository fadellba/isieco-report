# État des livrables

État de référence : **31 octobre 2026, après fusion de la PR #29 ; Phases 20 et 21 intégrées et CI du commit `7b02e5a` sur `main` verte**. « Intégré » signifie fusionné dans `main`. « Initialisé » signifie que la structure existe sans parcours métier complet. « En cours » désigne une évolution sur une branche non fusionnée. Un build vert ne vaut pas recette utilisateur.

| Domaine | Livrable | État |
|---|---|---|
| Architecture | Monolithe modulaire et monorepo pnpm | Architecture documentée ; alignement structurel progressif, sans déplacement massif requis. |
| Toolchain | Node.js, pnpm et lockfile | Versions épinglées ; installation CI en `--frozen-lockfile`. |
| CI | `.github/workflows/ci.yml` | Présent ; run push du commit `7b02e5a` sur `main` vert (run #41253417586) : migrations PostgreSQL, OpenAPI, TypeScript, tests et builds Web/API/Mobile réussis. |
| CI UML | `render-uml-class-diagrams.yml` | Présent pour régénérer les vues UML à partir de la source versionnée. |
| CI/CD | Déploiements Web/API | Intégrés (PR #25) : workflows sur push `main` ou lancement manuel, attente de la CI réussie sur le même SHA, opt-in `PRODUCTION_DEPLOY_ENABLED=true`, Deploy Hooks Vercel/Render et smoke tests conditionnels. Les appels production restent désactivés. Les runs #41253417596/#41253417593 ont confirmé la CI sur le même SHA, puis ignoré les appels Vercel/Render car `PRODUCTION_DEPLOY_ENABLED` et les Deploy Hooks sont absents. Workflow staging `staging-migrate.yml` ajouté : déclenchement manuel sur `main`, confirmation `APPLY`, environnement `staging` et secret dédié. |
| Backend | Accounts | Intégré : profils, provisionnement citoyen, administration des comptes/rôles, audit transactionnel et protection du dernier administrateur. |
| Backend | Referentials | Intégré : types de déchets, régions/départements/communes, équipes, appartenances, compétences, disponibilité historisée et délégations. |
| Backend | Reports | Intégré : soumission idempotente, validation des référentiels, suivi propriétaire et demandes/réponses de complément. Upload privé de photos intégré (PR #15). |
| Backend | Qualification | Intégré : file, compléments, acceptation, rejet motivé et transitions atomiques. |
| Backend | Cases | Intégré : création, rattachements/détachements, provenance, priorité et localisation historisées. |
| Backend | Assignments | Intégré : affectation idempotente, contrôle de compétence/disponibilité, réponse d'équipe et réaffectation. |
| Backend | Interventions | Intégré : démarrage, compte rendu, résultat/exception et reprise. Upload privé de preuves photo intégré (PR #15). |
| Backend | Verification | Intégré : vérification indépendante, séparation des tâches, demande de reprise et clôture après achèvement des contenus actifs. |
| Backend | Audit | Intégré (PR #16) : journal personnel et historique des rôles à portée limitée, pagination/filtres, métadonnées sûres uniquement. Pas de listing global ni export. |
| Médias | Infrastructure Storage privée | Intégrée (PR #15) : upload serveur, validation JPEG/PNG/WebP, limite 10 MiB, liens signés 60 secondes et purge bornée/auditée. |
| Médias | Bucket Supabase staging | Provisionné sur `isieco-report-staging` et vérifié le 31 octobre 2026 : privé, 10 MiB, JPEG/PNG/WebP, RLS actif sur les tables Storage, aucune policy directe `anon`/`authenticated`, aucun objet. Secret serveur, politique de rétention et test d'upload API encore à configurer. |
| Médias | Purge des objets expirés | Commande `pnpm storage:purge` intégrée ; planification Cron à configurer. |
| Web | Shell et authentification par rôle | Intégrés (PR #17) : contexte Supabase, profil API, gardes et navigation par rôle. |
| Web | Comptes et activité | Intégrés (PR #17) : gestion des rôles et journal personnel paginé/filtrable. |
| Web | Qualification et dossiers | Intégrés (PR #18) : file/détail de qualification, photos signées, compléments, décisions, création et gestion des dossiers. CI post-fusion réussie. |
| Web | Référentiels | Intégrés (PR #19) : types de déchets, géographie, équipes, appartenances, compétences, disponibilité et délégations. |
| Web | Affectations | Intégrées (PR #20) : découverte paginée, sélection d'équipes éligibles, création, suivi filtrable et réaffectation. |
| Web | Interventions | Intégrées (PR #21) : équipes du compte connecté, réponses aux affectations, démarrage, preuves photo multipart et compte rendu, auteur et appartenance vérifiés côté API. |
| Web | Vérification | Intégrée (PR #22) : file paginée, détail du compte rendu, photos privées signées à la demande, séparation des tâches, décision conforme et demande de reprise motivée. |
| Web | Médias | Consultation des photos de qualification et upload des preuves d'intervention intégrés dans leurs parcours respectifs ; le dépôt Web de photos de signalement n'est pas un parcours livré. |
| Mobile | Parcours citoyen | Intégré (PR #23) : liste paginée propriétaire, dépôt idempotent, détail, réponses aux compléments, ajout de photos natives et position ponctuelle (PR #26). |
| Mobile | Parcours Agent terrain | Intégré (PR #24) : équipes propres au compte, affectations, réponses, démarrage, compte rendu, reprise et upload natif des preuves photo (PR #26). |
| Mobile | Photos et géolocalisation natives | Intégrées (PR #26) : image picker, capture caméra, conversion JPEG, upload privé citoyen/agent, aperçu par URL signée et localisation au premier plan sur demande. CI complète verte. |
| Packages | `shared` et `api-client` | Initialisés ; contrats et endpoints dédiés à compléter à mesure des besoins des clients. |
| Base de données | MLD v2.13 | 38 modèles Prisma présents. |
| Base de données | Migrations | Cinq migrations Prisma versionnées ; la CI applique l'historique sur PostgreSQL vierge et teste contraintes métier, activation RLS et absence d'accès Data API. Le projet staging reste vierge jusqu'à l'exécution du workflow manuel `Staging Database Migrate` avec `STAGING_PRISMA_URL`. |
| UML/Merise | Modèles et cas d'utilisation | Sources et vues versionnées ; elles décrivent le périmètre cible et ne remplacent pas la recette des écrans. |
| Exploitation | Vercel, Render, Supabase distant | Architecture documentée ; configuration et déploiements de production non confirmés. |
| Mobile | Recette native | À faire : tester permissions, galerie, caméra, conversion d'images et localisation sur appareils Android/iOS réels. |
| Mobile | APK signé et GitHub Release | À faire ; aucun APK de release signé confirmé. |

## Prochain ordre de livraison recommandé

1. Configurer l'environnement GitHub `staging` et le secret `STAGING_PRISMA_URL`, exécuter le workflow manuel de migration puis vérifier `_prisma_migrations`, RLS et les privilèges Data API. Configurer ensuite les secrets API, faire valider `MEDIA_RETENTION_DAYS`, tester l'upload privé et planifier `pnpm storage:purge`.
2. Recetter sur appareils Android/iOS réels les permissions, la galerie, la caméra, l'upload privé, l'aperçu signé et la localisation ponctuelle.
3. Préparer l'environnement de déploiement : renseigner les Deploy Hooks Vercel/Render et les URLs de smoke test, vérifier les domaines, variables d'environnement et migrations de production. N'activer `PRODUCTION_DEPLOY_ENABLED=true` qu'après validation de la sauvegarde, de la restauration et de la fenêtre de changement.
4. Générer et signer l'APK Android, publier une GitHub Release et vérifier le lien de téléchargement.
5. Exécuter la recette fonctionnelle de bout en bout, les tests de droits inter-comptes, la restauration et les smoke tests de production.

## Règle de clôture d'un livrable

Un livrable n'est terminé qu'après implémentation, tests positifs et négatifs, sécurité, contrat OpenAPI, documentation synchronisée et validation de son environnement cible. La CI de compilation ne valide pas à elle seule les écrans, le bucket distant, les RLS, les secrets de l'environnement ni le processus de purge.
