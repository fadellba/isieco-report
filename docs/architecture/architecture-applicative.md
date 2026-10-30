# Architecture applicative

## Décision

Pour le MVP, la cible comprend une application Web d'administration, une application Mobile unique avec parcours citoyen et agent, et un backend NestJS commun exposant une API REST sous /api/v1. Les règles métier et contrôles d'autorisation sont exécutés côté backend.

## Vue logique

~~~mermaid
flowchart TB
  subgraph Clients
    WEB[Web administration<br/>React + Vite]
    MOB[Mobile citoyen et agent<br/>Expo + React Native]
  end
  subgraph API["Backend NestJS - monolithe modulaire"]
    GATE[API REST /api/v1]
    ACC[Comptes]
    REP[Signalements]
    QUAL[Qualification]
    CASE[Dossiers]
    ASSIGN[Affectations]
    INT[Interventions]
    VERIF[Vérification]
    REF[Référentiels]
    AUDIT[Audit]
    GATE --> ACC
    GATE --> REP
    GATE --> QUAL
    GATE --> CASE
    GATE --> ASSIGN
    GATE --> INT
    GATE --> VERIF
    GATE --> REF
    GATE --> AUDIT
  end
  AUTH[Supabase Auth]
  DB[(PostgreSQL / Supabase)]
  STORAGE[(Supabase Storage)]
  WEB -->|HTTPS / JSON| GATE
  MOB -->|HTTPS / JSON| GATE
  WEB -->|Connexion| AUTH
  MOB -->|Connexion| AUTH
  GATE -->|Vérification JWT| AUTH
  GATE --> DB
  GATE --> STORAGE
~~~

## Responsabilités des clients

Le Web sert au pilotage : comptes, référentiels, qualification, dossiers, priorités, affectations, supervision, vérification et historique.

Le Mobile est commun aux citoyens et agents. Le citoyen crée et suit ses signalements, ajoute des photos et une position. L'agent consulte ses missions, renseigne le compte rendu et transmet les preuves. L'interface s'adapte au rôle, mais l'API reste l'autorité de sécurité.

Le MVP suppose une connexion réseau pour les opérations métier. Le mode hors connexion complet nécessitera une décision distincte sur stockage local, file d'attente, idempotence, synchronisation et conflits.

## Couches backend

1. Présentation : contrôleurs REST, DTO, validation et sérialisation.
2. Application : cas d'utilisation et orchestration.
3. Domaine : règles métier, invariants, transitions et politiques.
4. Infrastructure : Prisma, PostgreSQL, Supabase Auth, Storage et tâches techniques.

~~~mermaid
flowchart LR
  A[Soumission citoyenne] --> B[Qualification]
  B -->|Complément demandé| C[Réponse citoyenne]
  C --> B
  B -->|Accepté| D[Rattachement / dossier]
  D --> E[Priorité et catégories]
  E --> F[Affectation équipe]
  F --> G[Intervention terrain]
  G --> H[Vérification]
  H -->|À reprendre| F
  H -->|Résolu| I[Clôture]
~~~

Ce flux décrit la cible métier. Il ne signifie pas que toutes ces étapes sont déjà exposées par les applications.