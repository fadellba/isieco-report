# Cas d'utilisation

![Diagramme UML synthétique des cas d'utilisation](cas-utilisation.svg)

~~~mermaid
flowchart TB
  C[Citoyen]
  Q[Agent de qualification]
  RT[Responsable de traitement]
  RA[Responsable d'affectation]
  AT[Agent de terrain]
  V[Vérificateur de clôture]
  GR[Gestionnaire de référentiel]
  AC[Administrateur des comptes]

  subgraph APP[ISI-Eco Report]
    U1([Créer un signalement])
    U2([Ajouter photos et position])
    U3([Suivre ses signalements])
    U4([Répondre à une demande de complément])
    U5([Qualifier un signalement])
    U6([Demander un complément, accepter ou rejeter])
    U7([Créer et mettre à jour un dossier])
    U8([Définir priorité et catégories])
    U9([Affecter une catégorie à une équipe])
    U10([Répondre à une affectation])
    U11([Réaliser une intervention])
    U12([Soumettre compte rendu et preuves])
    U13([Vérifier la résolution])
    U14([Clôturer ou demander une reprise])
    U15([Gérer les référentiels])
    U16([Gérer les comptes et rôles])
    U17([Consulter l'historique métier])
  end

  C --> U1
  C --> U2
  C --> U3
  C --> U4
  Q --> U5
  Q --> U6
  RT --> U7
  RT --> U8
  RT --> U17
  RA --> U9
  RA --> U10
  AT --> U11
  AT --> U12
  V --> U13
  V --> U14
  GR --> U15
  AC --> U16
  Q --> U17
  RA --> U17
  V --> U17
~~~

## Préconditions essentielles

- L'acteur est authentifié pour toute opération protégée.
- Le rôle est résolu côté API, jamais accepté comme preuve depuis le client.
- Un citoyen n'accède qu'aux signalements qu'il est autorisé à consulter.
- Un agent n'agit que sur ses missions accessibles via une affectation valide.
- Une affectation nécessite une équipe et une compétence valide pour le type de déchet.
- La clôture nécessite une vérification conforme aux règles de résolution.
- Toute décision négative ou transition exceptionnelle conserve un motif.

Ce diagramme synthétise les principaux cas. Il ne remplace pas les fiches de scénario détaillées, diagrammes de séquence, validations et tests d'acceptation à produire par module.