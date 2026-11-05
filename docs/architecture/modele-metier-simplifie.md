# Simplification du modèle métier

## Cible

Le modèle conceptuel simplifié du PFE devient la référence métier de l'application. Le schéma Prisma comporte 18 modèles : `Utilisateur`, `Role`, `UtilisateurRole`, `Signalement`, `PhotoSignalement`, `ContenuSignalement`, `HistoriqueStatutSignalement`, `DemandeComplement`, `DossierTraitement` (classe conceptuelle `Dossier`), `TypeDechet`, `ContenuDossier`, `CompetenceEquipe`, `Equipe`, `AppartenanceEquipe`, `Affectation`, `Intervention`, `PhotoIntervention` et `Verification`.

La [matrice UML/Prisma/PostgreSQL](../uml/diagramme-classes.md) détaille les attributs, clés, relations et écarts techniques.

## Règles de réduction

- Le lien Signalement-Dossier est direct via `signalement.id_dossier`. Un signalement appartient à zéro ou un dossier.
- Les qualifications courantes sont intégrées à `ContenuSignalement`.
- La réponse est stockée directement dans `DemandeComplement`, avec le répondant et la date.
- Les changements de statut sont stockés dans `HistoriqueStatutSignalement`.
- Une affectation référence un `ContenuDossier`, une équipe et une compétence d'équipe.
- Une vérification référence une intervention. La relation est unique ; elle reste nullable pour les anciennes vérifications sans correspondance.
- Les types de déchets et les compétences d'équipe utilisent un indicateur actif.
- Les hiérarchies géographiques, délégations, disponibilités détaillées, provenances, audit générique, notifications, gamification et publications sortent du périmètre simplifié.

## Champs techniques conservés

`Utilisateur.authUserId` référence Supabase Auth. Les clés d'idempotence restent dans `Signalement`. Les dates d'expiration et de purge restent dans les deux entités photo. Ces propriétés soutiennent les besoins techniques et ne constituent pas des classes métier supplémentaires.

Les photos utilisent une référence de stockage privée `referencePhoto`, et non trois champs séparés chemin/nom/MIME. Les classes d'association `UtilisateurRole` et `AppartenanceEquipe` préservent leurs clés composites temporelles. Ces différences doivent être assumées ou alignées dans une évolution ultérieure du modèle.

## Transformations et pertes d'historique

| Source ancienne | Transformation | Limite de conservation |
|---|---|---|
| `rattachement_signalement` | Le rattachement actif devient `signalement.id_dossier` | Les anciens rattachements terminés sont supprimés. |
| `idempotence_signalement` | Clé et empreinte déplacées dans `signalement` | Les dates de création de l'entrée d'idempotence ne sont pas conservées. |
| `qualification_signalement` | Dernière qualification par signalement/type fusionnée dans `contenu_signalement` | Les versions précédentes et les champs non représentés sont perdus. |
| `reponse_complement` | Réponse, répondant et date copiés dans `demande_complement` | Le modèle cible ne permet qu'une réponse. |
| `contenu_dossier` | Ajout d'un identifiant UUID propre | Des colonnes de workflow historiques sont supprimées. |
| `verification_resolution` | Chaque vérification est associée par rang chronologique à une intervention de la même affectation | Une vérification sans intervention correspondante garde `id_intervention = NULL`. |
| `evenement_metier` | Seules les transitions de statut détectables sont copiées | Les événements génériques non liés à un changement de statut sont supprimés. |
| Validité TypeDechet/CompetenceEquipe | Conversion en booléen `actif` | Les dates de fin/début sont perdues ; `dateAttribution` conserve le début de compétence. |

Les hiérarchies Région/Département/Commune, historiques de localisation/priorité, provenance, disponibilité et délégation, notifications, points, badges et publications sont supprimés par choix de périmètre. Les colonnes de publication/approbation des photos sont également supprimées ; les références de stockage et dates d'expiration/purge sont conservées.

## Validation

La CI teste les migrations sur une base PostgreSQL vierge et, séparément, rejoue les six migrations historiques sur une base jetable avec un jeu de données synthétiques. Le scénario vérifie le rattachement actif, l'idempotence, la dernière qualification, la réponse, les contenus/affectations, le mapping des vérifications, la conversion des indicateurs actifs et le filtrage des événements de statut.

Cette répétition couvre les chemins de transformation connus, mais pas les distributions de données d'une base réelle. Le staging Supabase observé conserve encore les six migrations historiques et ne possède aucune affectation, intervention ou vérification ; il n'est donc pas représentatif pour la recette métier.

**Aucune migration distante ne doit être appliquée avant d'avoir vérifié une sauvegarde restaurable ou préparé un clone isolé, puis comparé les volumes réels avant/après.** La CI verte n'est pas une preuve de sauvegarde ni de restauration.
