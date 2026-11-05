# Simplification réelle du modèle métier

## Cible

Le modèle conceptuel simplifié du PFE devient le modèle métier de référence. Le schéma Prisma expose désormais 18 modèles : Utilisateur, Role, UtilisateurRole, Signalement, PhotoSignalement, ContenuSignalement, HistoriqueStatutSignalement, DemandeComplement, DossierTraitement, TypeDechet, ContenuDossier, Equipe, CompetenceEquipe, AppartenanceEquipe, Affectation, Intervention, PhotoIntervention et Verification.

## Règles de réduction

- Le lien Signalement–Dossier est direct via `signalement.id_dossier`. Un signalement appartient à zéro ou un dossier.
- Les données de qualification sont intégrées à ContenuSignalement. L'état de qualification et l'agent/date sont conservés avec le contenu déclaré.
- La réponse est stockée directement dans DemandeComplement, avec le répondant et la date.
- Le statut d'un signalement est historisé dans HistoriqueStatutSignalement.
- Une affectation référence un ContenuDossier et une compétence d'équipe.
- Une vérification référence une intervention. Chaque intervention ne reçoit au plus qu'une vérification.
- Les types de déchets et compétences utilisent un indicateur actif simple.
- Les fonctions géographiques hiérarchiques, délégations, disponibilités détaillées, provenance des contenus, audit générique, notifications, badges, points et publications sortent du périmètre simplifié.

## Données techniques conservées

Les clés d'idempotence sont conservées dans Signalement. Les dates d'expiration et de purge sont conservées dans les deux tables de photos. Ces colonnes sont nécessaires au fonctionnement, mais n'ajoutent pas de classes métier au MCD.

## Impacts fonctionnels

- Le rattachement et le détachement d'un signalement deviennent une mise à jour de sa clé étrangère. L'historique de rattachement et de provenance n'est plus fourni.
- La qualification ne gère plus de journal séparé des révisions de catégorie : le contenu courant porte le résultat.
- Une demande de complément contient au plus une réponse.
- L'administration des équipes garde les membres et compétences, mais abandonne disponibilité datée et délégation.
- L'activité transversale n'est plus un module autonome. L'historique conservé dans le parcours est celui des statuts de signalement.
- Les notifications, points, badges, publications et flux citoyens sont retirés de l'application.

## Migration

La migration `20261105000000_simplified_domain_model` transforme le schéma existant sans modifier les anciennes migrations. Elle récupère le rattachement actuellement actif, déplace l'idempotence vers Signalement, fusionne les données de qualification et les réponses, puis relie les vérifications aux interventions lorsque la correspondance historique existe. Les anciennes données d'événements non liées au statut de signalement, les historiques géographiques/de priorité et les modules secondaires sont supprimés conformément à la réduction de périmètre.

Les vérifications historiques sans intervention correspondante gardent leur ligne avec `id_intervention = NULL`. Elles sont consultables comme données historiques, mais ne constituent pas une vérification active du nouveau workflow.

## Limites de validation

La migration doit être validée sur une copie de base contenant des données réelles avant staging. Les déploiements de production doivent attendre la validation du mapping des vérifications historiques, du volume de rattachements et du plan de sauvegarde/restauration.
