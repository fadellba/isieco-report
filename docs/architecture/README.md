# Architecture

## Architecture applicative cible

![Schéma de l’architecture applicative](architecture-applicative.svg)

La cible comprend une application Web d'administration, une application Mobile unique pour les citoyens et les agents de terrain, et une API REST NestJS déployée comme monolithe modulaire. Les modules partagent un backend et PostgreSQL. Aucun besoin mesuré ne justifie des microservices pour le MVP.

## Documents

- [Architecture applicative détaillée](architecture-applicative.md)
- [Organisation cible du monorepo](organisation-monorepo.md)
- [Décisions d'architecture (ADR)](decisions.md)
- [Sécurité et habilitations](securite-et-habilitations.md)
- [État des livrables](etat-des-livrables.md)
- [Principes d'ingénierie](engineering-principles.md)

## Modules métier

| Module | Responsabilité |
|---|---|
| accounts | Profils, comptes et rôles. |
| reports | Signalements et médias associés. |
| qualification | Analyse, complétude et décision. |
| cases | Création et pilotage des dossiers. |
| assignments | Affectation des catégories aux équipes. |
| interventions | Exécution terrain et compte rendu. |
| verification | Vérification et clôture ou reprise. |
| referentials | Types de déchets, équipes, compétences, géographie. |
| audit | Événements métier et historique. |

Ce sont des frontières applicatives internes, pas des services déployés séparément. À la date du 31 octobre 2026, Accounts, Referentials, Reports, Qualification, Cases, Assignments, Interventions, Verification et l'infrastructure Médias sont intégrés dans main. La branche Phase 11 ajoute une consultation d'audit à portée limitée : activité personnelle et historique de rôles réservé à ADMINISTRATEUR_COMPTES. Aucun listing global ni export n'est exposé. Les interfaces métier Web et Mobile restent à réaliser.