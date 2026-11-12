# Diagramme UML des cas d’utilisation

Le diagramme ci-dessous est la vue fonctionnelle courante d'ISI-Eco Report. Il est volontairement limité aux parcours présents dans le code et dans les écrans livrés. Les fonctionnalités de l'ancien MLD v2.13 (géographie hiérarchique, délégations, disponibilités, notifications, publications, points et badges) ne sont pas représentées.

~~~~mermaid
flowchart TB
  Citizen["CITOYEN"] --> C1["Déposer un signalement"]
  Citizen --> C2["Suivre ses signalements"]
  Citizen --> C3["Ajouter des photos privées"]
  Citizen --> C4["Répondre à un complément"]

  Qual["AGENT_QUALIFICATION"] --> Q1["Examiner la file et les preuves"]
  Qual --> Q2["Demander un complément"]
  Qual --> Q3["Qualifier ou rejeter"]

  CaseOwner["RESPONSABLE_TRAITEMENT"] --> D1["Créer un dossier"]
  CaseOwner --> D2["Associer / détacher un signalement"]
  CaseOwner --> D3["Modifier priorité / localisation"]
  CaseOwner --> D4["Lire la chronologie d'audit du dossier"]

  Dispatcher["RESPONSABLE_AFFECTATION"] --> A1["Lister les contenus en attente"]
  Dispatcher --> A2["Choisir une équipe compétente"]
  Dispatcher --> A3["Affecter / réaffecter"]

  Field["AGENT_TERRAIN"] --> I1["Consulter ses équipes et missions"]
  Field --> I2["Accepter / refuser une affectation"]
  Field --> I3["Démarrer une intervention"]
  Field --> I4["Ajouter des preuves et soumettre le compte rendu"]

  Verifier["VERIFICATEUR_CLOTURE"] --> V1["Examiner une soumission et ses preuves"]
  Verifier --> V2["Valider ou demander une reprise"]

  RefManager["GESTIONNAIRE_REFERENTIEL"] --> R1["Gérer les types de déchets"]
  RefManager --> R2["Gérer les équipes, membres et compétences"]

  Admin["ADMINISTRATEUR_COMPTES"] --> U1["Lister les comptes"]
  Admin --> U2["Attribuer / révoquer les rôles"]
~~~~

## Lire les relations UML

| Relation | Signification |
|---|---|
| \`<<include>>\` | Le comportement inclus est exécuté obligatoirement dans le cas principal. |
| \`<<extend>>\` | Le comportement complémentaire intervient uniquement sous une condition ou lorsqu'une option est choisie. |
| Association acteur | L'acteur participe directement au cas d'utilisation. |

Le détail des préconditions, des règles métier et des limites par acteur se trouve dans [Cas d’utilisation détaillés par acteur](cas-utilisation-par-acteur.md).

## Règles de lecture

- Les huit acteurs correspondent aux rôles métier déclarés dans le package partagé et contrôlés par l'API.
- Supabase Auth authentifie l'utilisateur ; l'API contrôle le profil actif, le rôle, la propriété et l'appartenance à chaque opération.
- Les photos restent privées ; les clients reçoivent des URLs signées de courte durée après contrôle métier.
- Le journal audit.evenement_metier est une infrastructure PostgreSQL séparée du modèle métier Prisma de 18 tables. L'API expose une chronologie limitée au dossier, pas un audit personnel/global.
