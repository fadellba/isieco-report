# Traduction Prisma du MLD v2.13

## Périmètre

Le schéma `prisma/schema.prisma` contient 38 modèles correspondant aux 38 tables métier du MLD v2.13. La table `auth.users` n'est pas une table métier : elle reste administrée par Supabase Auth. Sa clé UUID est portée par `Utilisateur.authUserId`. Aucun mot de passe, jeton de session ou bearer token n'est répliqué. Il n'existe donc pas de modèle `Session`.

## Inventaire des modèles

`Utilisateur`, `Role`, `UtilisateurRole`, `TypeDechet`, `Equipe`, `AppartenanceEquipe`, `CompetenceEquipe`, `Signalement`, `PhotoSignalement`, `ContenuSignalement`, `DossierTraitement`, `RattachementSignalement`, `ContenuDossier`, `Affectation`, `Intervention`, `PhotoIntervention`, `VerificationResolution`, `EvenementMetier`, `DemandeComplement`, `ReponseComplement`, `QualificationSignalement`, `ProvenanceContenuDossier`, `IdempotenceSignalement`, `Region`, `Departement`, `Commune`, `DelegationDecisionEquipe`, `DisponibiliteEquipe`, `HistoriqueDisponibiliteEquipe`, `HistoriqueLocalisationDossier`, `HistoriquePrioriteDossier`, `HistoriquePoints`, `Notification`, `PreferencesVisibiliteCitoyen`, `Badge`, `BadgeUtilisateur`, `PublicationFlux` et `PhotoPublication`.

## Conventions de traduction

- Les modèles Prisma utilisent PascalCase ; les tables physiques utilisent les noms snake_case du MLD via `@@map`.
- Les propriétés Prisma utilisent camelCase ; les colonnes physiques utilisent snake_case via `@map`.
- Les identifiants métier sont des UUID PostgreSQL. Les dates sont typées `DateTime`, les quantités/localisations numériques sont des `Decimal` à précision explicite et les instantanés d'audit sont des champs `Json`.
- Les clés primaires composites, clés étrangères composites et contraintes d'unicité du MLD sont représentées avec `@@id`, `@relation` et `@@unique`.
- Les codes d'état, de décision, d'origine et de résultat restent des chaînes. Le dictionnaire métier reste la référence pour leurs valeurs autorisées.
- Les relations vers `auth.users` sont externes au schéma Prisma ; la présence de `authUserId` ne duplique pas l'identité Supabase.

## Invariants à porter par SQL et par les services

Prisma décrit les colonnes et relations, mais ne couvre pas à lui seul les invariants conditionnels. La migration SQL et les transactions de service doivent notamment garantir :

1. La cohérence des intervalles temporels et des périodes actives.
2. Une seule affectation courante par couple dossier/catégorie, et un seul rattachement courant par signalement.
3. La cohérence entre les états et leurs dates/motifs associés.
4. L'exclusivité des cibles d'un événement métier et des sources d'une photo de publication.
5. Les contrôles de coordonnées, de quantités et de dates de rétention des médias.
6. L'idempotence des commandes et les transitions de statut dans des transactions atomiques.

Ces règles ne doivent pas être considérées comme garanties tant qu'elles ne figurent pas dans une migration SQL testée et dans les services correspondants. Le schéma Prisma est une traduction relationnelle, pas l'implémentation complète des workflows.

## Historique d'authentification

Une version de travail antérieure du MLD mentionnait encore un condensat de jeton dans une table `SESSION`. Cette note était incompatible avec la décision d'utiliser Supabase Auth comme gestionnaire des sessions. Elle ne fait pas partie du modèle v2.13 transcrit. La journalisation éventuelle d'événements de connexion devra stocker des métadonnées non secrètes, jamais les jetons.

## Vérifications

La CI génère le client Prisma, exécute les contrôles TypeScript et les builds, puis génère un aperçu SQL lorsque `schema.prisma` change. L'aperçu doit être relu avant d'être enregistré comme migration versionnée. La réussite de la CI ne prouve pas à elle seule l'application des migrations sur une base Supabase ni le bon fonctionnement des parcours métier.
