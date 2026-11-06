# Journal d'audit métier

La migration `20261106130000_business_audit_ledger` crée `audit.evenement_metier` dans un schéma PostgreSQL distinct. Le périmètre des 18 tables métier dans `public` reste inchangé.

Chaque événement porte un horodatage serveur, un acteur métier, un code d'action, une entité cible et son identifiant, ainsi que le dossier auquel l'événement appartenait au moment de l'action. Le `dossier_id` est volontairement une valeur historique sans clé étrangère : un événement reste consultable même si le signalement est ensuite détaché ou si une entité est archivée.

Tous les événements de statut historiques sont copiés pendant la migration, y compris ceux des signalements sans dossier. L'identifiant de la ligne d'historique legacy est conservé comme référence source. Lorsqu'un signalement est associé à un dossier, ses événements antérieurs sans dossier sont recopiés dans la chronologie de ce dossier avec une référence à l'événement source. Les lignes sources restent inchangées ; un index unique empêche les doublons pour un même dossier. Les associations déjà supprimées avant cette migration ne peuvent pas être reconstituées avec certitude.

L'API écrit les événements via `recordBusinessEvent(tx, event)` à l'intérieur de la transaction métier. Les métadonnées sont limitées à des clés autorisées et à des valeurs scalaires courtes. Ne pas y inscrire de texte libre, compte rendu, coordonnées, adresse e-mail, jeton, URL signée ou autre donnée personnelle/secrète.

RLS est activé sans policy d'accès direct ; les privilèges de `PUBLIC`, `anon`, `authenticated` et `service_role` sont révoqués. Des triggers interdisent les UPDATE, DELETE et TRUNCATE ordinaires. Le rôle PostgreSQL utilisé par l'API doit être le rôle serveur autorisé à écrire via Prisma, jamais un rôle Data API client. Comme pour toute protection dans PostgreSQL, un propriétaire de table ou superutilisateur peut désactiver un trigger ou modifier les privilèges : une garantie face à un DBA compromis nécessite un rôle runtime dédié et distinct du propriétaire/migrateur, à configurer explicitement avant d'affirmer une immutabilité administrateur-proof.

La route `GET /api/v1/cases/:idDossier/history` lit la chronologie audit du dossier, avec les anciens événements backfillés. L'accès reste soumis au rôle `RESPONSABLE_TRAITEMENT`.
