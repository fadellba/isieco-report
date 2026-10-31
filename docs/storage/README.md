# Stockage privé des médias

## Objectif et état

Les photos de signalement et les preuves d'intervention sont conservées dans un bucket Supabase Storage privé. Les applications Web et Mobile envoient les fichiers à l'API NestJS ; elles ne reçoivent jamais de secret de stockage et ne choisissent jamais un chemin Storage arbitraire.

La phase 10 ajoute les endpoints API d'upload et de création d'URL temporaire, la validation binaire des images et l'enregistrement des métadonnées dans `PhotoSignalement` et `PhotoIntervention`. La purge automatique, les écrans Web/Mobile et la configuration du projet Supabase distant restent à livrer.

## Provisionnement Supabase

Dans le projet Supabase de l'environnement :

1. Ouvrir **Storage** puis créer un bucket nommé `isieco-private-media`.
2. Désactiver impérativement l'accès public. Le bucket doit rester **Private**.
3. Définir une taille maximale de fichier de **10 MiB**.
4. Autoriser uniquement les types MIME `image/jpeg`, `image/png` et `image/webp`.
5. Ne créer aucune politique permettant à `anon` ou `authenticated` de lister, lire, ajouter, modifier ou supprimer librement les objets de ce bucket. Les opérations passent par l'API de confiance, après contrôle métier.

Le bucket se provisionne via le Dashboard ou l'outil d'administration Storage. Ne pas créer ni modifier directement les tables internes du schéma `storage` par une migration SQL du projet applicatif.

## Configuration API

Variables côté serveur uniquement :

- `SUPABASE_URL` : URL du projet.
- `SUPABASE_SECRET_KEY` : secret API Supabase réservé aux environnements de confiance.
- `SUPABASE_STORAGE_BUCKET` : `isieco-private-media` par défaut.
- `MEDIA_RETENTION_DAYS` : durée de conservation décidée par le responsable du service, entier entre 1 et 3650.

`MEDIA_RETENTION_DAYS` doit rester non configuré tant que la politique métier de conservation n'a pas été validée. Dans ce cas, l'API refuse l'upload plutôt que d'inventer une durée. La clé `SUPABASE_SECRET_KEY` ne doit apparaître dans aucune variable `VITE_*` ou `EXPO_PUBLIC_*`, aucun bundle client, aucun log ou artefact CI.

L'authentification des utilisateurs continue d'utiliser `SUPABASE_ANON_KEY`. Le secret Storage est indépendant et n'est chargé que par `SupabaseStorageService` dans l'API.

## Flux d'upload

Le client envoie un multipart/form-data à l'API avec le champ `file`.

- Signalement : `POST /api/v1/reports/:id/photos` ; le citoyen doit posséder le signalement et avoir un compte actif.
- Intervention : `POST /api/v1/interventions/:idIntervention/photos` ; seul l'agent qui a démarré l'intervention, membre actif de l'équipe, peut ajouter une preuve avant la soumission du compte rendu.

L'API limite chaque requête à un fichier de 10 MiB, détecte JPEG/PNG/WebP à partir de la signature binaire et vérifie la cohérence du MIME déclaré. Le nom original du fichier n'est pas conservé. Un identifiant aléatoire et le contexte métier déterminent le chemin de stockage.

L'API téléverse l'objet avec `upsert: false`, puis crée la ligne photo et l'événement métier dans une transaction sérialisable. Si l'écriture SQL échoue, elle tente de supprimer l'objet temporaire. Les chemins Storage ne sont jamais retournés aux clients.

## Consultation

- Propriétaire d'un signalement : `GET /api/v1/reports/:id/photos/:photoId/url`.
- Vérificateur de clôture : `GET /api/v1/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url`, uniquement pour les photos de la dernière intervention soumise en attente de vérification. L'auto-vérification reste interdite.

L'API contrôle la propriété ou le droit métier et la date d'expiration avant de signer le lien. Les URLs signées expirent après **60 secondes**. Elles sont des capacités temporaires : ne pas les stocker durablement, les journaliser ou les transmettre à des tiers.

Les photos d'intervention restent invisibles dans la file de vérification après que la décision a été prise. Les flux de consultation publique et de publication photo ne sont pas inclus dans cette phase.

## Conservation et purge

La colonne `dateExpiration` est déterminée au dépôt depuis `MEDIA_RETENTION_DAYS`. La colonne `mediaPurgeAt` est réservée au suivi de la suppression effective.

**La suppression planifiée des objets expirés et des lignes/métadonnées associées n'est pas encore implémentée.** Avant la production, ajouter un processus de purge idempotent, audité, avec gestion des échecs et tests de reprise ; ne pas supposer que la seule présence de `dateExpiration` supprime un fichier du bucket.

## Vérifications avant mise en production

- Confirmer que le bucket est privé et que l'API utilise le bon projet Supabase.
- Contrôler que le secret est absent des variables client et des logs.
- Tester les accès inter-comptes et les accès d'agents non membres.
- Tester les fichiers falsifiés, MIME incohérent, fichier vide et dépassement de taille.
- Tester les erreurs Storage, les échecs SQL après upload et le nettoyage compensatoire.
- Tester les liens expirés, les photos expirées et l'absence de chemin Storage dans les réponses.
- Définir la politique de conservation et déployer le job de purge avant tout usage opérationnel.
