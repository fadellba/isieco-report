# Stockage privé des médias

## Objectif et état

Les photos de signalement et les preuves d'intervention sont conservées dans un bucket Supabase Storage privé. Les applications Web et Mobile envoient les fichiers à l'API NestJS ; elles ne reçoivent jamais de secret de stockage et ne choisissent jamais un chemin Storage arbitraire.

Les endpoints API d'upload et de création d'URL temporaire, la validation binaire des images et l'enregistrement des métadonnées dans `PhotoSignalement` et `PhotoIntervention` sont intégrés. La commande bornée `pnpm storage:purge` supprime également les objets expirés et renseigne `mediaPurgeAt`. La sélection galerie/caméra, la conversion JPEG, l'upload privé citoyen/agent et la géolocalisation ponctuelle dans le client Mobile sont intégrés. Le Web permet la consultation des photos de qualification et l'upload des preuves d'intervention ; le dépôt Web de photos de signalement n'est pas un parcours livré.

## Provisionnement Supabase

Dans le projet Supabase de l'environnement :

1. Ouvrir **Storage** puis créer un bucket nommé `isieco-private-media`.
2. Désactiver impérativement l'accès public. Le bucket doit rester **Private**.
3. Définir une taille maximale de fichier de **10 MiB**.
4. Autoriser uniquement les types MIME `image/jpeg`, `image/png` et `image/webp`.
5. Ne créer aucune politique permettant à `anon` ou `authenticated` de lister, lire, ajouter, modifier ou supprimer librement les objets. Les opérations passent par l'API de confiance, après contrôle métier.

Le bucket se provisionne via le Dashboard ou l'outil d'administration Storage. Ne pas créer ni modifier directement les tables internes du schéma `storage` par une migration SQL du projet applicatif.

### État du staging au 7 novembre 2026

Le bucket `isieco-private-media` du projet `isieco-report-staging` a été contrôlé le 6 novembre : privé (`public=false`), limite de 10 MiB et types JPEG/PNG/WebP. Le workflow récent [Staging Forward Migrate and Deploy #42319641856](https://github.com/fadellba/isieco-report/actions/runs/42319641856) a terminé avec succès le 7 novembre sur le commit `d0a0deabd239e5adde8833a8488f5ff7a00442d6`. Il a vérifié l'historique Prisma sans nouvelle migration, déployé la révision exacte sur Render (`dep-dbn78bbrjlhs739mvl0g`, `live`), validé la readiness DB, liveness et Swagger, puis exécuté la matrice des huit rôles et le parcours citoyen → vérification → clôture.

Le test Storage E2E du 7 novembre a réellement téléversé une image synthétique via l'API, vérifié que le bucket reste privé (téléchargement anonyme refusé), généré une URL signée de 60 secondes et téléchargé les octets attendus. Il a confirmé une expiration calculée à 365 jours, puis exécuté une purge bornée sur l'identifiant synthétique : `mediaPurgeAt` a été renseigné et l'objet a disparu du bucket (`storage.objects_remaining=0`). Aucun objet de la fixture ne reste à purger. Le contrôle du 6 novembre reste un état historique antérieur à ce test.

La politique métier de conservation a été approuvée le 7 novembre 2026 : les photos de signalement et les preuves d'intervention sont conservées **365 jours à compter de leur dépôt**. `MEDIA_RETENTION_DAYS=365` est configuré sur `isieco-api-staging` et le run E2E #42319641856 a confirmé la prise en compte effective par l'API : l'écart `dateExpiration - dateAjout` est de 365 jours. Le même test a validé l'URL signée de 60 secondes, le téléchargement autorisé, le refus anonyme, la purge ciblée, la disparition de l'objet et l'écriture de l'audit. Il couvre le média de signalement ; le chemin des preuves d'intervention et les scénarios d'échec/reprise restent à tester. Le workflow quotidien de purge staging est programmé à 02:15 UTC ; son premier run planifié reste à observer.

## Configuration API

Variables côté serveur uniquement :

- `SUPABASE_URL` : URL du projet.
- `SUPABASE_SECRET_KEY` : secret API Supabase réservé aux environnements de confiance.
- `SUPABASE_STORAGE_BUCKET` : `isieco-private-media` par défaut.
- `MEDIA_RETENTION_DAYS` : `365` en staging et dans l'exemple local, soit 365 jours à compter de l'upload (valeur entière autorisée : 1 à 3650).

La politique métier étant validée à 365 jours, configurez `MEDIA_RETENTION_DAYS=365` dans chaque environnement API qui doit accepter des uploads. Si la variable est absente ou invalide, l'API refuse l'upload plutôt que d'inventer une durée. La clé `SUPABASE_SECRET_KEY` ne doit apparaître dans aucune variable `VITE_*` ou `EXPO_PUBLIC_*`, aucun bundle client, aucun log ou artefact CI.

L'authentification des utilisateurs continue d'utiliser `SUPABASE_ANON_KEY`. Le secret Storage est indépendant et n'est chargé que par `SupabaseStorageService` dans l'API.

## Flux d'upload

Le client envoie un multipart/form-data à l'API avec le champ `file`.

- Signalement : `POST /api/v1/reports/:id/photos` ; le citoyen doit posséder le signalement et avoir un compte actif.
- Intervention : `POST /api/v1/interventions/:idIntervention/photos` ; seul l'agent qui a démarré l'intervention, membre actif de l'équipe, peut ajouter une preuve avant la soumission du compte rendu.

L'API limite chaque requête à un fichier de 10 MiB, détecte JPEG/PNG/WebP à partir de la signature binaire et vérifie la cohérence du MIME déclaré. Le nom original du fichier n'est pas conservé. Un identifiant aléatoire et le contexte métier déterminent le chemin de stockage.

L'API téléverse l'objet avec `upsert: false`, puis crée la ligne photo dans une transaction. L'ajout d'une photo de signalement verrouille la ligne parente avant de compter les photos, ce qui rend le plafond de trois atomique entre plusieurs instances API. Les ajouts de photos de signalement et de preuves d'intervention écrivent un événement d'audit dans la même transaction que les métadonnées ; aucun chemin Storage, URL signée ou contenu binaire n'est journalisé.

## Consultation

- Propriétaire d'un signalement : `GET /api/v1/reports/:id/photos/:photoId/url`.
- Vérificateur de clôture : `GET /api/v1/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url`, uniquement pour les photos de la dernière intervention soumise en attente de vérification. L'auto-vérification reste interdite.

L'API contrôle la propriété ou le droit métier et la date d'expiration avant de signer le lien. Les URLs signées expirent après **60 secondes**. Elles sont des capacités temporaires : ne pas les stocker durablement, les journaliser ou les transmettre à des tiers.

Les photos d'intervention restent invisibles dans la file de vérification après que la décision a été prise. Les flux de consultation publique et de publication photo ne sont pas inclus dans cette version.

## Conservation et purge

La colonne `dateExpiration` est déterminée au dépôt depuis `MEDIA_RETENTION_DAYS`. La colonne `mediaPurgeAt` suit la suppression effective de l'objet.

Le service `MediaPurgeService` et la commande `pnpm storage:purge` exécutent une purge bornée : 100 photos de signalement et 100 photos d'intervention au maximum par exécution. Pour chaque objet, l'API supprime le fichier du bucket privé, puis renseigne `mediaPurgeAt`. Les lignes photo sont conservées pour préserver les références historiques.

Le journal `audit.evenement_metier` conserve un événement système `PHOTO_SIGNALEMENT_PURGEE` ou `PHOTO_INTERVENTION_PURGEE` dans la même transaction que la mise à jour `mediaPurgeAt`. L'acteur est `NULL` pour ces traitements automatiques. Aucun chemin de stockage n'est conservé dans l'événement. La commande retourne également les compteurs de traitement et d'échec. Lorsqu'un signalement est rattaché à un dossier, l'événement source reste dans la timeline du signalement et une projection liée au dossier est créée via `source_event_id` ; ces deux lignes représentent le même événement dans deux timelines, pas deux suppressions Storage.

Un échec Storage ou SQL laisse la ligne non purgée et incrémente `failed`. La commande renvoie un code de sortie non nul si une erreur est rencontrée. Le traitement peut être relancé ; il ne journalise ni chemins Storage ni données personnelles.

Le workflow GitHub Actions `.github/workflows/staging-media-purge.yml` planifie désormais la purge du **staging** chaque jour à 02:15 UTC (concurrence limitée à une exécution). Il utilise les secrets de l'environnement GitHub `staging` (`STAGING_PRISMA_URL` et `STAGING_SUPABASE_SECRET_KEY`) et valide explicitement le projet Supabase et le bucket attendus avant d'exécuter la commande. Une exécution manuelle est disponible avec le choix `RUN` ; le choix par défaut `NO` ne fait rien.

Chaque exécution traite au plus 100 photos de signalement et 100 photos d'intervention. Une fréquence quotidienne convient si le volume expiré reste inférieur à la capacité de traitement cumulée ; surveiller le compteur `failed` et les volumes en attente. Le job n'applique aucune migration et ne touche qu'au bucket de staging. La planification de la purge en production reste désactivée jusqu'à validation de la politique de conservation, des secrets production et du plan de reprise.

## Vérifications avant mise en production

- Confirmer que le bucket est privé et que l'API utilise le bon projet Supabase.
- Contrôler que le secret est absent des variables client et des logs.
- Observer le premier run du workflow quotidien `staging-media-purge.yml` à 02:15 UTC et vérifier ses compteurs.
- Compléter la recette des preuves d'intervention et des contrôles de propriété associés ; le parcours photo de signalement a été validé par le run E2E #42319641856.
- Injecter un échec Storage/SQL contrôlé, vérifier la reprise, les compteurs `failed` et l'absence de ligne déclarée purgée tant que l'objet n'a pas été supprimé.
- Vérifier séparément la sauvegarde/restauration des objets Storage ; les dumps PostgreSQL ne contiennent pas les fichiers binaires.


## Sauvegarde des objets et offre gratuite

Les tests Storage et l'export des objets ne requièrent pas Supabase Pro. En revanche, un dump PostgreSQL ne contient pas les binaires du bucket. Sur l'offre Free, conserver séparément les objets privés avec Supabase CLI (`supabase storage ls` pour inventorier, `supabase storage cp` pour copier/télécharger) ou avec un client S3 compatible explicitement configuré. Voir la [documentation officielle de téléchargement des objets](https://supabase.com/docs/guides/storage/management/download-objects) et le [périmètre gratuit](../deployment/perimetre-offre-gratuite.md).

L'export doit être exécuté avec un accès d'administration conservé hors du dépôt. Préserver les chemins, les checksums et une table de correspondance avec les lignes `photo_signalement` / `photo_intervention`. Restaurer les fichiers séparément du dump SQL et vérifier qu'ils sont toujours dans un bucket privé. Ne jamais rendre le bucket public pour faciliter une sauvegarde et ne jamais modifier directement les tables internes `storage.objects` pour copier les objets.