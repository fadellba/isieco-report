# État des livrables

État observé dans main au 30 octobre 2026. Présent = versionné ; initialisé = squelette ; à faire = pas encore livré ou validé.

| Domaine | Livrable | État |
|---|---|---|
| Architecture | Architecture client-serveur et monolithe modulaire | Documentée dans architecture-applicative.md et decisions.md. |
| Architecture | Structure cible du monorepo | Documentée ; le code sera aligné progressivement. |
| Déploiement | Choix GitHub/Vercel/Render/Supabase | Documenté dans docs/deployment. |
| CI | Workflow ci.yml | Présent ; dernier run connu réussi. |
| CI/CD | web-deploy.yml et api-deploy.yml | À créer. |
| Web | Connexion, accueil admin et /telecharger | Initialisés ; parcours métier incomplets. |
| Mobile | Expo, connexion, inscription, navigation initiale | Initialisés ; parcours citoyen et agent incomplets. |
| Mobile | APK Android signé et GitHub Release | À faire ; aucun APK de release confirmé. |
| Backend | Accounts | Première implémentation. |
| Backend | Reports, cases, qualification, assignments, interventions, verification, referentials, audit | Squelettes ; règles et parcours à implémenter. |
| Merise | MLD v2.13 dans Prisma | 38 modèles présents. |
| Merise | Migrations SQL complètes | Incomplètes ; migration comptes/rôles initiale présente, reste à matérialiser et tester. |
| UML | Diagramme de cas d’utilisation détaillé | SVG avec 8 acteurs et relations `<<include>>` / `<<extend>>`, plus fiches par acteur. Spécification cible ; non équivalente à une implémentation. |
| UML | Diagramme de classes détaillé | Source Mermaid versionnée avec les 38 classes, attributs, clés et associations par domaine ; générée depuis le schéma Prisma. |
| UML | Diagrammes de contexte et vue relationnelle | SVG versionnés dans docs/uml. |
| API | OpenAPI | Générable et archivé comme artefact CI. |
| Exploitation | Projet Supabase distant et déploiements | Non validés. |

La compilation et la génération Prisma ne prouvent pas que les migrations s'appliquent sur une base réelle, que les règles métier sont correctes ou que les parcours fonctionnent sur appareil. Un livrable est terminé seulement après code, tests, sécurité, documentation et procédure de livraison.
