# Module Reports

Le module gère la soumission initiale et le suivi des signalements citoyens.

## API livrée

- `POST /api/v1/reports` : création d’un signalement par un compte `CITOYEN` actif ;
- `GET /api/v1/reports` : liste paginée des seuls signalements du citoyen connecté ;
- `GET /api/v1/reports/:id` : détail accessible uniquement à son propriétaire.

La création exige un en-tête `Idempotency-Key` de 8 à 128 caractères. La clé est scoped par utilisateur et le corps canonique est empreint en SHA-256. Un retry identique renvoie le même signalement ; réutiliser la clé avec un corps différent renvoie HTTP 409.

Le service vérifie côté serveur l’état du compte, la validité des types de déchets transmis, l’activité de la commune et de ses parents géographiques, ainsi que la cohérence des coordonnées. La soumission, les contenus déclarés, l’enregistrement d’idempotence et l’événement `SIGNALEMENT_SOUMIS` sont écrits dans une transaction sérialisable.

Toutes les lectures sont filtrées par l’identifiant métier dérivé de l’identité Supabase. Un signalement appartenant à un autre compte retourne 404 afin de ne pas révéler son existence. Les payloads ne retournent pas les chemins privés des médias ni les notes internes d’autres modules.

## Limites connues

L’attachement effectif de photos n’est pas encore exposé. Il dépend du service Storage privé, de politiques RLS testées et d’un mécanisme d’URL signées courtes. Ne pas envoyer de chemin Storage arbitraire au client ni rendre le bucket public. Le flux de dépôt et d’approbation des variantes de photos sera livré avec l’infrastructure média.

Les étapes qualification, demande/réponse de complément, rattachement à un dossier, affectation et intervention sont des modules métier distincts et ne sont pas déclenchées par ce module.
