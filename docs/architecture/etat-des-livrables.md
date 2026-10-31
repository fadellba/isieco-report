# État des livrables

État observé dans la branche de livraison au 30 octobre 2026. Présent = versionné ; initialisé = squelette ; à faire = pas encore livré ou validé.

| Domaine | Livrable | État |
|---|---|---|
| Architecture | Architecture client-serveur et monolithe modulaire | Documentée dans architecture-applicative.md et decisions.md. |
| Architecture | Structure cible du monorepo | Documentée ; le code sera aligné progressivement. |
| Déploiement | Choix GitHub/Vercel/Render/Supabase | Documenté dans docs/deployment. |
| CI | Workflow ci.yml | Présent ; les validations s’exécutent sur les commits concernés et ignorent les commits de fusion générés par GitHub. |
| CI/CD | web-deploy.yml et api-deploy.yml | À créer. |
| Toolchain | Node.js et pnpm | Versions épinglées dans .nvmrc, .node-version et package.json ; pnpm-lock.yaml versionné, CI configurée avec --frozen-lockfile. |
| Web | Connexion, accueil admin et /telecharger | Initialisés ; parcours métier incomplets. |
| Mobile | Expo, connexion, inscription, navigation initiale | Initialisés ; parcours citoyen et agent incomplets. |
| Mobile | APK Android signé et GitHub Release | À faire ; aucun APK de release confirmé. |
| Backend | Configuration API | Validation au démarrage des URL PostgreSQL/Supabase, du port, des origines CORS et de NODE_ENV. |
| Backend | Accounts | Provisionnement citoyen, profil personnel, administration des comptes, attributions/révocations transactionnelles, audit métier et protection du dernier administrateur ; tests unitaires en CI. |
| Backend | Referentials | Types de déchets, hiérarchie géographique, équipes, appartenances, compétences, disponibilité historisée et délégations ; habilitation GESTIONNAIRE_REFERENTIEL, événements d'audit atomiques et tests de service/PostgreSQL. |
| Backend | Reports | Soumission citoyenne idempotente, validation des référentiels et coordonnées, audit atomique, liste/détail limités au propriétaire ; 9 tests unitaires/API de service. Photos et stockage privé signés à compléter. |
| Backend | Qualification | File de qualification, demande/réponse de complément, acceptation avec catégories actives, rejet motivé et événements atomiques ; tests de service et CI complète verte. Fusionnée dans main. |
| Backend | Cases | Création de dossier depuis un signalement qualifié, rattachements/détachements avec provenance, consultation et historique, priorité/localisation historisées ; contrôles de concurrence et tests de service. Fusionnée dans main après CI complète verte. |
| Backend | Assignments | Affectation idempotente, contrôle équipe/compétence/disponibilité, réponse par un membre actif et réaffectation après refus ; événements atomiques et tests. Fusionnée dans main après CI complète verte. |
| Backend | Interventions | Démarrage sur affectation acceptée, appartenance active, compte rendu obligatoire, résultat/motif d’exception, blocage d’une nouvelle intervention jusqu’à décision de reprise ; événements atomiques et tests. Fusionnée dans main après CI complète verte. |
| Backend | Verification | File de compte rendus à vérifier, séparation des tâches, validation conforme, reprise motivée et clôture uniquement lorsque tous les contenus actifs sont terminés ; événements atomiques et tests. CI en cours. |
| Backend | Audit | Journalisation métier écrite par les modules ; consultation et export centralisés à compléter.
| Merise | MLD v2.13 dans Prisma | 38 modèles présents ; EvenementMetier possède des cibles explicites pour équipes, types de déchets et subdivisions géographiques. |
| Base de données | PostgreSQL local et base shadow | Deux services Docker distincts et configuration SHADOW_DATABASE_URL ajoutés ; migrations appliquées et diff testé dans PostgreSQL CI. |
| Merise | Migrations SQL MLD v2.13 | Quatre migrations versionnées : comptes/rôles, 35 modèles métier restants, contraintes d'intégrité et cibles géographiques d'audit. Application sur PostgreSQL vierge et tests négatifs d'intégrité en CI requis pour ce lot ; projet Supabase distant non migré. |
| UML | Diagramme de cas d’utilisation détaillé | SVG avec 8 acteurs et relations `<<include>>` / `<<extend>>`, plus fiches par acteur. Spécification cible ; non équivalente à une implémentation. |
| UML | Diagramme de classes détaillé | Source Mermaid versionnée avec les 38 classes, attributs, clés et associations par domaine ; générée depuis le schéma Prisma. |
| UML | Diagrammes de contexte et vue relationnelle | SVG versionnés dans docs/uml. |
| API | OpenAPI | Générable et archivé comme artefact CI. |
| Exploitation | Projet Supabase distant et déploiements | Non validés. |

La soumission Reports, Qualification, Cases, Assignments et Interventions est intégrée à main. Verification est en validation ; médias privés et audit consultable restent à livrer. La compilation et la génération Prisma ne prouvent pas que les migrations s'appliquent sur une base réelle, que les règles métier sont correctes ou que les parcours fonctionnent sur appareil. Un livrable est terminé seulement après code, tests, sécurité, documentation et procédure de livraison.
