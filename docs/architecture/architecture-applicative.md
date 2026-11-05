# Architecture applicative

## Décision

Le MVP repose sur une application Web d'administration, une application Mobile unique pour les citoyens et agents, et une API REST NestJS sous `/api/v1`. Le backend est un monolithe modulaire : les modules partagent le même processus, les transactions PostgreSQL et les frontières d'autorisation. Aucun besoin mesuré ne justifie des microservices.

## Vue logique

~~~mermaid
flowchart TB
  subgraph Clients
    WEB[Web administration - React et Vite]
    MOB[Mobile citoyen et agent - Expo et React Native]
  end
  subgraph API["Backend NestJS - monolithe modulaire"]
    GATE[API REST /api/v1]
    ACC[Comptes et rôles]
    REF[Types de déchets et équipes]
    REP[Signalements et médias]
    QUAL[Qualification et compléments]
    CASE[Dossiers]
    ASSIGN[Affectations]
    INT[Interventions et photos]
    VERIF[Vérification]
    GATE --> ACC
    GATE --> REF
    GATE --> REP
    GATE --> QUAL
    GATE --> CASE
    GATE --> ASSIGN
    GATE --> INT
    GATE --> VERIF
  end
  AUTH[Supabase Auth]
  DB[(PostgreSQL / Supabase)]
  STORAGE[(Supabase Storage privé)]
  WEB -->|HTTPS JSON et Bearer| GATE
  MOB -->|HTTPS JSON et Bearer| GATE
  WEB -->|Connexion| AUTH
  MOB -->|Connexion| AUTH
  GATE -->|Validation JWT| AUTH
  GATE --> DB
  GATE --> STORAGE
~~~

## Modules métier

| Module | Responsabilité |
|---|---|
| `accounts` | Profil métier, comptes et attributions de rôles. |
| `referentials` | Types de déchets, équipes, appartenances et compétences d'équipe. |
| `reports` | Dépôt idempotent, suivi propriétaire, catégories déclarées, photos et compléments. |
| `qualification` | File de qualification, complément, acceptation et rejet. |
| `cases` | Constitution des dossiers, liaison directe des signalements, priorité, localisation et historique de statut des signalements liés. |
| `assignments` | Affectation des contenus de dossier aux équipes compétentes, réponse et réaffectation. |
| `interventions` | Démarrage terrain, photos de preuve et compte rendu. |
| `verification` | Contrôle indépendant, décision conforme ou demande de reprise. |

Ce sont des frontières applicatives internes, pas des services déployés séparément. Le modèle relationnel ne contient plus de module autonome Audit, de gamification/publication, de disponibilité historisée ou de géographie hiérarchique. L'historique de statut est porté par `HistoriqueStatutSignalement`.

## Cycle métier courant

~~~mermaid
flowchart LR
  A[Citoyen dépose un signalement] --> B[Qualification]
  B -->|Complément demandé| C[Réponse citoyenne]
  C --> B
  B -->|Accepté| D[Création d'un dossier]
  D --> E[Contenus par type de déchet]
  E --> F[Affectation à une équipe compétente]
  F --> G[Intervention terrain]
  G --> H[Vérification indépendante]
  H -->|À reprendre| F
  H -->|Conforme| I[Clôture du contenu]
~~~

Un signalement appartient à zéro ou un dossier via la relation directe `Signalement.idDossier`. Le responsable peut créer un dossier depuis un signalement qualifié ou lier/délier ce signalement à un dossier existant. Une affectation référence directement un contenu de dossier, une équipe et une compétence.

## Responsabilités des clients

Le Web sert au pilotage : comptes, référentiels, qualification, dossiers, priorité, affectations et vérification.

Le Mobile est commun aux citoyens et agents. Le citoyen crée et suit ses signalements, répond aux demandes de complément et ajoute des photos et une position. L'agent consulte les missions de ses équipes, démarre une intervention, renseigne le compte rendu et transmet les preuves. L'API reste l'autorité d'accès : masquer un bouton côté client ne constitue pas un contrôle de sécurité.

Le MVP suppose une connexion réseau pour les opérations métier. Le mode hors connexion complet nécessiterait une décision distincte sur le stockage local, la file d'attente, l'idempotence, la synchronisation et les conflits.

## Couches backend

1. Présentation : contrôleurs REST, DTO, validation et sérialisation.
2. Application : cas d'utilisation et orchestration.
3. Domaine : règles métier, invariants et transitions.
4. Infrastructure : Prisma, PostgreSQL, Supabase Auth, Storage et tâches techniques.

## Sécurité et stockage

Supabase Auth gère les identités et sessions ; `Utilisateur.authUserId` relie l'identité au profil métier. Les clients ne détiennent aucune clé privilégiée et ne se connectent pas directement à PostgreSQL. Les tables métier sont protégées par RLS et les droits Data API sont retirés ; NestJS utilise les secrets serveur.

Les photos sont privées. Les chemins de stockage ne sont pas communiqués au client ; l'API valide l'accès métier et émet les URL signées temporaires. Les dates d'expiration et de purge restent dans les entités photo.
