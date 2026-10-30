# Diagramme de classes UML — ISI-Eco Report

Ce livrable est généré à partir du schéma `prisma/schema.prisma` de la branche `main`. Il décrit les **38 classes métier**, les attributs scalaires, les clés et les associations définies par Prisma.

Les diagrammes sont séparés en cinq domaines métier pour rester lisibles. Les propriétés de navigation Prisma sont représentées par les associations plutôt que répétées comme attributs.

## Conventions de lecture

- `PK` : propriété composant la clé primaire, y compris une clé composite.
- `FK` : propriété utilisée comme clé étrangère dans une relation Prisma.
- `UQ` : propriété couverte par une contrainte d'unicité déclarée dans Prisma.
- `?` après un attribut : valeur nullable.
- Les associations affichent les multiplicités déduites des relations singulières ou en collection déclarées dans Prisma.
- `auth.users` et les sessions ne sont pas des classes métier de ce modèle : l'identité et les sessions sont gérées par Supabase Auth.

## Identité et engagement

```mermaid
classDiagram
  class Utilisateur {
    +UUID idUtilisateur PK
    +UUID authUserId UQ
    +String nom
    +String prenom?
    +String referenceAvatar?
    +String email UQ
    +String telephone?
    +DateTime dateInscription
    +String etatCompte
  }
  class Role {
    +UUID idRole PK
    +String codeRole UQ
    +String libelleRole
    +String description?
  }
  class UtilisateurRole {
    +UUID idUtilisateur PK FK
    +UUID idRole PK FK
    +DateTime dateDebut PK
    +DateTime dateFin?
    +UUID attribuePar? FK
    +String motif?
  }
  class PreferencesVisibiliteCitoyen {
    +UUID idUtilisateur PK FK
    +Boolean afficherAvatar
    +Boolean afficherNomPublic
    +String nomPublic?
    +Boolean afficherPoints
    +Boolean afficherRang
    +Boolean afficherBadges
    +Boolean participerClassement
  }
  class Badge {
    +UUID idBadge PK
    +String codeBadge UQ
    +String libelle
    +String description?
    +Boolean actif
  }
  class BadgeUtilisateur {
    +UUID idUtilisateur PK FK
    +UUID idBadge PK FK
    +DateTime dateAttribution PK
    +UUID attribuePar? FK
    +String motif?
  }
  class HistoriquePoints {
    +UUID idPoint PK
    +UUID idUtilisateur FK
    +UUID idSignalement? FK
    +Int points
    +DateTime dateAttribution
    +String motif
    +String typeMouvement
    +UUID idPointOrigine? FK
  }
  class Notification {
    +UUID idNotification PK
    +UUID idUtilisateur FK
    +String titre
    +String message
    +Boolean lu
    +DateTime dateCreation
    +String lienCible?
  }
  Utilisateur "1" -- "*" UtilisateurRole : roles
  Utilisateur "1" -- "*" UtilisateurRole : rolesAttribues
  Utilisateur "1" -- "*" HistoriquePoints : mouvementsPoints
  Utilisateur "1" -- "*" Notification : notifications
  Utilisateur "0..1" -- "0..1" PreferencesVisibiliteCitoyen : preferencesVisibilite
  Utilisateur "1" -- "*" BadgeUtilisateur : badgesAttribues
  Utilisateur "1" -- "*" BadgeUtilisateur : badgesRecus
  Role "1" -- "*" UtilisateurRole : utilisateurs
  HistoriquePoints "1" -- "*" HistoriquePoints : compensations
  Badge "1" -- "*" BadgeUtilisateur : utilisateurs
```

## Référentiels et équipes

```mermaid
classDiagram
  class TypeDechet {
    +UUID idTypeDechet PK
    +String codeType UQ
    +String libelle
    +String description?
    +Boolean orientationSpecialisee
    +DateTime dateDebutValidite
    +DateTime dateFinValidite?
  }
  class Equipe {
    +UUID idEquipe PK
    +String nomEquipe
    +String description?
    +String etatEquipe
  }
  class AppartenanceEquipe {
    +UUID idUtilisateur PK FK
    +UUID idEquipe PK FK
    +DateTime dateDebut PK
    +DateTime dateFin?
    +String fonction
  }
  class CompetenceEquipe {
    +UUID idCompetenceEquipe PK UQ
    +UUID idEquipe FK UQ
    +UUID idTypeDechet FK UQ
    +DateTime dateDebut UQ
    +DateTime dateFin?
    +String commentaire?
    +UUID valideePar? FK
  }
  class Region {
    +UUID idRegion PK
    +String codeRegion? UQ
    +String nomRegion UQ
    +Boolean actif
  }
  class Departement {
    +UUID idDepartement PK UQ
    +UUID idRegion FK UQ
    +String codeDepartement? UQ
    +String nomDepartement UQ
    +Boolean actif
  }
  class Commune {
    +UUID idCommune PK UQ
    +UUID idDepartement FK UQ
    +String codeCommune? UQ
    +String nomCommune UQ
    +Boolean actif
  }
  class DelegationDecisionEquipe {
    +UUID idDelegation PK
    +UUID idEquipe FK UQ
    +UUID idUtilisateurDelegue FK UQ
    +DateTime dateDebutAppartenance
    +String typeDecision UQ
    +UUID deleguePar FK
    +DateTime dateDebut UQ
    +DateTime dateFin?
    +String motif?
  }
  class DisponibiliteEquipe {
    +UUID idEquipe PK FK
    +String etatDisponibilite
    +UUID miseAJourPar FK
    +DateTime dateMiseAJour
    +DateTime valideJusqua
    +String commentaire?
  }
  class HistoriqueDisponibiliteEquipe {
    +UUID idHistorique PK
    +UUID idEquipe FK
    +String etatDisponibilite
    +UUID miseAJourPar FK
    +DateTime dateMiseAJour
    +DateTime valideJusqua
    +String commentaire?
  }
  TypeDechet "1" -- "*" CompetenceEquipe : competences
  Equipe "1" -- "*" AppartenanceEquipe : appartenances
  Equipe "1" -- "*" CompetenceEquipe : competences
  Equipe "1" -- "*" DelegationDecisionEquipe : delegations
  Equipe "0..1" -- "0..1" DisponibiliteEquipe : disponibilite
  Equipe "1" -- "*" HistoriqueDisponibiliteEquipe : historiqueDisponibilite
  Region "1" -- "*" Departement : departements
  Departement "1" -- "*" Commune : communes
```

## Signalements et qualification

```mermaid
classDiagram
  class Signalement {
    +UUID idSignalement PK
    +UUID idUtilisateur FK
    +DateTime dateConstat?
    +DateTime dateSoumission?
    +String description?
    +UUID idCommune? FK
    +Decimal latitude?
    +Decimal longitude?
    +Decimal precisionLocalisation?
    +String descriptionLocalisation?
    +String statutSignalement
    +UUID decisionPar? FK
    +DateTime dateDecision?
    +String motifDecision?
  }
  class PhotoSignalement {
    +UUID idPhotoSignalement PK
    +String referencePhoto
    +String description?
    +DateTime dateAjout
    +UUID idSignalement FK
    +DateTime dateExpiration
    +DateTime mediaPurgeAt?
    +Boolean mediaStockeeLocale
    +String etatPublication
    +String referencePhotoPublique?
    +Boolean floutageConfirme
    +UUID varianteSoumisePar? FK
    +DateTime dateSoumissionVariante?
    +UUID approuvePar? FK
    +DateTime dateApprobation?
  }
  class ContenuSignalement {
    +UUID idSignalement PK FK
    +UUID idTypeDechet PK FK
    +Decimal quantiteEstimee?
    +Decimal volumeEstime?
    +String remarque?
  }
  class DemandeComplement {
    +UUID idDemande PK
    +UUID idSignalement FK
    +UUID demandePar FK
    +DateTime dateDemande
    +String motif
    +String etatDemande
  }
  class ReponseComplement {
    +UUID idReponse PK
    +UUID idDemande FK UQ
    +UUID reponduPar FK
    +DateTime dateReponse
    +String contenu
  }
  class QualificationSignalement {
    +UUID idQualification PK UQ
    +UUID idSignalement FK UQ
    +UUID idTypeDechet FK UQ
    +Decimal quantiteEstimee?
    +String uniteQuantite?
    +Decimal quantiteEstimeeLegacy?
    +Decimal volumeEstime?
    +String remarque?
    +UUID qualifiePar FK
    +DateTime dateQualification
    +String etatQualification
    +String motifRetrait?
  }
  class IdempotenceSignalement {
    +UUID idUtilisateur PK FK
    +String cleIdempotence PK
    +String empreinteRequete
    +UUID idSignalement FK UQ
    +DateTime dateCreation
  }
  Signalement "1" -- "*" PhotoSignalement : photos
  Signalement "1" -- "*" ContenuSignalement : contenus
  Signalement "1" -- "*" DemandeComplement : demandesComplement
  Signalement "1" -- "*" QualificationSignalement : qualifications
  Signalement "0..1" -- "0..1" IdempotenceSignalement : idempotence
  DemandeComplement "0..1" -- "0..1" ReponseComplement : reponse
```

## Dossiers et opérations

```mermaid
classDiagram
  class DossierTraitement {
    +UUID idDossier PK
    +String referenceDossier UQ
    +String descriptionSynthese
    +DateTime dateCreationDossier
    +String statutDossier
    +String priorite
    +DateTime dateQualification?
    +UUID idCommune? FK
    +Decimal latitude?
    +Decimal longitude?
    +Decimal precisionLocalisation?
    +String descriptionLocalisation?
    +DateTime dateCloture?
    +UUID creePar FK
  }
  class RattachementSignalement {
    +UUID idRattachement PK
    +UUID idSignalement FK
    +UUID idDossier FK
    +DateTime dateDebutRattachement
    +DateTime dateFinRattachement?
    +String typeRattachement
    +String motif?
    +UUID idActeur FK
  }
  class ContenuDossier {
    +UUID idDossier PK FK
    +UUID idTypeDechet PK FK
    +Decimal quantiteEstimee?
    +String uniteQuantite?
    +Decimal quantiteEstimeeLegacy?
    +Decimal volumeEstime?
    +String niveauRisqueQualifie?
    +String remarque?
    +UUID qualifiePar? FK
    +DateTime dateQualification?
    +String etatContenuDossier
    +String etatPriseEnCharge
    +DateTime dateAttenteEquipe?
    +String motifAttenteEquipe?
    +DateTime dateRetrait?
    +UUID retirePar? FK
    +String motifRetrait?
    +String origineAjout
    +String motifAjout?
  }
  class ProvenanceContenuDossier {
    +UUID idDossier PK FK
    +UUID idTypeDechet PK FK
    +UUID idQualification PK FK
    +DateTime dateDebut PK
    +UUID idSignalement FK
    +UUID idRattachement FK
    +UUID ajoutePar FK
    +DateTime dateFin?
    +String motif?
  }
  class Affectation {
    +UUID idAffectation PK
    +UUID idDossier FK
    +UUID idTypeDechet FK
    +UUID idEquipe FK
    +UUID idCompetenceEquipe FK
    +DateTime dateHeureAffectation
    +UUID idDecideur FK
    +String etatAffectation
    +String motif?
    +String observation?
    +DateTime dateFinAffectation?
    +String decisionEquipe
    +UUID reponduPar? FK
    +DateTime dateReponseEquipe?
    +String motifRefusEquipe?
    +String referenceOperationUnique? UQ
  }
  class Intervention {
    +UUID idIntervention PK
    +UUID idAffectation FK
    +DateTime dateHeureDebut?
    +DateTime dateHeureFin?
    +DateTime dateSoumissionCompteRendu?
    +String statutIntervention
    +String resultatIntervention?
    +String compteRendu?
    +String motifException?
    +UUID renseignePar FK
  }
  class PhotoIntervention {
    +UUID idPhotoIntervention PK
    +UUID idIntervention FK
    +String referencePhoto
    +String contextePhoto
    +String description?
    +DateTime dateAjout
    +DateTime dateExpiration
    +DateTime mediaPurgeAt?
    +Boolean mediaStockeeLocale
    +String etatPublication
    +String referencePhotoPublique?
    +Boolean floutageConfirme
    +UUID varianteSoumisePar? FK
    +DateTime dateSoumissionVariante?
    +UUID approuvePar? FK
    +DateTime dateApprobation?
  }
  class VerificationResolution {
    +UUID idVerification PK
    +UUID idAffectation FK
    +UUID idVerificateur FK
    +DateTime dateVerification
    +String resultatVerification
    +String etatVerification
    +String motif?
    +String referencePreuve?
  }
  class HistoriqueLocalisationDossier {
    +UUID idHistorique PK
    +UUID idDossier FK
    +UUID idCommune? FK
    +Decimal latitude?
    +Decimal longitude?
    +Decimal precisionLocalisation?
    +String descriptionLocalisation?
    +UUID modifiePar FK
    +DateTime dateModification
    +String motif?
  }
  class HistoriquePrioriteDossier {
    +UUID idHistorique PK
    +UUID idDossier FK
    +String priorite
    +UUID definiePar FK
    +DateTime dateDefinition
    +String justification
  }
  DossierTraitement "1" -- "*" RattachementSignalement : rattachements
  DossierTraitement "1" -- "*" ContenuDossier : contenus
  DossierTraitement "1" -- "*" HistoriqueLocalisationDossier : historiquesLocalisation
  DossierTraitement "1" -- "*" HistoriquePrioriteDossier : historiquesPriorite
  RattachementSignalement "1" -- "*" ProvenanceContenuDossier : provenances
  ContenuDossier "1" -- "*" Affectation : affectations
  ContenuDossier "1" -- "*" ProvenanceContenuDossier : provenances
  Affectation "1" -- "*" Intervention : interventions
  Affectation "1" -- "*" VerificationResolution : verifications
  Intervention "1" -- "*" PhotoIntervention : photos
```

## Traçabilité et diffusion

```mermaid
classDiagram
  class EvenementMetier {
    +UUID idEvenement PK
    +String typeEvenement
    +DateTime dateEvenement?
    +DateTime dateEnregistrement
    +String origine
    +UUID idActeur? FK
    +UUID idSignalementCible? FK
    +UUID idDossierCible? FK
    +UUID idRattachementCible? FK
    +UUID idAffectationCible? FK
    +UUID idInterventionCible? FK
    +UUID idVerificationCible? FK
    +UUID idUtilisateurCible? FK
    +UUID idEquipeCible? FK
    +UUID idTypeDechetCible? FK
    +UUID idCompetenceEquipeCible? FK
    +UUID idDossierContenuCible? FK
    +UUID idTypeDechetContenuCible? FK
    +UUID idEvenementCorrige? FK
    +Json donneesAvant?
    +Json donneesApres?
    +String destinataireExterne?
    +String motif?
    +UUID correlationId?
    +String referenceOperationUnique? UQ
    +Int versionSchema
  }
  class PublicationFlux {
    +UUID idPublication PK
    +UUID idSignalement? FK
    +UUID idDossier? FK
    +UUID creePar FK
    +DateTime dateCreation
    +String etatPublication
    +UUID approuvePar? FK
    +DateTime dateApprobation?
    +DateTime datePublication?
    +String motifDecision?
  }
  class PhotoPublication {
    +UUID idPhotoPublication PK
    +UUID idPublication FK UQ
    +UUID idPhotoSignalement? FK UQ
    +UUID idPhotoIntervention? FK UQ
    +String rolePhoto
    +DateTime dateAjout
  }
  EvenementMetier "1" -- "*" EvenementMetier : corrections
  PublicationFlux "1" -- "*" PhotoPublication : photos
```

## Associations inter-domaines

Les associations entre classes de domaines différents sont listées ici. Les classes correspondantes apparaissent dans les diagrammes de leurs domaines respectifs.

| Domaine source | Classe et propriété | Domaine cible | Classe cible |
|---|---|---|---|
| Identité et engagement | `Utilisateur.appartenances` | Référentiels et équipes | `AppartenanceEquipe` |
| Identité et engagement | `Utilisateur.competencesValidees` | Référentiels et équipes | `CompetenceEquipe` |
| Identité et engagement | `Utilisateur.signalements` | Signalements et qualification | `Signalement` |
| Identité et engagement | `Utilisateur.signalementsDecides` | Signalements et qualification | `Signalement` |
| Identité et engagement | `Utilisateur.photosSignalementSoumises` | Signalements et qualification | `PhotoSignalement` |
| Identité et engagement | `Utilisateur.photosSignalementApprouvees` | Signalements et qualification | `PhotoSignalement` |
| Identité et engagement | `Utilisateur.dossiersCrees` | Dossiers et opérations | `DossierTraitement` |
| Identité et engagement | `Utilisateur.rattachementsActes` | Dossiers et opérations | `RattachementSignalement` |
| Identité et engagement | `Utilisateur.contenusQualifies` | Dossiers et opérations | `ContenuDossier` |
| Identité et engagement | `Utilisateur.contenusRetires` | Dossiers et opérations | `ContenuDossier` |
| Identité et engagement | `Utilisateur.affectationsDecidees` | Dossiers et opérations | `Affectation` |
| Identité et engagement | `Utilisateur.affectationsRepondues` | Dossiers et opérations | `Affectation` |
| Identité et engagement | `Utilisateur.interventionsRenseignees` | Dossiers et opérations | `Intervention` |
| Identité et engagement | `Utilisateur.verificationsEffectuees` | Dossiers et opérations | `VerificationResolution` |
| Identité et engagement | `Utilisateur.evenementsAgis` | Traçabilité et diffusion | `EvenementMetier` |
| Identité et engagement | `Utilisateur.evenementsUtilisateurCible` | Traçabilité et diffusion | `EvenementMetier` |
| Identité et engagement | `Utilisateur.demandesComplement` | Signalements et qualification | `DemandeComplement` |
| Identité et engagement | `Utilisateur.reponsesComplement` | Signalements et qualification | `ReponseComplement` |
| Identité et engagement | `Utilisateur.qualifications` | Signalements et qualification | `QualificationSignalement` |
| Identité et engagement | `Utilisateur.provenancesAjoutees` | Dossiers et opérations | `ProvenanceContenuDossier` |
| Identité et engagement | `Utilisateur.idempotences` | Signalements et qualification | `IdempotenceSignalement` |
| Identité et engagement | `Utilisateur.delegationsRecues` | Référentiels et équipes | `DelegationDecisionEquipe` |
| Identité et engagement | `Utilisateur.delegationsPar` | Référentiels et équipes | `DelegationDecisionEquipe` |
| Identité et engagement | `Utilisateur.disponibilitesModifiees` | Référentiels et équipes | `DisponibiliteEquipe` |
| Identité et engagement | `Utilisateur.historiquesDisponibilite` | Référentiels et équipes | `HistoriqueDisponibiliteEquipe` |
| Identité et engagement | `Utilisateur.historiquesLocalisation` | Dossiers et opérations | `HistoriqueLocalisationDossier` |
| Identité et engagement | `Utilisateur.historiquesPriorite` | Dossiers et opérations | `HistoriquePrioriteDossier` |
| Identité et engagement | `Utilisateur.publicationsCreees` | Traçabilité et diffusion | `PublicationFlux` |
| Identité et engagement | `Utilisateur.publicationsApprouvees` | Traçabilité et diffusion | `PublicationFlux` |
| Identité et engagement | `Utilisateur.photosInterventionSoumises` | Dossiers et opérations | `PhotoIntervention` |
| Identité et engagement | `Utilisateur.photosInterventionApprouvees` | Dossiers et opérations | `PhotoIntervention` |
| Référentiels et équipes | `TypeDechet.contenusSignalement` | Signalements et qualification | `ContenuSignalement` |
| Référentiels et équipes | `TypeDechet.contenusDossier` | Dossiers et opérations | `ContenuDossier` |
| Référentiels et équipes | `TypeDechet.qualifications` | Signalements et qualification | `QualificationSignalement` |
| Référentiels et équipes | `TypeDechet.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Référentiels et équipes | `Equipe.affectations` | Dossiers et opérations | `Affectation` |
| Référentiels et équipes | `Equipe.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Référentiels et équipes | `CompetenceEquipe.affectations` | Dossiers et opérations | `Affectation` |
| Référentiels et équipes | `CompetenceEquipe.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Référentiels et équipes | `Commune.signalements` | Signalements et qualification | `Signalement` |
| Signalements et qualification | `Signalement.rattachements` | Dossiers et opérations | `RattachementSignalement` |
| Signalements et qualification | `Signalement.provenances` | Dossiers et opérations | `ProvenanceContenuDossier` |
| Signalements et qualification | `Signalement.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Signalements et qualification | `Signalement.mouvementsPoints` | Identité et engagement | `HistoriquePoints` |
| Signalements et qualification | `Signalement.publications` | Traçabilité et diffusion | `PublicationFlux` |
| Signalements et qualification | `PhotoSignalement.publications` | Traçabilité et diffusion | `PhotoPublication` |
| Référentiels et équipes | `Commune.dossiers` | Dossiers et opérations | `DossierTraitement` |
| Dossiers et opérations | `DossierTraitement.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Dossiers et opérations | `DossierTraitement.publications` | Traçabilité et diffusion | `PublicationFlux` |
| Dossiers et opérations | `RattachementSignalement.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Dossiers et opérations | `ContenuDossier.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Dossiers et opérations | `Affectation.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Dossiers et opérations | `Intervention.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Dossiers et opérations | `PhotoIntervention.publications` | Traçabilité et diffusion | `PhotoPublication` |
| Dossiers et opérations | `VerificationResolution.evenementsCible` | Traçabilité et diffusion | `EvenementMetier` |
| Signalements et qualification | `QualificationSignalement.provenances` | Dossiers et opérations | `ProvenanceContenuDossier` |
| Référentiels et équipes | `Commune.historiquesLocalisation` | Dossiers et opérations | `HistoriqueLocalisationDossier` |

## Source de vérité et limites

Le schéma Prisma reste la source de vérité pour les attributs, types, clés et relations déclarées. Ce diagramme ne représente pas les méthodes des services applicatifs : les opérations métier sont spécifiées dans les cas d'utilisation. Les contraintes SQL complémentaires, les règles conditionnelles, les cardinalités métier et les transitions d'état doivent être documentées et testées séparément.
