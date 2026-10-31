# État des livrables

État de référence : **31 octobre 2026, après fusion de la PR #21 ; Phase 17 intégrée dans sa branche de livraison et Phase 18 en cours**. « Intégré » signifie fusionné dans `main`. « Initialisé » signifie que la structure existe sans parcours métier complet. « En cours » désigne une évolution sur une branche non fusionnée. Un build vert ne vaut pas recette utilisateur.

| Domaine | Livrable | État |
|---|---|---|
| Architecture | Monolithe modulaire et monorepo pnpm | Architecture documentée ; alignement structurel progressif, sans déplacement massif requis. |
| Toolchain | Node.js, pnpm et lockfile | Versions épinglées ; installation CI en `--frozen-lockfile`. |
| CI | `.github/workflows/ci.yml` | Présent ; le run sur main après PR #18 a réussi le 31 octobre 2026. |
| CI UML | `render-uml-class-diagrams.yml` | Présent pour régénérer les vues UML à partir de la source versionnée. |
| CI/CD | Déploiements Web/API | `web-deploy.yml` et `api-deploy.yml` à créer ; aucun déploiement de production confirmé. |
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
| Médias | Bucket Supabase distant | À provisionner en privé ; secret serveur et durée de conservation à configurer. Aucun projet distant n'a été modifié par la PR #15. |
| Médias | Purge des objets expirés | Commande `pnpm storage:purge` intégrée ; planification Cron à configurer. |
| Web | Shell et authentification par rôle | Intégrés (PR #17) : contexte Supabase, profil API, gardes et navigation par rôle. |
| Web | Comptes et activité | Intégrés (PR #17) : gestion des rôles et journal personnel paginé/filtrable. |
| Web | Qualification et dossiers | Intégrés (PR #18) : file/détail de qualification, photos signées, compléments, décisions, création et gestion des dossiers. CI post-fusion réussie. |
| Web | Référentiels | Intégrés (PR #19) : types de déchets, géographie, équipes, appartenances, compétences, disponibilité et délégations. |
| Web | Affectations | Intégrées (PR #20) : découverte paginée, sélection d'équipes éligibles, création, suivi filtrable et réaffectation. |
| Web | Interventions | Intégrées (PR #21) : équipes du compte connecté, réponses aux affectations, démarrage, preuves photo multipart et compte rendu, auteur et appartenance vérifiés côté API. |
| Web | Vérification | En cours sur `feat/phase-17-web-verification` : file paginée, détail du compte rendu, photos privées signées à la demande, séparation des tâches, décision conforme et demande de reprise motivée. Non fusionnée dans main. |
| Web | Médias | Consultation des photos de qualification intégrée ; dépôt et consultation dans les autres parcours Web restent à réaliser. |
| Mobile | Parcours citoyen | Intégré (PR #23) : liste paginée propriétaire, dépôt idempotent, détail et réponses aux demandes de complément. Pas de photo native ni géolocalisation système. |\n| Mobile | Parcours Agent terrain | En cours sur `feat/phase-19-mobile-agent-operations` : équipes propres au compte, affectations, réponses, démarrage, compte rendu et reprise. Pas encore fusionné dans main. |
| Packages | `shared` et `api-client` | Initialisés ; contrats et endpoints dédiés à compléter à mesure des besoins des clients. |
| Base de données | MLD v2.13 | 38 modèles Prisma présents. |
| Base de données | Migrations | Quatre migrations versionnées ; CI applique l'historique sur PostgreSQL vierge et teste les contraintes d'intégrité. Projet Supabase distant non migré. |
| UML/Merise | Modèles et cas d'utilisation | Sources et vues versionnées ; elles décrivent le périmètre cible et ne remplacent pas la recette des écrans. |
| Exploitation | Vercel, Render, Supabase distant | Architecture documentée ; configuration et déploiements de production non confirmés. |
| Mobile | APK signé et GitHub Release | À faire ; aucun APK de release signé confirmé. |

## Prochain ordre de livraison recommandé

1. Finaliser et fusionner la Phase 17 sur le parcours de vérification indépendant.
2. Finaliser Phase 19 : parcours Mobile Agent terrain ; ajouter image picker et géolocalisation avec versions Expo compatibles.
3. Finalisation opérationnelle des médias : bucket privé, politique de rétention validée, tests de droits et Cron de purge.
4. Déploiements Web/API, smoke tests, sauvegardes/restauration et distribution Android signée.

## Règle de clôture d'un livrable

Un livrable n'est terminé qu'après implémentation, tests positifs et négatifs, sécurité, contrat OpenAPI, documentation synchronisée et validation de son environnement cible. La CI de compilation ne valide pas à elle seule les écrans, le bucket distant, les RLS, les secrets de l'environnement ni le processus de purge.