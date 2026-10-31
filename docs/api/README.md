# Documentation API

## Source de vérité

Le document OpenAPI 3 est généré depuis les contrôleurs NestJS, DTO et décorateurs Swagger. Maintenir les annotations près du code ; ne pas créer une seconde description manuelle des mêmes contrats.

Lorsque l'API tourne en local :

- Swagger UI : `http://localhost:3000/docs`
- OpenAPI JSON : `http://localhost:3000/docs-json`
- Préfixe : `http://localhost:3000/api/v1`
- Génération : `pnpm api:openapi` (écrit `docs/api/openapi.json`).

Swagger est une interface développeur. Il ne doit exposer aucun secret, chemin privé de stockage ou donnée personnelle réelle.

## Parcours métier présents

Les routes métier sont groupées par comptes, référentiels, signalements, qualification, dossiers, affectations, interventions et vérification. Chaque contrôleur documente ses habilitations et DTO.

### Audit (Phase 11)

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| GET | `/audit/me` | Compte métier actif connecté | Historique paginé dont le compte est acteur ou cible, avec filtres de date et de type. |
| GET | `/audit/accounts/:idUtilisateur/roles` | ADMINISTRATEUR_COMPTES | Historique des seules attributions et révocations de rôles du compte visé. |

Les réponses exposent les métadonnées d'événement et sa cible, jamais `donneesAvant`, `donneesApres`, les motifs libres ou les informations de destinataire externe. Il n'existe pas de consultation globale du journal : aucun rôle d'auditeur global n'est défini dans le modèle d'habilitations.

### Médias privés (Phase 10)

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| POST | `/reports/:id/photos` | CITOYEN + propriétaire | Upload multipart `file`, description facultative. |
| GET | `/reports/:id/photos/:photoId/url` | CITOYEN + propriétaire | URL signée 60 secondes. |
| POST | `/interventions/:idIntervention/photos` | AGENT_TERRAIN + auteur de l'intervention + appartenance active | Upload multipart `file`, `contextePhoto` requis, description facultative ; avant soumission du compte rendu. |
| GET | `/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url` | VERIFICATEUR_CLOTURE | URL signée de la photo de la dernière soumission en attente ; auto-vérification interdite. |

Les fichiers acceptés sont JPEG, PNG et WebP, avec vérification de la signature binaire et limite de 10 MiB par fichier. Les chemins Storage ne sont jamais renvoyés aux clients. La consultation passe par un contrôle de droit métier côté API puis une URL de courte durée. La configuration de bucket, du secret serveur et de la conservation est décrite dans [Stockage privé des médias](../storage/README.md).

## Checklist de documentation d'un endpoint

Chaque endpoint doit documenter :
1. Son objectif métier via `@ApiOperation`.
2. Son groupe via `@ApiTags`.
3. Les paramètres de chemin et de requête, avec leurs contraintes.
4. Le DTO de requête et les contraintes de champ.
5. Le schéma et le code de succès.
6. Les erreurs pertinentes (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500` selon le cas).
7. L'authentification Bearer via `@ApiBearerAuth` si nécessaire.
8. Les rôles métier requis et le comportement d'autorisation.

Les champs DTO doivent associer les décorateurs Swagger et class-validator afin que le contrat généré reflète la validation réelle.

## Authentification et autorisation

Supabase Auth gère l'identité et les sessions. Les requêtes protégées transmettent le jeton d'accès dans `Authorization: Bearer <access-token>`. L'API valide le jeton et résout les rôles métier dans la base applicative.

L'API est la frontière d'autorisation. Masquer un bouton côté client ne constitue pas un contrôle d'accès. Ne jamais faire confiance à un rôle ou une permission transmis par les métadonnées du client.

## Versionnement et compatibilité

Toutes les routes métier sont préfixées par `/api/v1`. N'ajouter une version que pour une frontière de compatibilité délibérée. Préférer les changements additifs et conserver la sémantique des réponses existantes.

## Erreurs

Les erreurs doivent utiliser des codes HTTP stables et des messages sûrs. Ne jamais retourner de stack trace, SQL, contenu de jeton, secret fournisseur ou détail interne. Toute évolution du format d'erreur doit être documentée depuis le comportement réellement implémenté.

## Workflow de changement

Mettre à jour décorateurs, DTO, tests et documentation dans la même PR que le comportement. La CI génère OpenAPI et valide le JSON produit.
