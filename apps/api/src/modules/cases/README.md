# Module Cases

Gestion des dossiers de traitement par le rôle `RESPONSABLE_TRAITEMENT`.

## Parcours livrés dans cette tranche

- Créer un dossier à partir d’un signalement au statut `QUALIFIE`, avec les catégories retenues, un rattachement initial et la provenance de chaque catégorie.
- Consulter la liste paginée, le détail et les événements métier d’un dossier.
- Modifier la priorité et la localisation avec justification, historique dédié et événement métier atomique.
- Rattacher un autre signalement qualifié ou détacher un rattachement actif. Le détachement ferme les périodes de rattachement et de provenance ; un contenu n’est retiré que lorsqu’il ne possède plus de provenance active.
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
| POST | `/cases/:idDossier/reports/:idSignalement/attach` | Rattachement d’un signalement |
| POST | `/cases/:idDossier/reports/:idSignalement/detach` | Détachement avec motif obligatoire |

Les opérations d’écriture sont transactionnelles, utilisent le niveau d’isolation sérialisable et écrivent l’événement métier dans la même transaction. Les conflits d’unicité et de sérialisation sont exposés en HTTP 409.

## Limites explicites

La gestion détaillée des contenus, l’affectation d’une catégorie à une équipe, les interventions et la vérification de clôture appartiennent aux phases suivantes. L’agrégation de quantités entre plusieurs provenances n’est pas définie et reste donc interdite. Aucune migration Prisma n’est requise pour cette tranche : les modèles et relations sont déjà présents dans le MLD v2.13.
