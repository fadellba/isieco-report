# Cas d’utilisation détaillés par acteur

Ce document décrit le périmètre fonctionnel cible d’ISI-Eco Report acteur par acteur. Les identifiants correspondent aux ovales du [diagramme UML](cas-utilisation.svg).

> **Important — portée du document :** ces fiches décrivent le comportement métier attendu à partir des rôles, des règles d’habilitation et du MLD v2.13. Elles ne signifient pas que tous ces parcours sont déjà disponibles dans l’application. Les modules Reports, Cases, Qualification, Assignments, Interventions, Verification et Referentials restent à implémenter ou à compléter, comme indiqué dans l’[état des livrables](../architecture/etat-des-livrables.md).

## 1. Règles transversales

### Préconditions communes

1. L’utilisateur possède une session valide.
2. L’API retrouve son profil métier et vérifie que le rôle requis lui est attribué et actif. Un rôle transmis par le client n’est jamais considéré comme une preuve.
3. L’utilisateur dispose d’un droit sur la ressource visée. Pour les opérations d’équipe, l’appartenance, la compétence et la délégation doivent être valides à la date de l’opération.
4. Les changements d’état et décisions sensibles sont tracés avec l’acteur, la date et, lorsque nécessaire, un motif.

### Sémantique des relations

- **`<<include>>`** : le cas source appelle toujours le cas inclus. La flèche part du cas principal et pointe vers le cas inclus.
- **`<<extend>>`** : le cas complémentaire ajoute un comportement seulement si sa condition est satisfaite. La flèche part du cas d’extension et pointe vers le cas de base.
- Une extension ne doit pas être utilisée pour représenter une étape obligatoire. Inversement, une étape obligatoire ne doit pas être modélisée comme une simple extension.

## 2. Citoyen — `CITOYEN`

Le citoyen est propriétaire de ses signalements et n’accède qu’aux informations qui lui sont destinées.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **CIT-01** | Déposer un signalement | Saisir les informations utiles sur un dépôt ou un problème environnemental et soumettre le signalement. Le système enregistre l’auteur, la description, la date et les informations disponibles, puis retourne une référence et un état. |
| **CIT-01a** | Ajouter des photos | Extension facultative de CIT-01. Le citoyen joint une ou plusieurs photos. Le système contrôle les fichiers et conserve les références des médias associés au signalement. |
| **CIT-01b** | Préciser la localisation | Extension facultative de CIT-01. Le citoyen fournit une position géographique ou une description du lieu. La géolocalisation automatique ne doit pas être supposée disponible si le terminal ou l’utilisateur ne la fournit pas. |
| **CIT-02** | Suivre ses signalements | Consulter la liste de ses signalements et leur état courant. Ce cas **inclut CIT-03** pour consulter le détail d’un signalement sélectionné. |
| **CIT-03** | Consulter détail, statut et suivi | Afficher les données autorisées d’un signalement, son statut et les événements communicables au citoyen. Les notes internes et décisions non destinées au public restent masquées. |
| **CIT-04** | Répondre à une demande de complément | Répondre à une demande encore ouverte émise pendant la qualification. Ce cas **inclut CIT-04a** pour afficher la demande concernée. |
| **CIT-04a** | Consulter la demande ouverte | Afficher la question, le motif et le délai éventuel associés à la demande de complément. C’est une étape obligatoire avant d’y répondre. |
| **CIT-04b** | Joindre des éléments à la réponse | Extension facultative de CIT-04. Le citoyen ajoute des précisions ou des médias, si le type de demande le nécessite. |
| **CIT-05** | Consulter les notifications | Consulter les notifications adressées à son compte, sous réserve que le canal et les règles de notification soient activés. |
| **CIT-06** | Gérer ses préférences de visibilité | Consulter ou modifier ses préférences de visibilité citoyenne. Les choix disponibles doivent respecter les règles de confidentialité de la plateforme. |
| **CIT-07** | Consulter le flux de publications | Consulter les publications autorisées dans le flux citoyen et leurs médias publiés. |
| **CIT-08** | Consulter points et badges | Consulter les points historisés et les badges attribués au compte. Les critères d’attribution doivent être définis côté serveur. |

**Règles particulières :** un citoyen ne peut ni qualifier un signalement, ni créer une affectation, ni s’attribuer un rôle métier. Une inscription publique ne doit créer que le rôle `CITOYEN`.

## 3. Agent de qualification — `AGENT_QUALIFICATION`

L’agent de qualification examine les signalements et prend une décision initiale. Il ne réalise pas l’affectation opérationnelle aux équipes.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **QUAL-01** | Qualifier un signalement | Examiner un signalement et enregistrer une décision de qualification. Ce cas **inclut QUAL-01a**, indispensable pour prendre une décision éclairée. |
| **QUAL-01a** | Consulter le signalement et ses éléments | Consulter la description, la localisation, les contenus déclarés, les photos autorisées et les informations déjà recueillies. |
| **QUAL-02** | Demander un complément | Extension de QUAL-01 lorsque les informations sont insuffisantes. L’agent formule une demande compréhensible et traçable ; le signalement attend la réponse du citoyen selon les règles métier. |
| **QUAL-03** | Accepter pour traitement | Extension de QUAL-01 lorsque le signalement est recevable. La décision permet la poursuite du processus de traitement. |
| **QUAL-04** | Rejeter avec un motif | Extension de QUAL-01 lorsque le signalement ne peut pas être retenu. Un motif explicite est enregistré et la décision est traçable. |

Les extensions QUAL-02, QUAL-03 et QUAL-04 représentent des issues alternatives de la qualification. Elles ne sont pas exécutées toutes ensemble pour une même décision.

## 4. Responsable de traitement — `RESPONSABLE_TRAITEMENT`

Le responsable de traitement transforme les signalements recevables en dossiers cohérents et pilote leur contenu.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **DOS-01** | Créer un dossier de traitement | Créer un dossier de traitement à partir des éléments qualifiés disponibles. Le dossier reçoit une référence, un état initial, une priorité et un responsable de création. |
| **DOS-02** | Piloter ou mettre à jour un dossier | Consulter et faire évoluer un dossier existant. Ce cas **inclut DOS-02a** afin que l’action soit réalisée à partir du dossier et de son historique. |
| **DOS-02a** | Consulter dossier et historique | Consulter les informations du dossier, ses rattachements, ses contenus et l’historique métier accessible au responsable. |
| **DOS-03** | Modifier priorité ou localisation | Extension de DOS-02 lorsqu’une réévaluation de l’urgence ou du lieu est nécessaire. La nouvelle valeur et son historique sont conservés. |
| **DOS-04** | Gérer les contenus du dossier | Extension de DOS-02 pour ajouter, modifier ou retirer un type de déchet ou une information de contenu, avec les motifs requis. |
| **DOS-05** | Rattacher ou détacher un signalement | Extension de DOS-02 pour associer ou retirer un signalement d’un dossier. Le rattachement actif, sa période et son motif doivent rester cohérents. |

Le responsable de traitement pilote le dossier ; il ne remplace pas le responsable d’affectation pour le choix opérationnel d’une équipe.

## 5. Responsable d’affectation — `RESPONSABLE_AFFECTATION`

Cet acteur oriente les contenus de dossier vers les équipes compétentes.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **AFF-01** | Affecter un contenu à une équipe | Affecter un contenu de dossier à une équipe éligible pour le type de déchet concerné. Ce cas **inclut AFF-01a**, car la compétence de l’équipe est une condition obligatoire de l’affectation. |
| **AFF-01a** | Vérifier compétence et éligibilité | Vérifier que l’équipe est active et possède une compétence valide pour le type de déchet à prendre en charge. |
| **AFF-01b** | Consulter la disponibilité de l’équipe | Extension conditionnelle de AFF-01, lorsque la gestion de disponibilité est activée ou pertinente pour la décision. La disponibilité ne remplace jamais le contrôle de compétence. |
| **AFF-02** | Réaffecter après refus ou changement | Extension de AFF-01 lorsqu’une équipe refuse la mission, devient inéligible ou qu’une réorganisation est nécessaire. L’ancienne affectation et la nouvelle décision restent historisées. |
| **AFF-03** | Déléguer une décision d’affectation | Extension de AFF-01 lorsqu’une délégation valide autorise un autre utilisateur à prendre la décision. La délégation, son périmètre et sa période sont contrôlés. |

Une affectation doit référencer une équipe et une compétence correspondant au contenu affecté. Une simple appartenance à une équipe ne suffit pas à prouver la compétence requise.

## 6. Agent de terrain — `AGENT_TERRAIN`

L’agent de terrain traite les missions qui lui sont accessibles par une affectation valide.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **INT-01** | Consulter les missions affectées | Consulter les missions accessibles à l’agent selon son équipe, son rôle et les affectations actives. |
| **INT-02** | Répondre à une affectation | Enregistrer la réponse de l’équipe à une affectation. Les deux issues possibles sont modélisées par les extensions INT-02a et INT-02b. |
| **INT-02a** | Accepter l’affectation | Extension de INT-02 lorsque l’équipe accepte la prise en charge. |
| **INT-02b** | Refuser avec un motif | Extension de INT-02 lorsque l’équipe refuse la mission. Un motif de refus est exigé et conservé. |
| **INT-03** | Réaliser une intervention | Exécuter la mission affectée. Ce cas **inclut INT-03a** pour consulter les informations nécessaires et **INT-04** pour enregistrer le compte rendu et les preuves attendues. |
| **INT-03a** | Consulter la mission | Consulter le contenu à traiter, le lieu, les consignes et les informations opérationnelles accessibles à l’équipe. |
| **INT-04** | Soumettre compte rendu et preuves | Enregistrer le résultat de l’intervention, les observations et les éléments justificatifs requis avant la vérification. |
| **INT-04a** | Ajouter des photos de preuve | Extension facultative de INT-04 pour joindre des photos à l’intervention, si des preuves visuelles sont nécessaires et autorisées. |

L’agent ne peut pas clôturer lui-même le dossier au titre du rôle terrain. La validation finale appartient au vérificateur de clôture.

## 7. Vérificateur de clôture — `VERIFICATEUR_CLOTURE`

Le vérificateur contrôle le résultat déclaré avant qu’une résolution soit considérée comme validée.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **VER-01** | Vérifier le résultat de l’intervention | Examiner le résultat soumis par l’équipe. Ce cas **inclut VER-01a**, qui permet de consulter les éléments justificatifs. |
| **VER-01a** | Examiner compte rendu et preuves | Consulter le compte rendu, les photos et les autres preuves disponibles, dans les limites des droits accordés. |
| **VER-02** | Valider la résolution et clôturer | Extension de VER-01 lorsque les critères de résolution sont satisfaits. La décision de clôture est enregistrée et horodatée. |
| **VER-03** | Demander une reprise | Extension de VER-01 lorsque le résultat est insuffisant ou non conforme. Le vérificateur précise le motif et les éléments à reprendre. |

VER-02 et VER-03 sont deux issues alternatives de la vérification. Une clôture ne doit pas être possible sans vérification conforme.

## 8. Gestionnaire de référentiel — `GESTIONNAIRE_REFERENTIEL`

Cet acteur maintient les données de référence nécessaires à la qualification et à l’exécution des interventions.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **REF-01** | Administrer les référentiels | Accéder aux opérations d’administration des données de référence autorisées par son rôle. Les cas spécialisés ci-dessous étendent ce cas général. |
| **REF-02** | Gérer types de déchets et géographie | Administrer les types de déchets et les subdivisions géographiques (régions, départements, communes), avec leurs périodes de validité. |
| **REF-03** | Gérer équipes et appartenances | Créer ou mettre à jour les équipes et leurs appartenances, en conservant les dates et fonctions. |
| **REF-04** | Gérer compétences et disponibilités | Administrer les compétences des équipes par type de déchet, leur validation et les informations de disponibilité. |

La modification d’un référentiel ne doit pas effacer l’historique des affectations ou des décisions prises sur la base des valeurs précédentes.

## 9. Administrateur des comptes — `ADMINISTRATEUR_COMPTES`

Cet acteur administre les comptes et leurs habilitations. Il ne reçoit pas automatiquement de privilège métier sur les dossiers ou les interventions.

| ID | Cas d’utilisation | Description et résultat attendu |
|---|---|---|
| **ADM-01** | Administrer comptes et habilitations | Consulter les comptes et gérer les habilitations dans le périmètre autorisé. Les changements de rôle et d’état de compte sont contrôlés et tracés. |
| **ADM-02** | Activer ou suspendre un compte | Extension de ADM-01 lorsqu’un compte doit être activé, suspendu ou rétabli conformément à la procédure d’administration. |
| **ADM-03** | Attribuer ou retirer un rôle | Extension de ADM-01 lorsqu’une habilitation métier doit être accordée ou retirée. La période, l’auteur et le motif éventuel sont enregistrés. |

L’inscription publique attribue uniquement le rôle `CITOYEN`. Le premier compte `ADMINISTRATEUR_COMPTES` doit être provisionné par une procédure contrôlée, jamais par auto-attribution depuis un client.

## 10. Synthèse acteur / cas d’utilisation

| Acteur | Identifiant des cas |
|---|---|
| Citoyen | CIT-01 à CIT-08 |
| Agent de qualification | QUAL-01 à QUAL-04 |
| Responsable de traitement | DOS-01 à DOS-05 |
| Responsable d’affectation | AFF-01 à AFF-03 |
| Agent de terrain | INT-01 à INT-04a |
| Vérificateur de clôture | VER-01 à VER-03 |
| Gestionnaire de référentiel | REF-01 à REF-04 |
| Administrateur des comptes | ADM-01 à ADM-03 |

## 11. Points à valider avant implémentation

Les règles suivantes demandent une validation fonctionnelle explicite avant d’être considérées comme contractuelles :

- les délais et relances applicables aux demandes de complément ;
- les champs obligatoires d’un signalement et le caractère obligatoire ou facultatif de la localisation ;
- les critères exacts de recevabilité et de rejet ;
- les règles de priorité et de rattachement de plusieurs signalements à un dossier ;
- le moment où la disponibilité d’une équipe bloque ou non une affectation ;
- les conditions de délégation d’une décision ;
- les preuves minimales exigées pour une intervention et pour une clôture ;
- les règles d’attribution des points, badges et publications citoyennes ;
- les canaux, événements déclencheurs et règles de confidentialité des notifications.

Ces points doivent devenir des règles métier testées, pas rester de simples suppositions cachées dans le code.
