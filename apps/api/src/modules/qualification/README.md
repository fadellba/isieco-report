# Module Qualification

Le module implémente la file de traitement des signalements et les décisions d’un agent disposant du rôle `AGENT_QUALIFICATION`.

## API

- `GET /api/v1/qualification/queue` : file paginée des signalements `SOUMIS` et `COMPLEMENT_REPONDU` ;
- `GET /api/v1/qualification/:idSignalement` : détail de la ressource présente dans la file ;
- `POST /api/v1/qualification/:idSignalement/supplements` : demande d’information au citoyen propriétaire ;
- `POST /api/v1/qualification/:idSignalement/accept` : accepte et crée les catégories retenues ;
- `POST /api/v1/qualification/:idSignalement/reject` : rejette avec un motif obligatoire.

Le citoyen consulte ses demandes via `GET /api/v1/reports/:id/supplements` et répond via `POST /api/v1/reports/:id/supplements/:demandeId/responses`. Seul le propriétaire peut répondre.

## Transitions

`SOUMIS` ou `COMPLEMENT_REPONDU` peuvent passer à `EN_ATTENTE_COMPLEMENT`, `QUALIFIE` ou `REJETE`. Une demande est `OUVERTE`, puis `REPONDUE` après la réponse du citoyen. Une décision finale est bloquée tant qu'une demande reste ouverte. La réponse remet le signalement dans la file avec l’état `COMPLEMENT_REPONDU`.

Les décisions et les réponses sont atomiques : statut, lignes de qualification ou réponse, et événement métier sont écrits dans la même transaction sérialisable. Une lecture/transition concurrente est convertie en conflit explicite ; le client recharge alors l’état avant de recommencer.

Les catégories qualifiées référencent exclusivement des types de déchets actifs à la date de décision. Le motif d'un rejet est obligatoire. Les photos sont exposées sans chemin de stockage ; leur consultation signée dépend du service média privé.

Les codes d’état persistés sont centralisés dans `packages/shared`. Toute modification doit rester rétrocompatible avec les données stockées.
