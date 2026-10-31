# Module Reports

Le module gère le dépôt initial, le suivi des signalements citoyens et les demandes/réponses de complément.

## API

- `POST /api/v1/reports` : création par un compte `CITOYEN` actif ;
- `GET /api/v1/reports` : liste paginée des seuls signalements du citoyen connecté ;
- `GET /api/v1/reports/:id` : détail réservé au propriétaire ;
- `GET /api/v1/reports/:id/supplements` : demandes de complément du propriétaire ;
- `POST /api/v1/reports/:id/supplements/:demandeId/responses` : réponse du propriétaire ;
- `POST /api/v1/reports/:id/photos` : upload d'une photo privée ;
- `GET /api/v1/reports/:id/photos/:photoId/url` : URL de consultation temporaire.

La création exige `Idempotency-Key` (8 à 128 caractères), scoped par utilisateur et associée à l'empreinte SHA-256 du corps canonique. Un retry identique retourne le signalement initial ; réutiliser la clé avec un corps différent retourne HTTP 409.

Le service vérifie l'état du compte, les types de déchets actifs, la commune et ses parents géographiques, ainsi que la cohérence des coordonnées. La soumission, les contenus, la clé d'idempotence et l'événement `SIGNALEMENT_SOUMIS` sont écrits dans une transaction sérialisable.

## Photos privées

L'upload exige un signalement appartenant au citoyen connecté. L'API valide JPEG, PNG ou WebP par signature binaire (10 MiB maximum), génère le chemin Storage côté serveur et téléverse dans un bucket privé avec `upsert: false`. La ligne `PhotoSignalement` et l'événement `PHOTO_SIGNALEMENT_AJOUTEE` sont écrits après l'upload dans une transaction sérialisable. Si l'écriture échoue, l'API tente de supprimer l'objet temporaire.

Les réponses ne divulguent jamais `referencePhoto` ni un chemin de bucket. L'URL temporaire est délivrée uniquement au propriétaire, après contrôle de la date d'expiration ; elle est valide 60 secondes.

L'upload est désactivé tant que `MEDIA_RETENTION_DAYS` n'est pas renseigné selon la politique métier. La configuration du bucket et du secret serveur est décrite dans [docs/storage/README.md](../../../../docs/storage/README.md).

## Limites

L'approbation des variantes, le floutage, le flux de publication, les URLs de médias publics et la purge automatique sont hors du périmètre de cette livraison. Ne jamais rendre le bucket public ni accepter un chemin Storage arbitraire depuis un client.
