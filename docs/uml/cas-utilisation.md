# Diagramme UML des cas d’utilisation

![Diagramme UML détaillé des cas d’utilisation ISI-Eco Report](cas-utilisation.svg)

Le diagramme présente les huit acteurs métier et leurs interactions avec ISI-Eco Report. Il distingue les cas principaux des comportements obligatoires ou conditionnels qui les complètent.

## Lire les relations UML

| Relation | Sens de la flèche | Signification |
|---|---|---|
| `<<include>>` | Du cas principal vers le cas inclus | Le comportement inclus est exécuté obligatoirement dans le cadre du cas principal. Il factorise une étape commune ou indispensable. |
| `<<extend>>` | Du cas complémentaire vers le cas de base | Le comportement complémentaire intervient uniquement sous une condition ou lorsqu'une option est choisie. Le cas de base reste valide sans cette extension. |
| Association acteur | Trait plein entre acteur et cas | L’acteur participe directement au cas d’utilisation. |

Les libellés du SVG utilisent la notation UML française `«include»` et `«extend»`, équivalente aux stéréotypes UML `<<include>>` et `<<extend>>`.

## Périmètre et règles de lecture

- Les acteurs sont les huit rôles métier définis dans [Sécurité et habilitations](../architecture/securite-et-habilitations.md).
- L’authentification et la vérification du jeton sont des préconditions transversales, pas des étapes métier répétées dans chaque cas. Supabase Auth reste un service externe.
- Les droits sont vérifiés par l’API à chaque opération. L’affichage d’un bouton dans un client ne constitue jamais une autorisation.
- Les fonctions de notifications, préférences, publications, points et badges apparaissent parce qu’elles sont représentées dans le MLD v2.13. Leur présence dans ce modèle ne prouve pas qu’elles sont déjà implémentées ni que leur périmètre de première version est définitivement validé.

La description des objectifs, préconditions, scénarios et règles propres à chaque acteur se trouve dans [Cas d’utilisation par acteur](cas-utilisation-par-acteur.md).

## Correspondance avec les fiches détaillées

Les identifiants affichés dans les ovales du diagramme sont repris dans la fiche par acteur : `CIT`, `QUAL`, `DOS`, `AFF`, `INT`, `VER`, `REF` et `ADM`.
