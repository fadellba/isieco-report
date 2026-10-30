# Module Referentials

Administration des données de référence sous `/api/v1/referentials`.

## Habilitation

Toutes les routes sont protégées par Supabase Auth et exigent le rôle serveur `GESTIONNAIRE_REFERENTIEL`. Le compte de l'acteur est résolu depuis l'identité Supabase ; un identifiant ou un rôle fourni par le client ne donne aucune habilitation.

## Ressources exposées

| Ressource | Opérations |
|---|---|
| Types de déchets | Liste, création, modification des attributs descriptifs, clôture de la période de validité |
| Géographie | Régions, départements et communes : lecture arborescente, création, activation/désactivation |
| Équipes | Liste, création et modification |
| Appartenances | Ajout d'un membre pour une période, clôture de cette période |
| Compétences | Attribution d'une compétence par type de déchet, clôture |
| Disponibilité | Mise à jour de l'état courant, création d'une ligne d'historique, consultation de l'historique |
| Délégations | Création limitée à une appartenance valide, clôture |

Les routes géographiques ne modifient pas les codes ou noms après création : le MLD ne contient pas de table d'historique de libellés permettant de préserver leur ancienne valeur. La désactivation est utilisée plutôt que la suppression physique. Une correction de code ou de nom nécessitera un nouveau référentiel et une décision de migration fonctionnelle.

## Intégrité temporelle

Les appartenances, compétences et délégations portent des dates de début/fin. Les index uniques partiels PostgreSQL bloquent les appartenances, compétences et délégations concurrentes encore ouvertes. Une délégation ne peut pas dépasser la période d'appartenance du bénéficiaire et ce dernier doit disposer d'un compte actif.

Une compétence ne peut débuter avant le début de validité du type de déchet ni après sa date de fin de validité. La disponibilité courante et son historique sont écrits dans la même transaction.

## Audit

Chaque mutation d'équipe, de compétence, d'appartenance, de disponibilité, de délégation ou de référentiel écrit son événement dans `EvenementMetier` dans la même transaction que le changement. Les événements géographiques ciblent explicitement une région, un département ou une commune par une clé étrangère.

## Tests

Les tests du service sont dans `apps/api/test/referentials-service.test.mjs`. Les contraintes relationnelles et cibles d'audit sont également testées sur PostgreSQL via `pnpm db:test:invariants` et la CI.
