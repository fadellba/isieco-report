# Contexte système

ISI-Eco Report couvre le signalement citoyen, la qualification, la création et le pilotage des dossiers, les affectations, les interventions et la vérification de résolution.

~~~mermaid
flowchart LR
  C[Citoyen]
  Q[Agent de qualification]
  RT[Responsable de traitement]
  RA[Responsable d'affectation]
  AT[Agent de terrain]
  V[Vérificateur de clôture]
  GR[Gestionnaire de référentiel]
  AC[Administrateur des comptes]
  SYS((ISI-Eco Report))
  AUTH[Supabase Auth]
  STORAGE[(Stockage des médias)]

  C <-->|Signalements, compléments, suivi| SYS
  Q <-->|Qualification et décisions| SYS
  RT <-->|Dossiers, priorité, pilotage| SYS
  RA <-->|Affectations aux équipes| SYS
  AT <-->|Missions, compte rendu, preuves| SYS
  V <-->|Vérification et clôture| SYS
  GR <-->|Référentiels, équipes, compétences| SYS
  AC <-->|Comptes et rôles| SYS
  SYS <-->|Authentification / JWT| AUTH
  SYS <-->|Photos et preuves| STORAGE
~~~

Les canaux externes de notification ne sont pas considérés comme intégrés tant que le fournisseur et les règles d'envoi ne sont pas décidés.