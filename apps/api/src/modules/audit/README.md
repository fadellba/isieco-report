# Module Audit

Historique métier, traçabilité et événements.

## État

Les modules métier écrivent déjà leurs événements dans `EvenementMetier` au sein des mêmes transactions que les mutations sensibles. Les événements couvrent notamment les comptes et rôles, référentiels, signalements, qualification, dossiers, affectations, interventions, photos, vérification et clôture.

Le module NestJS Audit est initialisé mais ne propose pas encore d'API de consultation centralisée.

## À développer

- File paginée des événements, avec bornes temporelles et filtres par type et cible.
- Détail d'un événement avec masquage des champs personnels et des secrets.
- Contrôle des rôles autorisés à consulter les événements et séparation des informations internes.
- Export filtré et borné, journalisation des exports et limites anti-abus.
- Tests de non-divulgation, pagination, filtres, autorisations et volumes.

Les données d'audit sont append-only du point de vue des modules consommateurs. Ne jamais permettre à une API générique de modifier ou supprimer les événements.
