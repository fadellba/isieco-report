# Répétition de restauration staging

## But et périmètre

Le workflow **Staging Database and Storage Restore Drill** réalise une répétition contrôlée à partir du projet Supabase staging `mlhbdautaxufubaybzyt`.

- PostgreSQL : export des schémas applicatifs `public` et `audit`, restauration dans un service PostgreSQL éphémère local au runner, puis comparaison des nombres de lignes par table.
- Storage : copie des objets du bucket privé `isieco-private-media` vers un bucket temporaire privé du même projet, puis vérification de la taille et du SHA-256 de chaque objet restauré.
- Nettoyage : suppression du bucket temporaire et des fichiers locaux même si une étape échoue.
- Aucun fichier de sauvegarde ni média n'est publié comme artefact GitHub.

Ce workflow est une **répétition de restauration**, pas une preuve complète de sauvegarde indépendante. Il ne lit pas les sauvegardes gérées par Supabase, ne restaure pas dans un projet séparé, et ne mesure pas l'âge du dernier point de sauvegarde. Les schémas internes `auth` et `storage` ne sont pas exportés ; les objets binaires sont testés séparément du dump SQL.

## Déclenchement contrôlé

Le workflow est manuel uniquement. Il ne doit pas être déclenché par un push.

1. Ouvrir **Actions → Staging Database and Storage Restore Drill** sur `main`.
2. Choisir `RUN` pour `run_restore_drill`.
3. Choisir `YES` pour `confirm_staging_data_copy`. Cette confirmation indique que les données métier et médias staging seront temporairement copiés sur le runner GitHub isolé.
4. Vérifier le résumé du workflow et les deux marqueurs `DATABASE_RESTORE_DRILL` et `STORAGE_RESTORE_DRILL`.

Le workflow refuse toute branche autre que `main`, toute URL de base qui ne cible pas le projet staging approuvé, tout bucket autre que le bucket privé attendu, et toute destination PostgreSQL autre que le service local éphémère. Les secrets ne sont jamais écrits dans le résumé.

## Données et confidentialité

Le dump `public` et `audit` peut contenir des données métier et personnelles de staging. Les fichiers sont conservés uniquement dans le répertoire temporaire du runner, avec des permissions restrictives, et supprimés en fin de job. Les objets Storage sont téléchargés dans le même répertoire, puis leur empreinte est vérifiée après restauration dans un bucket temporaire privé.

Ne jamais joindre le dump, le manifeste Storage, les objets, les URL signées ou les secrets à une issue, un artefact ou un message. N'exécuter cette procédure qu'après approbation du responsable d'exploitation et vérification que le traitement des données de staging sur le runner est autorisé.

## Mesures et limites

Le résumé du workflow fournit un temps écoulé observé entre le début de la sauvegarde et la fin du contrôle Storage. C'est un **proxy de RTO pour cette répétition**, pas une garantie contractuelle. Il ne mesure pas le temps de décision, de détection, de provisionnement d'une infrastructure cible ou de remise en service applicative.

Le **RPO n'est pas mesuré** par cette procédure : elle lit la base et le bucket actifs, au lieu de restaurer un snapshot daté issu de la politique de sauvegarde gérée. Pour établir le RPO, consigner séparément l'heure du dernier backup PostgreSQL et du dernier backup Storage disponibles, leur rétention, et leur cohérence temporelle.

Le contrôle PostgreSQL compare les nombres de lignes des tables présentes dans `public` et `audit` après restauration. La restauration valide également les contraintes et dépendances SQL au moment de l'import, mais ce contrôle ne prouve pas à lui seul l'intégrité métier de chaque enregistrement.

Le contrôle Storage vérifie le caractère privé du bucket temporaire et l'égalité octet par octet via SHA-256. Il ne prouve pas encore la restauration depuis une sauvegarde indépendante, l'accès utilisateur par URL signée, ni la cohérence transactionnelle exacte entre le dump SQL et l'instant de copie Storage.

## Critères pour clôturer l'issue de reprise

- Exécuter le workflow après approbation explicite, sur staging uniquement.
- Conserver le résumé horodaté du workflow et le commit testé.
- Documenter la source et la rétention réelles des backups PostgreSQL et Storage.
- Ajouter un test d'intégrité métier reliant les références des tables photo aux objets restaurés.
- Vérifier les contrôles d'accès et la génération de nouvelles URL signées après restauration.
- Mesurer un RPO réel à partir des timestamps des backups gérés et un RTO complet sur une cible de reprise isolée.
- Faire valider les résultats par le responsable d'exploitation.

Aucune étape de cette procédure ne cible la production.
