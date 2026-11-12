# Cas d’utilisation détaillés par acteur

Ce document décrit les cas d'utilisation effectivement présents dans le modèle et les applications actuelles. Il ne reprend pas les fonctions de l'ancien MLD v2.13 qui ont été retirées : géographie hiérarchique, disponibilités, délégations, notifications, préférences de visibilité, publications, points et badges.

## 1. Règles transversales

1. L'utilisateur possède une session Supabase Auth valide.
2. L'API retrouve son profil métier, vérifie que le compte est actif et contrôle le rôle requis à chaque requête.
3. Les opérations terrain exigent une appartenance courante à l'équipe ; les opérations de qualification, de dossier, d'affectation et de vérification exigent le rôle correspondant.
4. Les mutations sensibles sont transactionnelles et écrivent un événement dans le ledger métier audit.evenement_metier lorsqu'elles sont couvertes.
5. Les photos restent privées. Le client ne reçoit ni chemin Storage ni clé privilégiée ; l'API délivre une URL signée temporaire après contrôle du droit métier.

## 2. Citoyen — CITOYEN

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| CIT-01 | Déposer un signalement | Décrire le problème, choisir au moins un type de déchet actif, saisir facultativement la date de constat et la localisation, puis soumettre avec Idempotency-Key. Une clé rejouée avec le même contenu retourne le signalement initial ; un contenu différent produit un conflit. |
| CIT-02 | Consulter ses signalements | Afficher la liste paginée et le détail des seuls signalements appartenant au compte connecté. |
| CIT-03 | Ajouter et consulter des photos | Ajouter jusqu'à trois photos JPEG, PNG ou WebP, 10 MiB maximum chacune ; demander à l'API une URL signée de 60 secondes pour les consulter. |
| CIT-04 | Répondre à une demande de complément | Consulter les demandes liées à son signalement et répondre une seule fois à une demande ouverte. La réponse met à jour le statut du signalement. |

La localisation peut être saisie manuellement ou obtenue ponctuellement sur Mobile après action explicite et autorisation du terminal. L'application ne garantit ni géolocalisation automatique permanente ni fonctionnement hors connexion.

## 3. Agent de qualification — AGENT_QUALIFICATION

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| QUAL-01 | Consulter la file | Consulter les signalements SOUMIS ou COMPLEMENT_REPONDU, avec pagination. |
| QUAL-02 | Examiner un signalement | Voir la description, les catégories, la localisation, les photos privées via URL signée et l'historique des demandes de complément. |
| QUAL-03 | Demander un complément | Créer une demande motivée ; le signalement passe à EN_ATTENTE_COMPLEMENT. Une décision est bloquée tant qu'une demande reste ouverte. |
| QUAL-04 | Qualifier un signalement | Retenir au moins une catégorie active, ajuster les quantités/volumes/remarques et passer le signalement à QUALIFIE. |
| QUAL-05 | Rejeter un signalement | Enregistrer un rejet avec motif et passer le signalement à REJETE. |

L'agent de qualification ne crée pas le dossier et ne choisit pas l'équipe de traitement.

## 4. Responsable de traitement — RESPONSABLE_TRAITEMENT

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| DOS-01 | Consulter les signalements qualifiés disponibles | Lister les signalements QUALIFIE qui ne sont pas encore rattachés à un dossier. |
| DOS-02 | Créer un dossier | Créer un dossier à partir d'un signalement qualifié et de ses catégories retenues. La transaction crée les contenus du dossier et matérialise le lien direct via Signalement.idDossier. |
| DOS-03 | Consulter la chronologie du dossier | Lire les événements métier liés au dossier depuis audit.evenement_metier, y compris les événements de signalement associés et les actions opérationnelles couvertes. |
| DOS-04 | Modifier priorité et localisation | Modifier la priorité ou la localisation d'un dossier non clôturé. Les mutations sont historisées dans le ledger métier. |
| DOS-05 | Rattacher ou détacher un signalement | Lier un autre signalement qualifié ou retirer un lien actif. Un motif d'au moins cinq caractères est exigé et conservé dans le champ reason de l'événement d'audit. |

Le dossier clôturé est consultable en lecture seule. Le modèle ne contient pas d'historique dédié de priorité/localisation, mais les actions couvertes sont enregistrées dans le ledger.

## 5. Responsable d'affectation — RESPONSABLE_AFFECTATION

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| AFF-01 | Découvrir les contenus à affecter | Lister les contenus actifs, en attente, dans un dossier non clôturé et sans affectation active. |
| AFF-02 | Consulter les équipes éligibles | Obtenir les équipes actives qui possèdent une compétence active pour le type de déchet concerné. |
| AFF-03 | Affecter un contenu | Affecter le contenu à une équipe compétente avec une clé Idempotency-Key. Le backend revalide toutes les conditions dans une transaction sérialisable. |
| AFF-04 | Suivre les affectations | Consulter la liste paginée et ses filtres d'état et de décision d'équipe. |
| AFF-05 | Réaffecter une mission éligible | Annuler une affectation en attente ou remplacer une affectation refusée, avec motif et idempotence. |

Le modèle simplifié ne contient ni calendrier d'indisponibilité ni mécanisme de délégation. L'éligibilité dépend de l'état actif de l'équipe et de sa compétence active.

## 6. Agent de terrain — AGENT_TERRAIN

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| INT-01 | Consulter ses équipes | Lister les équipes actives auxquelles le compte appartient actuellement. |
| INT-02 | Consulter les missions de l'équipe | Lire les affectations et interventions de l'équipe, après contrôle d'appartenance active. |
| INT-03 | Répondre à une affectation | Accepter ou refuser la mission ; un refus exige un motif. |
| INT-04 | Démarrer une intervention | Démarrer une affectation acceptée et active. Une reprise exige une décision préalable REPRISE du vérificateur. |
| INT-05 | Ajouter des preuves | Ajouter des photos privées JPEG/PNG/WebP avant la soumission du compte rendu. Seul l'auteur de l'intervention peut les ajouter. |
| INT-06 | Soumettre un compte rendu | Saisir au moins 20 caractères et un résultat TERMINEE, PARTIELLE ou IMPOSSIBLE. Les deux derniers résultats exigent un motif d'exception. |

L'agent ne vérifie pas sa propre intervention et ne clôture pas le dossier.

## 7. Vérificateur de clôture — VERIFICATEUR_CLOTURE

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| VER-01 | Consulter la file de vérification | Lister les dernières interventions soumises, en excluant celles dont l'agent est également le vérificateur connecté. |
| VER-02 | Examiner une soumission | Consulter le compte rendu, le résultat, les éléments du dossier et les photos privées via URL signées de 60 secondes. |
| VER-03 | Valider une intervention | Valider uniquement un résultat terrain TERMINEE. L'affectation et le contenu sont terminés ; le dossier est clôturé lorsque tous ses contenus actifs sont terminés. |
| VER-04 | Demander une reprise | Enregistrer une décision A_REPRENDRE avec motif obligatoire. Une nouvelle intervention peut ensuite être démarrée. |

L'auto-vérification est interdite côté API, même si un client contourne ses gardes d'interface.

## 8. Gestionnaire de référentiel — GESTIONNAIRE_REFERENTIEL

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| REF-01 | Gérer les types de déchets | Créer un type et activer/désactiver son indicateur actif. |
| REF-02 | Gérer les équipes | Créer une équipe et changer son état actif/inactif. |
| REF-03 | Gérer les appartenances | Ajouter un utilisateur actif à une équipe et clôturer une appartenance. |
| REF-04 | Gérer les compétences | Ajouter/réactiver ou désactiver une compétence d'équipe par type de déchet. |

Les régions, départements, communes, calendriers de disponibilité et délégations ne sont pas implémentés dans le modèle simplifié ni dans le contrôleur Referentials courant.

## 9. Administrateur des comptes — ADMINISTRATEUR_COMPTES

| ID | Cas d'utilisation | Comportement livré |
|---|---|---|
| ADM-01 | Consulter les comptes | Lister les comptes métier avec pagination. |
| ADM-02 | Attribuer un rôle | Attribuer un rôle métier à un compte actif en enregistrant l'acteur et le motif éventuel. |
| ADM-03 | Révoquer un rôle | Terminer une attribution active. La révocation du dernier administrateur actif est refusée. |

L'inscription publique ne peut créer que le rôle CITOYEN. Les clients ne peuvent pas s'auto-attribuer un rôle privilégié.

## 10. Hors périmètre actuel

Les fonctions suivantes sont absentes des routes, des écrans et du modèle métier simplifié : flux/publications citoyennes, points et badges, notifications, préférences de visibilité, référentiels géographiques hiérarchiques, calendriers d'indisponibilité, délégations de décision, audit personnel/global et mode hors connexion.

Le journal d'audit métier est bien implémenté dans le schéma PostgreSQL séparé audit, mais l'API ne propose actuellement qu'une chronologie ciblée par dossier, pas de flux personnel, de liste globale ni d'export.
