# Modélisation Merise

## Référence

Le modèle de référence est le MLD v2.13. Le fichier [prisma/schema.prisma](../../prisma/schema.prisma) contient 38 modèles métier. `auth.users` est géré en dehors du schéma métier par Supabase Auth. La table SESSION historique est exclue car les sessions et jetons sont gérés par Supabase Auth.

## Vue relationnelle synthétique des données

![Vue relationnelle synthétique des 38 modèles Prisma](../uml/modele-donnees.svg)

Cette vue donne une vision globale des modèles et de leurs regroupements. Elle ne constitue pas un diagramme de classes détaillé.

## Diagramme de classes UML

Voir le [diagramme de classes UML détaillé](../uml/diagramme-classes.md), qui présente les attributs, clés et associations par domaine métier.

## Documents

- [Traduction du MLD v2.13 vers Prisma](implementation-mld-v2.13.md)
- [Schéma Prisma](../../prisma/schema.prisma)
- [Historique des migrations](../../prisma/migrations/)

## Inventaire des 38 modèles

Utilisateur, Role, UtilisateurRole, PreferencesVisibiliteCitoyen, Badge, BadgeUtilisateur, HistoriquePoints, Notification, TypeDechet, Equipe, AppartenanceEquipe, CompetenceEquipe, Region, Departement, Commune, DelegationDecisionEquipe, DisponibiliteEquipe, HistoriqueDisponibiliteEquipe, Signalement, PhotoSignalement, ContenuSignalement, DemandeComplement, ReponseComplement, QualificationSignalement, IdempotenceSignalement, DossierTraitement, RattachementSignalement, ContenuDossier, ProvenanceContenuDossier, Affectation, Intervention, PhotoIntervention, VerificationResolution, HistoriqueLocalisationDossier, HistoriquePrioriteDossier, EvenementMetier, PublicationFlux, PhotoPublication.

## Modèle vs migrations

Le schéma Prisma décrit 38 modèles, mais l'historique de migrations versionnées est encore incomplet : la migration initiale porte sur comptes et rôles. Un SQL snapshot CI généré depuis un schéma vide n'est pas une migration additive depuis la base existante.

Le dépôt configure maintenant deux bases PostgreSQL locales distinctes : la base applicative et la base shadow utilisée par Prisma Migrate. La commande `pnpm db:migration:preview` compare l'historique de migrations existant au schéma Prisma et produit un SQL additif ; elle ne repart pas d'un schéma vide et ne modifie pas la base applicative.

La CI applique d'abord les migrations versionnées sur une base PostgreSQL vierge, puis génère et archive le diff additif. Ce diff reste un artefact à relire : il doit être examiné, complété avec les contraintes SQL non représentables dans Prisma, puis enregistré comme migration versionnée. Les contraintes et invariants métier doivent ensuite être testés sur PostgreSQL réel avant tout déploiement sur Supabase.

## Invariants à tester

Périodes de validité, unicités conditionnelles des affectations et rattachements actifs, cohérence des états et dates, cibles exclusives des événements, coordonnées, quantités, rétention des médias, idempotence et transitions métier. Leur présence dans la documentation ne signifie pas que ces contraintes sont déjà actives.
