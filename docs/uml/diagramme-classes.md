# Diagramme de classes UML simplifié — ISI-Eco Report

## Source et périmètre

Ce diagramme décrit le modèle métier simplifié livré dans `prisma/schema.prisma`. Il contient **18 classes persistées**. Les propriétés scalaires, clés et associations correspondent au schéma Prisma ; les champs techniques d'intégration restent identifiés dans la section dédiée.

Le nom conceptuel **Dossier** est traduit dans le code par `DossierTraitement`, et dans PostgreSQL par `dossier_traitement`, pour préserver le nom physique historique.

## Classes, attributs et associations

```mermaid
classDiagram
  class Utilisateur {
    -UUID idUtilisateur PK
    -UUID authUserId UQ
    -String nom
    -String prenom?
    -String email UQ
    -String telephone?
    -DateTime dateInscription
    -String etatCompte
  }
  class Role {
    -UUID idRole PK
    -String codeRole UQ
    -String libelleRole
    -String description?
  }
  class UtilisateurRole {
    -UUID idUtilisateur PK FK
    -UUID idRole PK FK
    -DateTime dateDebut PK
    -DateTime dateFin?
    -UUID attribuePar? FK
    -String motif?
  }
  class TypeDechet {
    -UUID idTypeDechet PK
    -String codeType UQ
    -String libelle
    -String description?
    -Boolean actif
  }
  class Equipe {
    -UUID idEquipe PK
    -String nomEquipe
    -String description?
    -String etatEquipe
  }
  class AppartenanceEquipe {
    -UUID idUtilisateur PK FK
    -UUID idEquipe PK FK
    -DateTime dateDebut PK
    -DateTime dateFin?
    -String fonction
  }
  class CompetenceEquipe {
    -UUID idCompetenceEquipe PK
    -UUID idEquipe FK
    -UUID idTypeDechet FK
    -Boolean actif
    -DateTime dateAttribution
    -String commentaire?
  }
  class Signalement {
    -UUID idSignalement PK
    -UUID idUtilisateur FK
    -UUID idDossier? FK
    -DateTime dateConstat?
    -DateTime dateSoumission?
    -String description?
    -Decimal latitude?
    -Decimal longitude?
    -Decimal precisionLocalisation?
    -String localisation?
    -String statutSignalement
    -UUID decisionPar? FK
    -DateTime dateDecision?
    -String motifDecision?
    -String cleIdempotence?
    -String empreinteRequete?
  }
  class PhotoSignalement {
    -UUID idPhotoSignalement PK
    -String referencePhoto
    -String description?
    -DateTime dateAjout
    -UUID idSignalement FK
    -DateTime dateExpiration
    -DateTime mediaPurgeAt?
  }
  class ContenuSignalement {
    -UUID idContenuSignalement PK
    -UUID idSignalement FK
    -UUID idTypeDechet FK
    -Decimal quantiteEstimee?
    -Decimal volumeEstime?
    -String remarque?
    -String etatQualification
    -UUID qualifiePar? FK
    -DateTime dateQualification?
  }
  class HistoriqueStatutSignalement {
    -UUID idHistoriqueStatut PK
    -UUID idSignalement FK
    -UUID idUtilisateur? FK
    -String ancienStatut?
    -String nouveauStatut
    -DateTime dateChangement
    -String motif?
  }
  class DemandeComplement {
    -UUID idDemande PK
    -UUID idSignalement FK
    -UUID demandePar FK
    -DateTime dateDemande
    -String motif
    -String etatDemande
    -String reponse?
    -UUID reponduPar? FK
    -DateTime dateReponse?
  }
  class DossierTraitement {
    -UUID idDossier PK
    -String referenceDossier UQ
    -String descriptionSynthese
    -DateTime dateCreationDossier
    -String statutDossier
    -String priorite
    -Decimal latitude?
    -Decimal longitude?
    -Decimal precisionLocalisation?
    -String descriptionLocalisation?
    -DateTime dateCloture?
    -UUID creePar FK
  }
  class ContenuDossier {
    -UUID idContenuDossier PK
    -UUID idDossier FK
    -UUID idTypeDechet FK
    -Decimal quantiteEstimee?
    -String uniteQuantite?
    -Decimal volumeEstime?
    -String remarque?
    -String etatContenuDossier
    -String etatPriseEnCharge
  }
  class Affectation {
    -UUID idAffectation PK
    -UUID idContenuDossier FK
    -UUID idEquipe FK
    -UUID idCompetenceEquipe FK
    -DateTime dateHeureAffectation
    -UUID idDecideur FK
    -String etatAffectation
    -String motif?
    -String observation?
    -DateTime dateFinAffectation?
    -String decisionEquipe
    -UUID reponduPar? FK
    -DateTime dateReponseEquipe?
    -String motifRefusEquipe?
    -String referenceOperationUnique? UQ
  }
  class Intervention {
    -UUID idIntervention PK
    -UUID idAffectation FK
    -DateTime dateHeureDebut?
    -DateTime dateHeureFin?
    -DateTime dateSoumissionCompteRendu?
    -String statutIntervention
    -String resultatIntervention?
    -String compteRendu?
    -String motifException?
    -UUID renseignePar FK
  }
  class PhotoIntervention {
    -UUID idPhotoIntervention PK
    -UUID idIntervention FK
    -String referencePhoto
    -String contextePhoto
    -String description?
    -DateTime dateAjout
    -DateTime dateExpiration
    -DateTime mediaPurgeAt?
  }
  class Verification {
    -UUID idVerification PK
    -UUID idIntervention? FK UQ
    -UUID idVerificateur FK
    -DateTime dateVerification
    -String resultatVerification
    -String motif?
  }

  Utilisateur "1" -- "*" UtilisateurRole : habilitations
  Role "1" -- "*" UtilisateurRole : attribution
  Utilisateur "0..*" -- "0..1" UtilisateurRole : attribuant
  Utilisateur "1" -- "*" AppartenanceEquipe : appartenances
  Equipe "1" -- "*" AppartenanceEquipe : membres
  Equipe "1" -- "*" CompetenceEquipe : compétences
  TypeDechet "1" -- "*" CompetenceEquipe : domaine
  Utilisateur "1" -- "*" Signalement : auteur
  Utilisateur "0..*" -- "0..1" Signalement : décideur
  DossierTraitement "0..1" -- "*" Signalement : dossier courant
  Signalement "1" -- "*" PhotoSignalement : photos
  Signalement "1" -- "*" ContenuSignalement : catégories déclarées
  TypeDechet "1" -- "*" ContenuSignalement : catégorie
  Utilisateur "0..*" -- "0..1" ContenuSignalement : qualificateur
  Signalement "1" -- "*" HistoriqueStatutSignalement : transitions
  Utilisateur "0..1" -- "*" HistoriqueStatutSignalement : acteur
  Signalement "1" -- "*" DemandeComplement : demandes
  Utilisateur "1" -- "*" DemandeComplement : demandeur
  Utilisateur "0..*" -- "0..1" DemandeComplement : répondant
  DossierTraitement "1" -- "*" ContenuDossier : contenus
  TypeDechet "1" -- "*" ContenuDossier : catégorie
  Utilisateur "1" -- "*" DossierTraitement : créateur
  ContenuDossier "1" -- "*" Affectation : affectations
  Equipe "1" -- "*" Affectation : équipe
  CompetenceEquipe "1" -- "*" Affectation : compétence
  Utilisateur "1" -- "*" Affectation : décideur
  Utilisateur "0..*" -- "0..1" Affectation : répondant
  Affectation "1" -- "*" Intervention : interventions
  Utilisateur "1" -- "*" Intervention : agent
  Intervention "1" -- "*" PhotoIntervention : photos
  Intervention "0..1" -- "0..1" Verification : contrôle
  Utilisateur "1" -- "*" Verification : vérificateur
```

## Correspondance conceptuel, Prisma et PostgreSQL

| Classe conceptuelle | Modèle Prisma | Table PostgreSQL |
|---|---|---|
| Utilisateur | `Utilisateur` | `utilisateur` |
| Role | `Role` | `role` |
| UtilisateurRole | `UtilisateurRole` | `utilisateur_role` |
| TypeDechet | `TypeDechet` | `type_dechet` |
| Equipe | `Equipe` | `equipe` |
| AppartenanceEquipe | `AppartenanceEquipe` | `appartenance_equipe` |
| CompetenceEquipe | `CompetenceEquipe` | `competence_equipe` |
| Signalement | `Signalement` | `signalement` |
| PhotoSignalement | `PhotoSignalement` | `photo_signalement` |
| ContenuSignalement | `ContenuSignalement` | `contenu_signalement` |
| HistoriqueStatutSignalement | `HistoriqueStatutSignalement` | `historique_statut_signalement` |
| DemandeComplement | `DemandeComplement` | `demande_complement` |
| Dossier | `DossierTraitement` | `dossier_traitement` |
| ContenuDossier | `ContenuDossier` | `contenu_dossier` |
| Affectation | `Affectation` | `affectation` |
| Intervention | `Intervention` | `intervention` |
| PhotoIntervention | `PhotoIntervention` | `photo_intervention` |
| Verification | `Verification` | `verification` |

## Écarts et champs techniques assumés

- `authUserId` relie le profil métier à Supabase Auth. Les mots de passe et sessions restent hors du modèle métier.
- `cleIdempotence` et `empreinteRequete` assurent l'idempotence des dépôts ; ils sont stockés sur `Signalement`.
- `dateExpiration` et `mediaPurgeAt` servent à la rétention et à la purge des médias.
- Les photos utilisent actuellement `referencePhoto`, qui désigne la référence de stockage privée. Le modèle ne sépare pas encore le chemin, le nom de fichier et le type MIME en trois attributs distincts.
- `UtilisateurRole` et `AppartenanceEquipe` gardent des clés primaires composites temporelles. Cela conserve l'historique des périodes de rôle et d'appartenance.
- `Verification.idIntervention` est nullable pour les anciennes vérifications qui ne peuvent pas être rattachées sans ambiguïté à une intervention. La clé est unique lorsqu'elle est renseignée.
- `localisation` de `Signalement` est mappée sur la colonne SQL historique `description_localisation`. Le modèle Dossier conserve son propre champ `descriptionLocalisation`.

Ces écarts doivent être explicitement acceptés dans la spécification PFE ou corrigés dans un changement de modèle distinct. Le nombre de classes égal à 18 ne suffit pas à démontrer une conformité attribut par attribut.

## Migration et limites de conservation

La migration `20261105000000_simplified_domain_model` transforme l'ancien schéma de 38 modèles vers les 18 tables cibles. Elle conserve les données courantes utiles au nouveau périmètre mais ne conserve pas tous les historiques de l'ancien système :

- le rattachement actif d'un signalement est copié dans `signalement.id_dossier`; les rattachements terminés sont supprimés ;
- la dernière qualification par couple signalement/catégorie est fusionnée dans `contenu_signalement`; les versions antérieures et certains attributs de qualification ne sont pas repris ;
- les réponses sont fusionnées dans `demande_complement` ;
- les vérifications sont appariées chronologiquement aux interventions d'une même affectation ; celles qui ne trouvent pas d'intervention restent sans lien ;
- seuls les événements présentant un changement de statut exploitable sont copiés dans `historique_statut_signalement` ;
- les périodes de validité des types et compétences sont réduites à un booléen `actif` et une date d'attribution pour la compétence ;
- les fonctions retirées du modèle, leurs historiques et leurs colonnes sont supprimés.

La migration doit être répétée sur une copie réaliste de la base avant tout déploiement persistant. Le scénario CI synthétique couvre les chemins de transformation, mais ne remplace pas une sauvegarde restaurable ni l'analyse des volumes réels.
