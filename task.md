# Tâche : Implémenter l'endpoint Heatmap du Dashboard

## Contexte

Le cahier des charges demande que le tableau de bord administrateur affiche les **zones les plus critiques** sous forme de **Heatmap**, afin de visualiser les concentrations de signalements actifs. 

Le backend dispose déjà des entités :

* Signalement
* Zone
* Affectation
* Intervention

L'objectif est d'exposer une API permettant au frontend de construire une Heatmap avec Leaflet ou Mapbox.

---

## Endpoint

```http
GET /api/dashboard/heatmap
```

Accès :

* Authentifié
* Administrateur uniquement

---

## Règles métier

Ne prendre en compte que les signalements :

* non supprimés ;
* possédant des coordonnées GPS ;
* dont le statut n'est pas clôturé (ou selon les statuts métiers déjà définis dans le projet).

Ne jamais renvoyer les informations personnelles des citoyens.

---

## Format attendu

```json
[
    {
        "latitude": 14.7168,
        "longitude": -17.4677,
        "weight": 3,
        "zone_id": 4,
        "zone_nom": "Mermoz"
    },
    {
        "latitude": 14.7182,
        "longitude": -17.4710,
        "weight": 7,
        "zone_id": 2,
        "zone_nom": "Ouakam"
    }
]
```

Le champ `weight` représente l'intensité utilisée par la Heatmap.

---

## Architecture à respecter

Respecter l'architecture existante du projet.

Créer si nécessaire :

```
DashboardController
DashboardService
DashboardRepositoryInterface
DashboardRepository
HeatmapResource
```

Éviter toute logique métier dans le contrôleur.

---

## Repository

Créer une méthode :

```php
getHeatmapData(): Collection
```

Le repository est responsable des requêtes SQL.

---

## Service

Le service doit :

* récupérer les données ;
* appliquer les règles métier ;
* préparer les données destinées à la Resource.

---

## Resource

Créer une Resource dédiée afin de ne pas exposer directement les modèles Eloquent.

---

## Performance

Le endpoint doit être optimisé.

Éviter :

* les N+1 ;
* les boucles contenant des requêtes SQL.

Privilégier une agrégation SQL (`GROUP BY`) lorsque cela est pertinent.

---

## Tests

Ajouter des Feature Tests vérifiant :

* accès refusé à un citoyen ;
* accès autorisé à un administrateur ;
* absence de signalements ⇒ tableau vide ;
* plusieurs signalements dans une même zone ⇒ poids correctement calculé.

---

## Qualité

Respecter les conventions déjà présentes dans le projet :

* Repository Pattern ;
* DTO/Resource si nécessaire ;
* gestion des exceptions existante ;
* typage PHP strict ;
* PHPStan niveau actuel ;
* tests verts.