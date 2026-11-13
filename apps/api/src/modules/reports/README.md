# Module Reports

Le module gère le dépôt initial, le suivi des signalements citoyens et les demandes/réponses de complément.

## API

- `POST /api/v1/reports` : création JSON par un compte `CITOYEN` actif ;
- `POST /api/v1/reports/with-photo` : création photo-first multipart, avec photo initiale obligatoire et description/catégories facultatives ;
- `GET /api/v1/reports` : liste paginée des seuls signalements du citoyen connecté ;
- `GET /api/v1/reports/:id` : détail réservé au propriétaire ;
- `GET /api/v1/reports/:id/history` : chronologie citoyenne des statuts et des jalons opérationnels communicables ;
- `GET /api/v1/reports/:id/supplements` : demandes de complément du propriétaire ;
- `POST /api/v1/reports/:id/supplements/:demandeId/responses` : réponse du propriétaire ;
- `POST /api/v1/reports/:id/photos` : upload d'une photo privée ;
- `GET /api/v1/reports/:id/photos/:photoId/url` : URL de consultation temporaire.

La création exige `Idempotency-Key` (8 à 128 caractères), scoped par utilisateur et associée à l'empreinte SHA-256 du corps canonique. Un retry identique retourne le signalement initial ; réutiliser la clé avec un corps différent retourne HTTP 409. Le contrat JSON accepte une description, une catégorie ou une localisation ; la variante `/with-photo` exige une image JPEG/PNG/WebP et permet de laisser la description et les catégories vides. La première photo, la ligne signalement, les contenus, l'historique initial et les événements d'audit sont validés dans une seule transaction ; un échec DB déclenche le nettoyage de l'objet Storage temporaire.

Le service vérifie l'état du compte, les types de déchets actifs et la cohérence des coordonnées. La soumission, les contenus facultatifs, la clé d'idempotence et les événements initiaux sont écrits dans une transaction sérialisable.

## Photos privées

L'upload exige un signalement appartenant au citoyen connecté. L'API valide JPEG, PNG ou WebP par signature binaire (10 MiB maximum), génère le chemin Storage côté serveur et téléverse dans un bucket privé avec `upsert: false`. La ligne `PhotoSignalement` et l'événement `PHOTO_SIGNALEMENT_AJOUTEE` sont écrits après l'upload dans une transaction sérialisable. Si l'écriture échoue, l'API tente de supprimer l'objet temporaire.

Les réponses ne divulguent jamais `referencePhoto` ni un chemin de bucket. La chronologie citoyenne ne retourne que des libellés et dates publics ; elle filtre les actions du journal d'audit et n'expose ni identité d'agent, ni raison interne, ni métadonnée technique. L'URL temporaire est délivrée uniquement au propriétaire, après contrôle de la date d'expiration ; elle est valide 60 secondes.

L'upload est désactivé tant que `MEDIA_RETENTION_DAYS` n'est pas renseigné selon la politique métier. La configuration du bucket et du secret serveur est décrite dans [docs/storage/README.md](../../../../docs/storage/README.md).

## Limites

L'approbation des variantes, le floutage, le flux de publication et les URLs de médias publics sont hors du périmètre de cette livraison. La commande de purge est disponible ; sa planification Cron reste à configurer. Ne jamais rendre le bucket public ni accepter un chemin Storage arbitraire depuis un client.
