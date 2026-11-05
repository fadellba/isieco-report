# État des livrables

État de référence : **5 novembre 2026, après fusion de la PR #33 dans `main`. La CI #184 sur le commit `2db03a7b1443a35e96dd06daee032fa00ed73bcd` est verte.** « Intégré » signifie fusionné dans `main`. « Initialisé » signifie que la structure existe sans parcours métier complet. « En cours » désigne une évolution sur une branche non fusionnée. Un build vert ne vaut pas recette utilisateur.

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
| Base de données | MLD v2.13 | 18 modèles Prisma présents ; l'ancien schéma de 38 modèles est converti par la migration de simplification. |
| Base de données | Migrations | Sept migrations Prisma versionnées, dont la dernière est destructive ; la CI #184 a validé la base vierge. La répétition de la migration depuis les six migrations historiques avec données synthétiques est en cours dans une branche de suivi. Le projet staging reste vierge jusqu'à l'exécution du workflow manuel `Staging Database Migrate` avec `STAGING_PRISMA_URL`. |
| UML/Merise | Modèles et cas d'utilisation | Le diagramme de classes décrit désormais 18 modèles ; le workflow UML #3 a échoué car son générateur attendait encore 38 classes. Correctif du générateur et mise à jour des PNG/SVG en cours. |
| Exploitation | Vercel, Render, Supabase distant | Architecture documentée ; configuration et déploiements de production non confirmés. |
| Mobile | Recette native | À faire : tester permissions, galerie, caméra, conversion d'images et localisation sur appareils Android/iOS réels. |
| Mobile | APK signé et GitHub Release | À faire ; aucun APK de release signé confirmé. |

## Prochain ordre de livraison recommandé

1. Terminer et valider le test CI de répétition sur les anciennes migrations avec données synthétiques ; auditer les pertes de données et vérifier les mappings. Configurer ensuite les secrets API, faire valider `MEDIA_RETENTION_DAYS`, tester l'upload privé et planifier `pnpm storage:purge`.
2. Obtenir une sauvegarde restaurable ou un clone isolé, comparer les volumes historiques puis faire appliquer la migration en staging après validation explicite.
3. Recetter les parcours Web/Mobile et l'API sur staging, puis tester Android/iOS réels, RLS, uploads et droits inter-comptes. N'activer `PRODUCTION_DEPLOY_ENABLED=true` qu'après validation de la sauvegarde, de la restauration et de la fenêtre de changement.
4. Préparer la production uniquement après preuve de sauvegarde/restauration et validation de staging ; conserver les Deploy Hooks désactivés jusque-là.
5. Figer les livrables PFE : diagramme UML, modèle physique, dictionnaire de données et rapport de migration avec pertes/écarts.

## Règle de clôture d'un livrable

Un livrable n'est terminé qu'après implémentation, tests positifs et négatifs, sécurité, contrat OpenAPI, documentation synchronisée et validation de son environnement cible. La CI de compilation ne valide pas à elle seule les écrans, le bucket distant, les RLS, les secrets de l'environnement ni le processus de purge.
