# Livrables UML

Les diagrammes sont intégrés comme SVG vectoriels, affichables directement dans GitHub et lisibles au zoom.

## Diagramme de contexte

![Diagramme de contexte ISI-Eco Report](contexte-systeme.svg)

Source et explications : [contexte-systeme.md](contexte-systeme.md).

## Diagramme de cas d’utilisation

![Diagramme UML détaillé des cas d’utilisation](cas-utilisation.svg)

- [Présentation du diagramme et conventions UML](cas-utilisation.md)
- [Description détaillée des cas d’utilisation par acteur](cas-utilisation-par-acteur.md)

Le diagramme représente les huit rôles métier et explicite les relations `<<include>>` et `<<extend>>`. Les fiches décrivent les préconditions, objectifs, résultats et règles propres à chaque acteur. Ces spécifications décrivent le périmètre fonctionnel cible et ne valent pas preuve d’implémentation.

## Diagramme de classes / données

![Vue relationnelle des 38 modèles Prisma](modele-donnees.svg)

Cette vue est générée à partir du schéma Prisma actuel et représente les 38 modèles métier et leurs relations. Le détail des colonnes, clés et contraintes demeure dans le schéma Prisma et le [MLD v2.13](../merise/README.md).

## Note sur les livrables historiques

Les documents de conception initiaux contiennent également des vues historiques des cas d'utilisation par rôle. Les spécifications présentées ici sont la référence consolidée à maintenir avec les huit rôles métier, le MLD v2.13 et les règles de sécurité.
