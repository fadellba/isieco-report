# Sécurité et habilitations

## Identité

Supabase Auth gère les identifiants, mots de passe, sessions et jetons. Les clients transmettent l'access token à l'API avec \`Authorization: Bearer\`. L'API vérifie le jeton, retrouve le profil métier \`Utilisateur\` via \`authUserId\`, puis résout les rôles côté serveur.

Les secrets d'authentification ne sont pas répliqués dans la base métier. La table \`auth.users\` reste sous la responsabilité de Supabase Auth.

## Rôles fonctionnels

| Code | Responsabilité |
|---|---|
| \`CITOYEN\` | Déposer ses signalements, consulter leur état, ajouter des photos et répondre aux compléments. |
| \`AGENT_QUALIFICATION\` | Analyser les signalements, demander un complément, accepter ou rejeter. |
| \`RESPONSABLE_TRAITEMENT\` | Constituer et piloter les dossiers, contenus, priorités et localisations. |
| \`RESPONSABLE_AFFECTATION\` | Affecter des contenus de dossier aux équipes compétentes et réaffecter une mission éligible. |
| \`AGENT_TERRAIN\` | Consulter les missions de ses équipes, soumettre comptes rendus et preuves. |
| \`VERIFICATEUR_CLOTURE\` | Vérifier indépendamment les résultats et autoriser clôture ou reprise. |
| \`GESTIONNAIRE_REFERENTIEL\` | Administrer les types de déchets, équipes, appartenances et compétences. |
| \`ADMINISTRATEUR_COMPTES\` | Administrer les comptes et leurs attributions de rôles. |

## Règles impératives

- L'inscription publique attribue uniquement le rôle \`CITOYEN\` côté serveur.
- Aucun rôle ou permission transmis par le client n'est considéré comme fiable.
- Le premier \`ADMINISTRATEUR_COMPTES\` est provisionné par une procédure contrôlée.
- Les responsabilités qualification, affectation, intervention et vérification sont distinctes.
- L'accès à un signalement, dossier, contenu, affectation, intervention ou média est vérifié côté API selon la propriété, le rôle, l'appartenance et l'état métier.
- Un agent ne peut consulter ou modifier que les opérations de ses équipes auxquelles il appartient activement.
- L'auteur d'une intervention ne peut pas vérifier son propre compte rendu.
- La révocation du dernier compte administrateur actif est interdite.
- Les secrets de stockage et les chaînes PostgreSQL sont réservés à l'environnement API ; aucune clé privilégiée n'est embarquée dans Web ou Mobile.
- Les erreurs ne divulguent pas SQL, stack traces, jetons ou secrets.

## Traçabilité réellement portée par le modèle simplifié

Le modèle cible ne contient plus de table générique \`EvenementMetier\`, de journal avant/après ni de module/endpoint Audit autonome. Il ne faut donc pas présenter le produit courant comme disposant d'un journal d'audit générique.

Deux informations historiques métier restent structurées :

- \`HistoriqueStatutSignalement\` conserve les transitions de statut d'un signalement, avec ancien/nouveau statut, date, acteur éventuel et motif.
- \`UtilisateurRole\` conserve les périodes d'attribution d'un rôle via ses dates de début/fin, ainsi que l'attribution initiale et son motif lorsqu'ils sont fournis. La date de fin matérialise la fermeture de la période.

Les deux mécanismes ont un périmètre précis. Ils ne constituent pas un journal complet de toutes les mutations, des accès, des tentatives refusées, des changements de priorité/localisation ou des opérations d'administration. Les champs retirés avec l'ancien audit générique ne sont pas reconstruits par la migration.

Toute exigence réglementaire ou opérationnelle de journalisation exhaustive, d'immutabilité, de preuve de révocation, d'export ou de consultation globale doit faire l'objet d'une décision de conception et d'un modèle dédié avant d'être annoncée comme fonctionnalité.

## Médias et RLS

Les médias sont stockés dans un bucket Supabase privé. Le backend contrôle la taille, le type, le nom, l'accès et la rétention et délivre des URL signées de courte durée. Les chemins Storage ne sont jamais exposés au client.

RLS est activé sur les tables métier ; les privilèges directs des rôles Data API \`anon\`, \`authenticated\` et \`service_role\` sont retirés pour le périmètre relationnel. L'accès métier passe par l'API NestJS. RLS et privilèges SQL doivent être recontrôlés après chaque migration sur l'environnement cible.

## Tests d'autorisation attendus

Tester les cas positifs et négatifs : compte suspendu, rôle absent ou expiré, signalement d'un autre utilisateur, appartenance d'équipe absente/terminée, auteur de l'intervention, tentative d'auto-vérification, état métier non éligible, opération idempotente, photo privée expirée ou purgée et concurrence de mutations.
