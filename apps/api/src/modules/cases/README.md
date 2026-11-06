# Module Cases

Gestion des dossiers de traitement par le rôle `RESPONSABLE_TRAITEMENT`.

## Parcours livrés dans cette tranche

- Créer un dossier à partir d’un signalement au statut `QUALIFIE`, avec les catégories retenues, un rattachement initial et la provenance de chaque catégorie.
- Consulter la liste paginée, le détail et les événements métier d’un dossier.
- Modifier la priorité et la localisation avec justification, historique dédié et événement métier atomique.
- Rattacher un autre signalement qualifié ou détacher un signalement. Les deux opérations exigent un motif (5 à 500 caractères), enregistré dans le journal d’audit. Un verrou PostgreSQL empêche toute mutation après clôture du dossier.
- Refuser explicitement le rattachement si le dossier contient déjà l’une des catégories concernées. Aucune agrégation implicite de quantités n’est effectuée.

## Routes API

Toutes les routes sont préfixées par `/api/v1`, authentifiées par Supabase Auth et protégées par le rôle serveur `RESPONSABLE_TRAITEMENT`.

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/cases` | Liste paginée, filtrable par statut |
| GET | `/cases/:idDossier` | Détail, contenus, rattachements et historiques |
| GET | `/cases/:idDossier/history` | Événements métier du dossier |
| POST | `/cases/from-reports/:idSignalement` | Création à partir d’un signalement qualifié |
| PATCH | `/cases/:idDossier/priority` | Changement motivé de priorité |
| PATCH | `/cases/:idDossier/location` | Changement motivé de localisation |
| POST | `/cases/:idDossier/reports/:idSignalement/attach` | Rattachement avec corps `{ motif }` obligatoire |
| POST | `/cases/:idDossier/reports/:idSignalement/detach` | Détachement avec corps `{ motif }` obligatoire |

Les opérations d’écriture sont transactionnelles, utilisent le niveau d’isolation sérialisable et écrivent l’événement métier dans la même transaction. Les rattachements/détachements verrouillent le dossier parent, empêchent les modifications d’un dossier clôturé et stockent le motif dans `reason`. Le rattachement est refusé si une catégorie retenue existe déjà dans le dossier ; aucune somme implicite de quantités/volumes n’est autorisée. Les conflits d’unicité et de sérialisation sont exposés en HTTP 409.

## Limites explicites

La gestion détaillée des contenus, l’affectation d’une catégorie à une équipe, les interventions et la vérification de clôture appartiennent aux phases suivantes. L’agrégation de quantités entre plusieurs provenances n’est pas définie et reste donc interdite. Les colonnes métier restent celles du MLD v2.13 ; le motif est stocké dans la colonne `reason` déjà présente dans le journal d’audit.
