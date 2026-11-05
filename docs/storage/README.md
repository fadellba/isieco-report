# Stockage privé des médias

## Objectif et état

Les photos de signalement et les preuves d'intervention sont conservées dans un bucket Supabase Storage privé. Les applications Web et Mobile envoient les fichiers à l'API NestJS ; elles ne reçoivent jamais de secret de stockage et ne choisissent jamais un chemin Storage arbitraire.

Les endpoints API d'upload et de création d'URL temporaire, la validation binaire des images et l'enregistrement des métadonnées dans \`PhotoSignalement\` et \`PhotoIntervention\` sont intégrés. La commande bornée \`pnpm storage:purge\` supprime également les objets expirés et renseigne \`mediaPurgeAt\`. La sélection galerie/caméra, la conversion JPEG, l'upload privé citoyen/agent et la géolocalisation ponctuelle dans le client Mobile sont intégrés. Le Web permet la consultation des photos de qualification et l'upload des preuves d'intervention ; le dépôt Web de photos de signalement n'est pas un parcours livré.

## Provisionnement Supabase

Dans le projet Supabase de l'environnement :

1. Ouvrir **Storage** puis créer un bucket nommé \`isieco-private-media\`.
2. Désactiver impérativement l'accès public. Le bucket doit rester **Private**.
3. Définir une taille maximale de fichier de **10 MiB**.
4. Autoriser uniquement les types MIME \`image/jpeg\`, \`image/png\` et \`image/webp\`.
5. Ne créer aucune politique permettant à \`anon\` ou \`authenticated\` de lister, lire, ajouter, modifier ou supprimer librement les objets. Les opérations passent par l'API de confiance, après contrôle métier.

Le bucket se provisionne via le Dashboard ou l'outil d'administration Storage. Ne pas créer ni modifier directement les tables internes du schéma \`storage\` par une migration SQL du projet applicatif.

### État du projet staging vérifié le 5 novembre 2026

Le projet Supabase \`isieco-report-staging\` contient le bucket \`isieco-private-media\` configuré comme privé, avec limite de 10 MiB et types JPEG/PNG/WebP. RLS est activé sur les tables Storage et aucune policy d'accès direct \`anon\`/\`authenticated\` n'a été observée au dernier contrôle. Le nombre d'objets était nul lors du contrôle initial du 31 octobre 2026 ; ce volume doit être vérifié à nouveau avant recette.

Cette vérification confirme les paramètres du bucket, pas le flux complet API → Storage. Le secret serveur, \`MEDIA_RETENTION_DAYS\`, la migration du schéma staging et le test d'upload API restent à configurer/exécuter.

## Configuration API

Variables côté serveur uniquement :

- \`SUPABASE_URL\` : URL du projet.
- \`SUPABASE_SECRET_KEY\` : secret API Supabase réservé aux environnements de confiance.
- \`SUPABASE_STORAGE_BUCKET\` : \`isieco-private-media\` par défaut.
- \`MEDIA_RETENTION_DAYS\` : durée de conservation décidée par le responsable du service, entier entre 1 et 3650.

\`MEDIA_RETENTION_DAYS\` doit rester non configuré tant que la politique métier de conservation n'a pas été validée. Dans ce cas, l'API refuse l'upload plutôt que d'inventer une durée. La clé \`SUPABASE_SECRET_KEY\` ne doit apparaître dans aucune variable \`VITE_*\` ou \`EXPO_PUBLIC_*\`, aucun bundle client, aucun log ou artefact CI.

L'authentification des utilisateurs continue d'utiliser \`SUPABASE_ANON_KEY\`. Le secret Storage est indépendant et n'est chargé que par \`SupabaseStorageService\` dans l'API.

## Flux d'upload

Le client envoie un multipart/form-data à l'API avec le champ \`file\`.

- Signalement : \`POST /api/v1/reports/:id/photos` ; le citoyen doit posséder le signalement et avoir un compte actif.
- Intervention : \`POST /api/v1/interventions/:idIntervention/photos\` ; seul l'agent qui a démarré l'intervention, membre actif de l'équipe, peut ajouter une preuve avant la soumission du compte rendu.

L'API limite chaque requête à un fichier de 10 MiB, détecte JPEG/PNG/WebP à partir de la signature binaire et vérifie la cohérence du MIME déclaré. Le nom original du fichier n'est pas conservé. Un identifiant aléatoire et le contexte métier déterminent le chemin de stockage.

L'API téléverse l'objet avec \`upsert: false\`, puis crée la ligne photo. Si l'écriture SQL échoue, elle tente de supprimer l'objet temporaire. Il n'existe pas de journal d'audit générique associé à l'upload dans le modèle simplifié.

## Consultation

- Propriétaire d'un signalement : \`GET /api/v1/reports/:id/photos/:photoId/url\`.
- Vérificateur de clôture : \`GET /api/v1/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url\), uniquement pour les photos de la dernière intervention soumise en attente de vérification. L'auto-vérification reste interdite.

L'API contrôle la propriété ou le droit métier et la date d'expiration avant de signer le lien. Les URLs signées expirent après **60 secondes**. Elles sont des capacités temporaires : ne pas les stocker durablement, les journaliser ou les transmettre à des tiers.

Les photos d'intervention restent invisibles dans la file de vérification après que la décision a été prise. Les flux de consultation publique et de publication photo ne sont pas inclus dans cette version.

## Conservation et purge

La colonne \`dateExpiration\` est déterminée au dépôt depuis \`MEDIA_RETENTION_DAYS\`. La colonne \`mediaPurgeAt\` suit la suppression effective de l'objet.

Le service \`MediaPurgeService\` et la commande \`pnpm storage:purge\` exécutent une purge bornée : 100 photos de signalement et 100 photos d'intervention au maximum par exécution. Pour chaque objet, l'API supprime le fichier du bucket privé, puis renseigne \`mediaPurgeAt\`. Les lignes photo sont conservées pour préserver les références historiques.

Le schéma simplifié ne comporte pas de table générique d'événements ni de journal d'audit de purge. La commande retourne les compteurs de traitement et d'échec, mais ne crée pas d'historique persistant des opérations de purge. Une exigence de traçabilité exhaustive devra être traitée dans une évolution de modèle dédiée.

Un échec Storage ou SQL laisse la ligne non purgée et incrémente \`failed\`. La commande renvoie un code de sortie non nul si une erreur est rencontrée. Le traitement peut être relancé ; il ne journalise ni chemins Storage ni données personnelles.

La commande n'est pas planifiée par le dépôt. Configurer un job Cron dans l'environnement d'hébergement, avec le même code, \`DATABASE_URL\`, \`SUPABASE_URL\`, \`SUPABASE_SECRET_KEY\` et \`SUPABASE_STORAGE_BUCKET\`. Choisir une fréquence compatible avec la politique de conservation et le volume attendu. Une exécution traite au plus 200 objets ; si le volume dépasse ce lot, prévoir une fréquence suffisante pour résorber la file.

## Vérifications avant mise en production

- Confirmer que le bucket est privé et que l'API utilise le bon projet Supabase.
- Contrôler que le secret est absent des variables client et des logs.
- Valider la durée de rétention avant de renseigner \`MEDIA_RETENTION_DAYS\`.
- Tester l'upload, le lien signé, l'expiration et les contrôles de propriété depuis l'API.
- Tester une purge réussie, un échec Storage, la reprise et les compteurs.
- Vérifier séparément la sauvegarde/restauration des objets Storage ; les dumps PostgreSQL ne contiennent pas les fichiers binaires.
