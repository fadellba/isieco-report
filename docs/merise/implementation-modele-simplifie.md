# Traduction du modèle métier simplifié vers Prisma et PostgreSQL

## Périmètre

Le schéma Prisma courant matérialise les **18 classes** du modèle métier simplifié. Il remplace la traduction historique du MLD v2.13 qui comptait 38 modèles. Les six premières migrations conservent l'historique du schéma précédent ; la migration `20261105000000_simplified_domain_model` opère la réduction.

## Inventaire

| Classe métier | Modèle Prisma | Table |
|---|---|---|
| Utilisateur | `Utilisateur` | `utilisateur` |
| Role | `Role` | `role` |
| UtilisateurRole | `UtilisateurRole` | `utilisateur_role` |
| TypeDechet | `TypeDechet` | `type_dechet` |
| Equipe | `Equipe` | `equipe` |
| AppartenanceEquipe | `AppartenanceEquipe` | `appartenance_equipe` |
| CompetenceEquipe | `CompetenceEquipe` | `competence_equipe` |
| Signalement | `Signalement` | `signalement` |
| PhotoSignalement | `PhotoSignalement` | `photo_signalement` |
| ContenuSignalement | `ContenuSignalement` | `contenu_signalement` |
| HistoriqueStatutSignalement | `HistoriqueStatutSignalement` | `historique_statut_signalement` |
| DemandeComplement | `DemandeComplement` | `demande_complement` |
| Dossier | `DossierTraitement` | `dossier_traitement` |
| ContenuDossier | `ContenuDossier` | `contenu_dossier` |
| Affectation | `Affectation` | `affectation` |
| Intervention | `Intervention` | `intervention` |
| PhotoIntervention | `PhotoIntervention` | `photo_intervention` |
| Verification | `Verification` | `verification` |

## Traduction des associations

- Un utilisateur possède des rôles via `UtilisateurRole`, avec dates de début et de fin.
- Un utilisateur appartient à une équipe via `AppartenanceEquipe`.
- Une équipe déclare ses compétences par type de déchet via `CompetenceEquipe`.
- Un signalement est déclaré par un utilisateur, peut être associé à zéro ou un dossier, et possède des photos, des contenus par catégorie, des demandes de complément et un historique de statut.
- Un dossier regroupe des contenus par type de déchet.
- Une affectation porte sur un contenu de dossier et référence une équipe ainsi qu'une compétence.
- Une affectation peut contenir plusieurs interventions. Une intervention peut avoir des photos et au plus une vérification.

## Clés et contraintes

- Les identifiants métier sont des UUID PostgreSQL.
- Les classes d'association `UtilisateurRole` et `AppartenanceEquipe` conservent des clés primaires composites incluant `dateDebut`.
- Les codes de rôle, types de déchet et références de dossier sont uniques.
- Le couple dossier/type de déchet est unique dans `ContenuDossier`.
- Une seule affectation ouverte est autorisée par contenu de dossier.
- `Verification.idIntervention` est unique lorsqu'il est renseigné ; il reste nullable uniquement pour les historiques sans correspondance.
- Les tables métier sont protégées par RLS et ne donnent pas de droits directs aux rôles Data API Supabase. L'accès applicatif passe par l'API de confiance.

Les validations de périodes, quantités, coordonnées, rétention des photos et règles historiques complémentaires sont portées par les migrations SQL. Elles doivent rester couvertes par les tests d'intégrité PostgreSQL.

## Points techniques hors MCD

Supabase Auth reste responsable des identifiants de connexion et des sessions. `Utilisateur.authUserId` ne stocke qu'une référence UUID. Les clés et empreintes d'idempotence sont intégrées à `Signalement`. Les dates d'expiration et de purge restent dans les entités photo pour gérer la rétention.

## Réduction depuis le modèle historique

La migration copie l'association active signalement/dossier, fusionne la dernière qualification par catégorie avec le contenu déclaré, fusionne les réponses de complément, déplace l'identifiant des contenus de dossier vers une clé UUID et rattache chronologiquement les vérifications aux interventions.

Les anciennes révisions de qualification, rattachements terminés, événements legacy sans transition de statut, hiérarchies géographiques, historiques de localisation/priorité, provenances, disponibilités et délégations, notifications, badges, points et publications ne font plus partie des 18 modèles métier cibles. Un ledger d'audit append-only distinct (`audit.evenement_metier`, schéma PostgreSQL `audit`) a été ajouté par une migration ultérieure ; il conserve les événements métier actuels et les transitions historiques reprises. Les colonnes de workflow abandonné listées dans la migration sont également supprimées.

Ces suppressions sont intentionnelles mais irréversibles sans sauvegarde. L'absence d'une ligne orpheline dans un petit staging ne suffit pas à valider les volumes d'une base réelle. Le script de répétition CI utilise un jeu synthétique représentatif ; une restauration de sauvegarde sur environnement isolé demeure obligatoire avant staging ou production.
