# Sécurité et habilitations

## Identité

Supabase Auth gère les identifiants, mots de passe, sessions et jetons. Les clients transmettent l'access token à l'API avec Authorization: Bearer. L'API vérifie le jeton, retrouve le profil métier et ses rôles côté serveur. La table Utilisateur est liée à l'identité externe par auth_user_id.

Les secrets de session ne sont pas copiés dans PostgreSQL métier. La table SESSION historique est exclue.

## Rôles de départ

| Code | Responsabilité |
|---|---|
| CITOYEN | Déposer ses signalements et suivre ceux auxquels il a accès. |
| AGENT_QUALIFICATION | Analyser, demander un complément, accepter ou rejeter selon les règles. |
| RESPONSABLE_TRAITEMENT | Piloter les dossiers, contenus et priorités selon délégation. |
| RESPONSABLE_AFFECTATION | Affecter les catégories aux équipes compétentes. |
| AGENT_TERRAIN | Consulter les missions et soumettre compte rendu et preuves. |
| VERIFICATEUR_CLOTURE | Vérifier le résultat et autoriser clôture ou reprise. |
| GESTIONNAIRE_REFERENTIEL | Administrer référentiels, équipes et compétences autorisés. |
| ADMINISTRATEUR_COMPTES | Administrer les comptes et habilitations, sans privilège métier implicite. |

## Règles impératives

- L'inscription publique attribue seulement CITOYEN côté serveur.
- Aucun rôle ou permission transmis par le client n'est considéré comme fiable.
- Le premier ADMINISTRATEUR_COMPTES est provisionné par une procédure contrôlée.
- Les responsabilités qualification, affectation, intervention et vérification sont distinctes.
- Chaque ressource (signalement, dossier, média, historique) fait l'objet d'un contrôle de propriété et de permission.
- Les attributions et révocations de rôles sont exécutées dans une transaction sérialisable et journalisées dans `EvenementMetier` avec acteur, cible, date, motif et code du rôle.
- L'attribution du même rôle actif est protégée par un index unique partiel PostgreSQL ; les conflits concurrents sont retournés comme `409 Conflict`.
- La révocation du dernier compte `ADMINISTRATEUR_COMPTES` actif est interdite ; les opérations de rôle et leur événement d'audit sont atomiques.
- Les décisions sensibles conservent acteur, date, motif et identifiant de corrélation lorsque disponible.
- Les erreurs ne divulguent pas SQL, stack traces, jetons ou secrets.

## Médias et RLS

Les médias sont stockés dans des buckets privés. Le backend contrôle taille, type, nom, droits et rétention, et peut délivrer des URL signées de courte durée. La clé service_role et les chaînes PostgreSQL ne sont jamais embarquées dans Web ou Mobile. RLS doit être activé et testé sur les accès directs aux APIs Supabase ; les contrôles NestJS restent indispensables.

## Tests d'autorisation attendus

Tester des cas positifs et négatifs, notamment compte suspendu, rôle absent ou expiré, ressource d'un autre utilisateur, délégation, transition non permise, opération idempotente et média privé.