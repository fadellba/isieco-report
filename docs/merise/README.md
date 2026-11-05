# Modélisation Merise

## Référence actuelle

Le modèle métier simplifié de référence contient **18 modèles Prisma**, traduisant les classes du MCD du PFE. Le diagramme de classes et sa matrice de correspondance sont disponibles dans [les livrables UML](../uml/diagramme-classes.md).

La table `auth.users` reste administrée par Supabase Auth. Le champ `Utilisateur.authUserId` relie le compte métier à l'identité externe ; aucun mot de passe, session ou bearer token n'est répliqué.

## Modèle physique

Le schéma [`prisma/schema.prisma`](../../prisma/schema.prisma) décrit les 18 modèles métier. Les noms des tables physiques sont précisés par `@@map`, ceux des colonnes par `@map`.

Les six premières migrations versionnées construisent l'ancien modèle relationnel de 38 tables. La migration `20261105000000_simplified_domain_model` transforme ce schéma historique en modèle simplifié de 18 tables. Il s'agit d'une migration destructive et non d'une simple création de tables à partir de zéro.

## Documents

- [Diagramme de classes et correspondance UML/Prisma/PostgreSQL](../uml/diagramme-classes.md)
- [Traduction du modèle simplifié vers Prisma et PostgreSQL](implementation-modele-simplifie.md)
- [Schéma Prisma](../../prisma/schema.prisma)
- [Historique des migrations](../../prisma/migrations/)
- [Notes de migration et limites de conservation](../architecture/modele-metier-simplifie.md)

## Principes relationnels

Les associations plusieurs-à-plusieurs avec attributs métier sont représentées par des classes d'association explicites : `UtilisateurRole` et `AppartenanceEquipe`. `Affectation` porte une référence directe vers `ContenuDossier`, et `Verification` vers `Intervention`.

Les invariants conditionnels complètent les clés étrangères : unicité d'une affectation active par contenu, unicité d'une vérification par intervention, cohérence des dates et protection des références historiques. Les règles non exprimables dans Prisma doivent être ajoutées dans une migration SQL et couvertes par des tests PostgreSQL.

## Migration et validation

La CI applique les migrations sur une base vierge, puis rejoue l'ancien historique sur une autre base jetable, injecte des données synthétiques couvrant les relations et transformations principales, applique la migration simplifiée et vérifie les invariants de conservation. Elle génère également les diagrammes UML à partir du schéma Prisma.

Cette répétition synthétique ne constitue pas une validation sur la base distante. Le staging actuel conserve encore l'historique des six migrations anciennes et contient très peu de dossiers, affectations et interventions. Avant son évolution, une sauvegarde restaurable ou un environnement cloné et un contrôle métier sur des volumes représentatifs restent nécessaires.

La commande locale ciblée pour les invariants SQL du schéma courant reste :

`TEST_DATABASE_URL="postgresql://isieco:isieco_dev_password@localhost:5432/isieco_report" pnpm db:test:invariants`

Le scénario de conversion de l'ancien modèle est exécuté par le script `scripts/rehearse-simplified-domain-migration.sh` sur une base PostgreSQL vide et jetable.
