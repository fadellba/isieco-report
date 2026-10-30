# Modélisation Merise

## Référence

Le modèle de référence est le MLD v2.13. Le fichier prisma/schema.prisma contient 38 modèles métier. auth.users est géré en dehors du schéma métier par Supabase Auth. La table SESSION historique est exclue car les sessions et jetons sont gérés par Supabase Auth.

## Documents

- [Traduction du MLD v2.13 vers Prisma](implementation-mld-v2.13.md)
- [Schéma Prisma](../../prisma/schema.prisma)
- [Historique des migrations](../../prisma/migrations/)

## Inventaire des 38 modèles

Utilisateur, Role, UtilisateurRole, TypeDechet, Equipe, AppartenanceEquipe, CompetenceEquipe, Signalement, PhotoSignalement, ContenuSignalement, DossierTraitement, RattachementSignalement, ContenuDossier, Affectation, Intervention, PhotoIntervention, VerificationResolution, EvenementMetier, DemandeComplement, ReponseComplement, QualificationSignalement, ProvenanceContenuDossier, IdempotenceSignalement, Region, Departement, Commune, DelegationDecisionEquipe, DisponibiliteEquipe, HistoriqueDisponibiliteEquipe, HistoriqueLocalisationDossier, HistoriquePrioriteDossier, HistoriquePoints, Notification, PreferencesVisibiliteCitoyen, Badge, BadgeUtilisateur, PublicationFlux et PhotoPublication.

## Modèle vs migrations

Le schéma Prisma décrit 38 modèles, mais l'historique de migrations versionnées est encore incomplet : la migration initiale porte sur comptes et rôles. Un SQL snapshot CI généré depuis un schéma vide n'est pas une migration additive depuis la base existante.

Avant une base partagée, il faut produire une migration additive, ajouter les contraintes SQL complémentaires, appliquer toutes les migrations sur PostgreSQL vierge, vérifier le diff Prisma/base et tester les cas valides et invalides. Seulement ensuite une migration peut être déployée sur Supabase.

## Invariants à tester

Périodes de validité, unicités conditionnelles des affectations et rattachements actifs, cohérence des états et dates, cibles exclusives des événements, coordonnées, quantités, rétention des médias, idempotence et transitions métier. Leur présence dans la documentation ne signifie pas que ces contraintes sont déjà actives.