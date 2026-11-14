# Sécurité et habilitations

## Identité

Supabase Auth gère les identifiants, mots de passe, sessions et jetons. Les clients transmettent l'access token à l'API avec `Authorization: Bearer`. L'API vérifie le jeton, retrouve le profil métier `Utilisateur` via `authUserId`, puis résout les rôles côté serveur.

Les secrets d'authentification ne sont pas répliqués dans la base métier. La table `auth.users` reste sous la responsabilité de Supabase Auth.

## Rôles fonctionnels

| Code | Responsabilité |
|---|---|
| `CITOYEN` | Déposer ses signalements, consulter leur état, ajouter des photos et répondre aux compléments. |
| `AGENT_QUALIFICATION` | Analyser les signalements, demander un complément, accepter ou rejeter. |
| `RESPONSABLE_TRAITEMENT` | Constituer et piloter les dossiers, contenus, priorités et localisations. |
| `RESPONSABLE_AFFECTATION` | Affecter des contenus de dossier aux équipes compétentes et réaffecter une mission éligible. |
| `AGENT_TERRAIN` | Consulter les missions de ses équipes, soumettre comptes rendus et preuves. |
| `VERIFICATEUR_CLOTURE` | Vérifier indépendamment les résultats et autoriser clôture ou reprise. |
| `GESTIONNAIRE_REFERENTIEL` | Administrer les types de déchets, équipes, appartenances et compétences. |
| `ADMINISTRATEUR_COMPTES` | Administrer les comptes et leurs attributions de rôles. |

## Règles impératives

- L'inscription publique attribue uniquement le rôle `CITOYEN` côté serveur.
- Aucun rôle ou permission transmis par le client n'est considéré comme fiable.
- Le premier `ADMINISTRATEUR_COMPTES` est provisionné par une procédure contrôlée.
- Les responsabilités qualification, affectation, intervention et vérification sont distinctes.
- L'accès à un signalement, dossier, contenu, affectation, intervention ou média est vérifié côté API selon la propriété, le rôle, l'appartenance et l'état métier.
- Un agent ne peut consulter ou modifier que les opérations de ses équipes auxquelles il appartient activement.
- L'auteur d'une intervention ne peut pas vérifier son propre compte rendu.
- La révocation du dernier compte administrateur actif est interdite.
- Les secrets de stockage et les chaînes PostgreSQL sont réservés à l'environnement API ; aucune clé privilégiée n'est embarquée dans Web ou Mobile.
- Les erreurs ne divulguent pas SQL, stack traces, jetons ou secrets.

## Journal d'audit métier

Le modèle Prisma conserve 18 modèles métier dans `public`. Le journal d'audit est une table PostgreSQL distincte, `audit.evenement_metier`, non exposée par les clients Supabase Data API. Il enregistre les transitions et mutations métier explicitement couvertes par `recordBusinessEvent`, dans la même transaction que la modification métier.

Le ledger est protégé par RLS sans policy d'accès direct, révocation des privilèges Data API et triggers append-only contre UPDATE, DELETE et TRUNCATE ordinaires. Cette garantie ne protège pas contre un propriétaire de table ou un superutilisateur PostgreSQL compromis ; une garantie face à un DBA nécessite un rôle runtime distinct du propriétaire et du rôle de migration.

Les métadonnées sont allowlistées. Les changements de priorité enregistrent maintenant l'ancienne et la nouvelle priorité. Les changements de localisation enregistrent les coordonnées, la précision et le libellé de localisation avant/après. Ces valeurs sont écrites dans une transaction sérialisable. Les libellés de localisation sont bornés à 1 000 caractères ; les événements ne doivent pas contenir de jetons, URL signées, e-mails, téléphones, comptes rendus ou contenus de fichiers.

Le journal ne constitue pas un audit exhaustif de tous les accès, lectures, tentatives refusées ou événements techniques. Les historiques de priorité/localisation supprimés lors de la simplification antérieure du modèle ne peuvent pas être reconstitués rétroactivement. Le code actuel permet de conserver les changements futurs, pas de recréer les anciennes valeurs disparues. La documentation détaillée se trouve dans [Journal d'audit métier](business-audit-ledger.md).

## Limitation de débit

Les contrôleurs citoyens `reports` et agents `interventions` appliquent une fenêtre glissante par utilisateur et par route. Les routes ont une limite de base de 60 requêtes/minute ; les créations de signalement utilisent 10/minute et les uploads photo 5/minute. Un dépassement retourne HTTP 429 avec `Retry-After`.

Le compteur est en mémoire et local à chaque processus. Il ne protège pas contre une attaque distribuée et ne synchronise pas les quotas entre plusieurs instances. Avant tout déploiement multi-instance, ajouter un store partagé ou une règle équivalente au proxy/WAF. La limitation de débit n'est pas un substitut à l'authentification, à l'autorisation, aux quotas métier ou à la protection anti-DDoS.

## Médias et RLS

Les médias sont stockés dans un bucket Supabase privé. Le backend contrôle la taille, le type, le nom, l'accès et la rétention et délivre des URL signées de courte durée. Les chemins Storage ne sont jamais exposés au client.

RLS est activé sur les tables métier ; les privilèges directs des rôles Data API `anon`, `authenticated` et `service_role` sont retirés pour le périmètre relationnel. L'accès métier passe par l'API NestJS. RLS et privilèges SQL doivent être recontrôlés après chaque migration sur l'environnement cible.

## Tests d'autorisation attendus

Tester les cas positifs et négatifs : compte suspendu, rôle absent ou expiré, signalement d'un autre utilisateur, appartenance d'équipe absente/terminée, auteur de l'intervention, tentative d'auto-vérification, état métier non éligible, opération idempotente, photo privée expirée ou purgée et concurrence de mutations.
