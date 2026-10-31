# Module Interventions

Exécution des missions de terrain et soumission des comptes rendus par le rôle `AGENT_TERRAIN`.

## Invariants

- Une intervention démarre uniquement sur une affectation active, acceptée par l’équipe, et dont le contenu est actif, en cours de prise en charge et rattaché à un dossier non clôturé.
- L’agent doit disposer d’une appartenance active à l’équipe affectée.
- Un agent démarre une intervention ; seul cet agent peut soumettre le compte rendu correspondant.
- Une seule intervention ouverte est permise par affectation. Les écritures utilisent une transaction sérialisable.
- Le compte rendu est obligatoire. Un résultat `PARTIELLE` ou `IMPOSSIBLE` exige un motif d’exception.
- Après soumission, un nouveau démarrage est bloqué jusqu’à ce qu’une vérification enregistre explicitement l’état `REPRISE`.
- Le compte rendu, les dates et l’événement métier sont enregistrés atomiquement.

## Routes API

Toutes les routes sont préfixées par `/api/v1`, authentifiées par Supabase Auth et protégées par le rôle serveur `AGENT_TERRAIN`.

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/interventions/team/:idEquipe` | Liste les interventions des affectations ouvertes de l’équipe (appartenance active requise) |
| POST | `/interventions/assignments/:idAffectation/start` | Démarre une intervention sur une affectation acceptée |
| POST | `/interventions/:idIntervention/submit` | Soumet le résultat et le compte rendu |

## Limites de cette tranche

Les photos et preuves visuelles ne sont pas encore téléversées ici. Elles seront reliées au bucket privé Supabase Storage, avec validation de type/taille, métadonnées de rétention et URL signées de courte durée dans une phase médias séparée. L’agent terrain ne peut ni valider la résolution ni clôturer le dossier.
