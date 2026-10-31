# Module Interventions

Exécution des missions de terrain, preuves et soumission de compte rendu par le rôle `AGENT_TERRAIN`.

## Invariants

- Une intervention démarre uniquement sur une affectation active, acceptée par l'équipe, et dont le contenu est actif, en cours de prise en charge et rattaché à un dossier non clôturé.
- L'agent doit disposer d'une appartenance active à l'équipe affectée.
- Un agent démarre une intervention ; seul cet agent peut ajouter les photos et soumettre le compte rendu correspondant.
- Les photos ne peuvent être ajoutées que tant que l'intervention est ouverte, avant la soumission du compte rendu.
- Une seule intervention ouverte est permise par affectation. Les écritures utilisent une transaction sérialisable.
- Le compte rendu est obligatoire. Un résultat `PARTIELLE` ou `IMPOSSIBLE` exige un motif d'exception.
- Après soumission, un nouveau démarrage est bloqué jusqu'à ce qu'une vérification enregistre explicitement l'état `REPRISE`.
- Le compte rendu, les dates et l'événement métier sont enregistrés atomiquement.

## Routes API

Toutes les routes sont préfixées par `/api/v1`, authentifiées par Supabase Auth et protégées par le rôle serveur `AGENT_TERRAIN`.

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/interventions/my-teams` | Liste les équipes actives auxquelles appartient le compte métier connecté ; les appartenances sont filtrées par période courante et les équipes dédupliquées. |
| GET | `/interventions/team/:idEquipe` | Liste les interventions de l'équipe ; une appartenance active est requise. Les réponses incluent les métadonnées minimales de la dernière décision de vérification. |
| POST | `/interventions/assignments/:idAffectation/start` | Démarre une intervention. |
| POST | `/interventions/:idIntervention/photos` | Ajoute une preuve privée avant soumission. |
| POST | `/interventions/:idIntervention/submit` | Soumet le résultat et le compte rendu. |

## Preuves privées

Le champ multipart `file` accepte JPEG, PNG ou WebP vérifiés par signature binaire, jusqu'à 10 MiB. `contextePhoto` est obligatoire (3 à 100 caractères) ; la description est facultative (500 caractères maximum). L'API vérifie l'auteur initial, l'appartenance active, l'état ouvert de l'intervention, l'affectation acceptée et le contenu actif. La route `GET /interventions/my-teams` sert uniquement à afficher les équipes de l'agent ; chaque opération métier refait son propre contrôle d'accès.

L'objet est stocké dans le bucket privé ; le chemin ne sort pas de l'API. Les métadonnées et l'événement `PHOTO_INTERVENTION_AJOUTEE` sont écrits atomiquement. La configuration Storage est décrite dans [docs/storage/README.md](../../../../docs/storage/README.md).

## Limites

Les URLs de preuve ne sont délivrées qu'au vérificateur autorisé pendant l'attente de décision. Les variantes, le floutage et les médias publiables ne sont pas encore implémentés. La purge est exécutée via `pnpm storage:purge` ; la planification Cron reste à configurer. L'agent terrain ne peut ni valider la résolution ni clôturer le dossier.
