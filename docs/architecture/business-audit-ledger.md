# Journal d'audit métier

La migration `20261106130000_business_audit_ledger` crée `audit.evenement_metier` dans un schéma PostgreSQL distinct. Le périmètre des 18 tables métier dans `public` reste inchangé.

Chaque événement porte un horodatage serveur, un acteur métier, un code d'action, une entité cible et son identifiant, ainsi que le dossier auquel l'événement appartenait au moment de l'action. Le `dossier_id` est volontairement une valeur historique sans clé étrangère : un événement reste consultable même si le signalement est ensuite détaché ou si une entité est archivée.

Les événements de statut existants encore rattachés à un dossier sont copiés pendant la migration. Les associations déjà supprimées avant cette migration ne peuvent pas être reconstituées avec certitude.

L'API écrit les événements via `recordBusinessEvent(tx, event)` à l'intérieur de la transaction métier. Les métadonnées sont limitées à des clés autorisées et à des valeurs scalaires courtes. Ne pas y inscrire de texte libre, compte rendu, coordonnées, adresse e-mail, jeton, URL signée ou autre donnée personnelle/secrète.

RLS est activé sans policy d'accès direct ; les privilèges de `PUBLIC`, `anon`, `authenticated` et `service_role` sont révoqués. Un trigger interdit les UPDATE et DELETE ordinaires. Le rôle PostgreSQL utilisé par l'API doit être le rôle serveur autorisé à écrire via Prisma, jamais un rôle Data API client. Comme pour toute protection dans PostgreSQL, un propriétaire de table ou superutilisateur peut désactiver un trigger ou modifier les privilèges : une garantie face à un DBA compromis nécessite un rôle runtime dédié et distinct du propriétaire/migrateur, à configurer explicitement avant d'affirmer une immutabilité administrateur-proof.

La route `GET /api/v1/cases/:idDossier/history` lit la chronologie audit du dossier, avec les anciens événements backfillés. L'accès reste soumis au rôle `RESPONSABLE_TRAITEMENT`.
