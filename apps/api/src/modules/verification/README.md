# Module Verification

Vérification indépendante du résultat terrain, consultation des preuves, demande de reprise et clôture contrôlée des dossiers.

## Invariants métier

- Une seule décision est possible pour la dernière soumission d'intervention. Une vérification est applicable lorsque `dateVerification >= dateSoumissionCompteRendu) ; une soumission ultérieure redevient vérifiable.
- Le vérificateur ne peut pas vérifier sa propre intervention (séparation des tâches).
- `CONFORME` est réservé à un résultat terrain `TERMINEE`. Les résultats `PARTIELLE` et `IMPOSSIBLE` nécessitent une reprise motivée.
- `A_REPRENDRE` exige un motif ; l'affectation reste active et l'état `REPRISE` autorise une nouvelle intervention.
- Une décision `CONFORME` clôt l'affectation, passe le contenu à `TERMINE`, et journalise la décision.
- Le dossier est clôturé uniquement lorsqu'il ne reste aucun contenu actif dont la prise en charge n'est pas `TERMINE`. Les contenus retirés sont exclus de ce calcul.
- La vérification, les mises à jour de l'affectation/contenu/dossier et les événements métier sont atomiques dans une transaction sérialisable.

## Routes API

Toutes les routes sont préfixées par `/api/v1`, authentifiées par Supabase Auth et protégées par `VERIFICATEUR_CLOTURE`.

| Méthode | Route | Description |
|---|---|---|
| GET | `/verification/pending` | File paginée des dernières soumissions non vérifiées |
| GET | `/verification/assignments/:idAffectation` | Détail du dernier compte rendu en attente, avec métadonnées des photos |
| GET | `/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url` | URL signée de 60 secondes pour une photo de la dernière intervention en attente |
| POST | `/verification/assignments/:idAffectation/decision` | Valide la résolution ou demande une reprise |

## Accès aux preuves

La file de vérification expose uniquement les métadonnées photo, jamais le chemin Storage. Le vérificateur obtient une URL signée après contrôle de la dernière soumission en attente, de l'association entre la photo et l'intervention, de l'expiration du média et de la séparation des tâches. La consultation n'est pas un flux public.

## Limites

Le vérificateur ne modifie pas les affectations opérationnelles directement en dehors de sa décision. Une demande de reprise ne réouvre pas une affectation refusée par l'équipe, et une décision conforme ne clôture pas un dossier ayant d'autres contenus actifs non terminés. La purge automatique et les workflows d'approbation/publication des variantes photo restent à développer.
