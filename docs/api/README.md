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

### Qualification et constitution des dossiers (Phase 13)

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| GET | `/cases/qualified-reports` | `RESPONSABLE_TRAITEMENT` | Liste paginée des signalements au statut `QUALIFIE` sans rattachement actif, avec catégories retenues et informations de propriétaire nécessaires à la constitution d'un dossier. |
| GET | `/qualification/:idSignalement/photos/:idPhotoSignalement/url` | `AGENT_QUALIFICATION` | URL signée temporaire pour une photo appartenant au signalement demandé, encore dans la file de décision et non expirée/purgée. Le lien expire après 60 secondes. |

Ces routes complètent les parcours Qualification et Cases. Elles n'accordent aucun accès direct aux chemins Storage : l'API vérifie l'état métier et l'association photo/signalement avant de signer l'URL.

### Affectations (Phase 15)

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| GET | `/assignments/pending-contents` | `RESPONSABLE_AFFECTATION` | Contenus actifs, en attente, dans des dossiers non clôturés et sans affectation active. Pagination `page` / `pageSize`. |
| GET | `/assignments/eligible-teams/:idTypeDechet` | `RESPONSABLE_AFFECTATION` | Équipes actives ayant une compétence courante valide pour le type demandé, hors indisponibilité courante explicite. |
| GET | `/assignments` | `RESPONSABLE_AFFECTATION` | Historique paginé et filtrable des affectations. |
| POST | `/assignments` | `RESPONSABLE_AFFECTATION` | Crée une affectation avec `Idempotency-Key`. Le service revalide le contenu, le dossier, l'équipe, la compétence, la disponibilité et l'unicité dans une transaction sérialisable. |
| POST | `/assignments/:idAffectation/reassign` | `RESPONSABLE_AFFECTATION` | Réaffecte une affectation en attente ou refusée avec motif et clé idempotente. Une intervention déjà commencée bloque cette opération. |
| GET | `/assignments/team/:idEquipe` | `AGENT_TERRAIN` + appartenance active | Consulte les affectations actives de sa propre équipe. |
| POST | `/assignments/:idAffectation/response` | `AGENT_TERRAIN` + appartenance active | Accepte ou refuse une affectation ; le refus est motivé. |

Les endpoints de découverte sont informatifs. Ils n'accordent pas d'accès aux endpoints Cases ou Referentials et ne remplacent jamais la validation transactionnelle lors d'une mutation.

### Opérations terrain (Phase 16)

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| GET | `/interventions/my-teams` | `AGENT_TERRAIN` + compte métier actif | Liste les équipes actives auxquelles appartient le compte connecté, avec l'appartenance courante. Aucune équipe n'est fournie par le client pour déterminer ce périmètre. |
| GET | `/interventions/team/:idEquipe` | `AGENT_TERRAIN` + appartenance active | Consulte les interventions des affectations actives de cette équipe ; les métadonnées de la dernière vérification indiquent si une reprise a été demandée. |
| POST | `/interventions/assignments/:idAffectation/start` | `AGENT_TERRAIN` + appartenance active | Démarre une intervention après acceptation de l'affectation et validation des états métier. Une reprise exige une décision de vérification `REPRISE`. |
| POST | `/interventions/:idIntervention/photos` | Auteur de l'intervention + `AGENT_TERRAIN` + appartenance active | Upload multipart `file`, `contextePhoto` obligatoire et description facultative. JPEG/PNG/WebP, 10 MiB maximum. |
| POST | `/interventions/:idIntervention/submit` | Auteur de l'intervention + `AGENT_TERRAIN` + appartenance active | Soumet un compte rendu (20 caractères minimum). Les résultats `PARTIELLE` et `IMPOSSIBLE` exigent un motif d'exception. |

Le listing `my-teams` ne retourne que les équipes correspondant à une appartenance dont la période est courante et dont l'équipe est active. La liste de missions et les mutations conservent leurs propres contrôles d'appartenance, d'auteur et d'état métier côté API.

### Audit (Phase 11)

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| GET | `/audit/me` | Compte métier actif connecté | Historique paginé dont le compte est acteur ou cible, avec filtres de date et de type. |
| GET | `/audit/accounts/:idUtilisateur/roles` | `ADMINISTRATEUR_COMPTES` | Historique des seules attributions et révocations de rôles du compte visé. |

Les réponses exposent les métadonnées d'événement et sa cible, jamais `donneesAvant`, `donneesApres`, les motifs libres ou les informations de destinataire externe. Il n'existe pas de consultation globale du journal : aucun rôle d'auditeur global n'est défini dans le modèle d'habilitations.

### Médias privés (Phase 10)

| Méthode | Route | Autorisation | Description |
|---|---|---|---|
| POST | `/reports/:id/photos` | `CITOYEN` + propriétaire | Upload multipart `file`, description facultative. |
| GET | `/reports/:id/photos/:photoId/url` | `CITOYEN` + propriétaire | URL signée 60 secondes. |
| POST | `/interventions/:idIntervention/photos` | `AGENT_TERRAIN` + auteur de l'intervention + appartenance active | Upload multipart `file`, `contextePhoto` requis, description facultative ; avant soumission du compte rendu. |
| GET | `/verification/assignments/:idAffectation/photos/:idPhotoIntervention/url` | `VERIFICATEUR_CLOTURE` | URL signée de la photo de la dernière soumission en attente ; auto-vérification interdite. |

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