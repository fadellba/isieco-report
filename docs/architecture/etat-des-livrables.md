# État des livrables

État de référence : **31 octobre 2026, après fusion de la PR #18**. « Intégré » signifie fusionné dans `main`. « Initialisé » signifie que la structure existe sans parcours métier complet. Un build vert ne vaut pas recette utilisateur.

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
| Web | Référentiels | À développer : types de déchets, géographie, équipes, appartenances, compétences, disponibilité et délégations. |
| Web | Affectations | À développer sur les API Assignments existantes. |
| Web | Interventions et vérification | À développer sur les API existantes. |
| Web | Médias | Consultation des photos de qualification intégrée ; dépôt et consultation dans les autres parcours Web restent à réaliser. |
| Mobile | Application citoyen/agent | Squelette Expo, configuration et écrans placeholders ; authentification intégrée, signalements, suivi, médias, géolocalisation et interventions restent à construire. |
| Packages | `shared` et `api-client` | Initialisés ; contrats et endpoints dédiés à compléter à mesure des besoins des clients. |
| Base de données | MLD v2.13 | 38 modèles Prisma présents. |
| Base de données | Migrations | Quatre migrations versionnées ; CI applique l'historique sur PostgreSQL vierge et teste les contraintes d'intégrité. Projet Supabase distant non migré. |
| UML/Merise | Modèles et cas d'utilisation | Sources et vues versionnées ; elles décrivent le périmètre cible et ne remplacent pas la recette des écrans. |
| Exploitation | Vercel, Render, Supabase distant | Architecture documentée ; configuration et déploiements de production non confirmés. |
| Mobile | APK signé et GitHub Release | À faire ; aucun APK de release signé confirmé. |

## Prochain ordre de livraison recommandé

1. Phase 14 : administration Web des référentiels (types de déchets, géographie, équipes et relations temporelles).
2. Phase 15 : interface Web des affectations.
3. Phase 16 : interface Web des interventions et preuves.
4. Phase 17 : interface Web de vérification.
5. Parcours Mobile citoyen et agent, avec contrats API existants.
6. Finalisation opérationnelle des médias : bucket privé, politique de rétention validée, tests de droits et Cron de purge.
7. Déploiements Web/API, smoke tests, sauvegardes/restauration et distribution Android signée.

## Règle de clôture d'un livrable

Un livrable n'est terminé qu'après implémentation, tests positifs et négatifs, sécurité, contrat OpenAPI, documentation synchronisée et validation de son environnement cible. La CI de compilation ne valide pas à elle seule les écrans, le bucket distant, les RLS, les secrets de l'environnement ni le processus de purge.