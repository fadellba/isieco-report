# État des livrables

État de référence : **31 octobre 2026**. « Intégré » signifie fusionné dans `main`. « Branche de travail » signifie développé sur une PR non encore fusionnée. Un build vert ne vaut pas recette utilisateur.

| Domaine | Livrable | État |
|---|---|---|
| Architecture | Monolithe modulaire et monorepo pnpm | Architecture documentée, code aligné progressivement. |
| Toolchain | Node.js, pnpm et lockfile | Versions épinglées ; installation CI en `--frozen-lockfile`. |
| CI | `.github/workflows/ci.yml` | Présent ; dernier run connu sur main réussi le 31 octobre 2026. |
| CI/CD | Déploiements Web/API | `web-deploy.yml` et `api-deploy.yml` à créer. |
| Backend | Accounts | Intégré : profils, provisionnement citoyen, administration des comptes et rôles, audit transactionnel et protection du dernier administrateur. |
| Backend | Referentials | Intégré : types de déchets, régions/départements/communes, équipes, appartenances, compétences, disponibilité historisée et délégations. |
| Backend | Reports | Intégré : soumission idempotente, validation de référentiels, suivi propriétaire, demandes/réponses de complément. Upload de photos sur la branche Phase 10. |
| Backend | Qualification | Intégré : file, demandes de complément, acceptation, rejet motivé et transitions atomiques. |
| Backend | Cases | Intégré : création, rattachements/détachements, provenance, priorité et localisation historisées. |
| Backend | Assignments | Intégré : affectation idempotente, vérification compétence/disponibilité, réponse d'équipe et réaffectation. |
| Backend | Interventions | Intégré : démarrage, compte rendu, résultat/exception et reprise. Upload de preuves photo sur la branche Phase 10. |
| Backend | Verification | Intégré : vérification indépendante, séparation des tâches, demande de reprise et clôture après achèvement des contenus actifs. |
| Backend | Audit | Les modules écrivent des événements métier dans la transaction. API centralisée de consultation, filtres et export à développer. |
| Médias | Infrastructure Storage privée | Branche Phase 10 : upload serveur, validation binaire JPEG/PNG/WebP, limite de 10 MiB, métadonnées photo, liens signés de 60 secondes et commande de purge bornée/auditée. Validation CI et revue encore nécessaires. |
| Médias | Bucket Supabase distant | À provisionner en privé ; secret serveur et durée de conservation à configurer dans l'environnement. Aucun projet distant n'a été modifié par cette branche. |
| Médias | Purge des objets expirés | Service et commande `pnpm storage:purge` ajoutés sur la branche Phase 10 : suppression Storage, horodatage `mediaPurgeAt`, événement d'audit atomique et retry des éléments en échec. Planification Cron et validation d'environnement à configurer. |
| Web | Connexion, profil administratif et page `/telecharger` | Initialisés ; interfaces métier à réaliser. |
| Mobile | Expo, connexion, inscription citoyenne et profil | Initialisés ; parcours métier citoyen/agent, médias et géolocalisation à réaliser. |
| Packages | `shared` et `api-client` | Initialisés ; contrats métier et endpoints à compléter au rythme des clients. |
| Base de données | MLD v2.13 | 38 modèles Prisma présents. |
| Base de données | Migrations | Quatre migrations versionnées ; CI applique l'historique sur PostgreSQL vierge et teste les contraintes d'intégrité. Projet Supabase distant non migré. |
| UML/Merise | Modèles et cas d'utilisation | Documents de conception versionnés ; ils décrivent le périmètre cible et ne remplacent pas la recette des écrans. |
| Exploitation | Vercel, Render, Supabase distant | Architecture documentée ; déploiements de production non confirmés. |
| Mobile | APK signé et GitHub Release | À faire ; aucun APK de release confirmé. |

## Ordre de livraison recommandé

1. Terminer la Phase 10 Médias : valider la CI, provisionner le bucket privé, configurer la rétention approuvée, tester les contrôles d'accès et planifier `pnpm storage:purge`.
2. Compléter Audit : consultation paginée, filtres autorisés, détail d'événement et export avec contrôle d'accès.
3. Développer les écrans métier Web et les parcours citoyens/agents Mobile sur les contrats API.
4. Mettre en place les déploiements, les smoke tests et la distribution Android signée.

## Règle de clôture d'un livrable

Un livrable n'est terminé qu'après implémentation, tests positifs et négatifs, sécurité, contrat OpenAPI, documentation synchronisée et validation de son environnement cible. La CI de compilation ne valide pas à elle seule les écrans, le bucket distant, les RLS ni le processus de purge.
