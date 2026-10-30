# Livrables UML

Les diagrammes sont intégrés dans la documentation sous forme de graphiques Mermaid ou SVG, avec leurs sources textuelles versionnées.

## Diagramme de contexte

![Diagramme de contexte ISI-Eco Report](contexte-systeme.svg)

Source et explications : [contexte-systeme.md](contexte-systeme.md).

## Diagramme de cas d’utilisation

![Diagramme UML détaillé des cas d’utilisation](cas-utilisation.svg)

- [Présentation du diagramme et conventions UML](cas-utilisation.md)
- [Description détaillée des cas d’utilisation par acteur](cas-utilisation-par-acteur.md)

Le diagramme représente les huit rôles métier et explicite les relations `<<include>>` et `<<extend>>`. Les fiches décrivent les préconditions, objectifs, résultats et règles propres à chaque acteur.

## Diagramme de classes UML

![Diagramme de classes du système ISI-Eco Report](diagramme-classes-systeme.png)

[Ouvrir les sources Mermaid, les attributs et les conventions](diagramme-classes.md).

Les vues PNG détaillées par domaine sont également publiées :

- [Identité et engagement](diagramme-classes-identite-engagement.png)
- [Référentiels et équipes](diagramme-classes-referentiels-equipes.png)
- [Signalements et qualification](diagramme-classes-signalements-qualification.png)
- [Dossiers et opérations](diagramme-classes-dossiers-operations.png)
- [Traçabilité et diffusion](diagramme-classes-tracabilite-diffusion.png)

Cette source Mermaid contient les 38 classes métier, leurs attributs, les marqueurs PK/FK/UQ et les associations du schéma Prisma. Cinq vues par domaine métier sont proposées, suivies de l'inventaire des associations inter-domaines.

## Vue relationnelle synthétique du modèle de données

![Vue relationnelle synthétique des 38 modèles Prisma](modele-donnees.svg)

Cette vue SVG sert d'index visuel du MLD. Elle ne remplace pas le diagramme de classes détaillé. Les colonnes, clés et contraintes sont définies dans [schema.prisma](../../prisma/schema.prisma) et le [MLD v2.13](../merise/README.md).

## Référence

Le modèle métier actuel est défini par les 38 modèles Prisma. Les spécifications UML décrivent la conception cible et ne valent pas preuve d’implémentation de tous les parcours.
