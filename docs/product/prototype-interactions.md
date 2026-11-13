# ISIECO — Prototype interaction map

> **Version :** 0.1  
> **Status :** spécification de prototype, connexions Figma à appliquer  
> **Périmètre :** six wireframes basse fidélité existants  
> **Fichier Figma :** [ISIECO — UX Wireframes (Low Fidelity)](https://www.figma.com/design/3nnUEI6AEwHeUOYJEZQrkf)

Ce document décrit le graphe de navigation attendu pour transformer les six wireframes en prototype cliquable. Il sépare les interactions que les six écrans permettent déjà de simuler des parcours qui nécessitent de nouvelles vues ou des contrats API.

**Limite d'exécution :** les frames existent dans Figma et restent éditables, mais les connexions prototype n'ont pas pu être ajoutées pendant cette session : le quota d'appels Figma MCP du forfait Starter a été atteint. Les liens ci-dessous sont donc la spécification à appliquer, pas des connexions Figma déjà actives.

---

## 1. Écrans Figma existants

| ID de frame | Écran | Dimension | Flow |
|---|---|---:|---|
| `5:623` | Citoyen — Accueil | 390 × 844 | Citoyen |
| `5:721` | Citoyen — Nouveau signalement | 390 × 844 | Citoyen |
| `5:759` | Citoyen — Suivi du signalement | 390 × 844 | Citoyen |
| `5:854` | Agent — Mes missions | 390 × 844 | Agent |
| `5:949` | Agent — Détail et itinéraire | 390 × 844 | Agent |
| `5:992` | Web — Centre de commandement | 1440 × 1000 | Web |

Les frames sont éditables. Les identifiants ci-dessus sont les identifiants Figma retournés lors de leur création.

## 2. Flow citoyen

Point de départ : **Citoyen — Accueil**.

| Source | Cible | Déclencheur | Comportement |
|---|---|---|---|
| Accueil | Nouveau signalement | Bouton « Signaler un dépôt » | Transition `SMART_ANIMATE` ou `DISSOLVE`, 200 ms |
| Accueil | Nouveau signalement | Onglet « Signaler » de la bottom navigation | Même destination |
| Accueil | Suivi du signalement | Onglet « Suivi » | Ouvrir la vue de suivi |
| Nouveau signalement | Accueil | Bouton retour | Retour au contexte d'accueil |
| Nouveau signalement | Suivi du signalement | Bouton « Envoyer le signalement » | Simuler un succès d'envoi et afficher le suivi |
| Suivi du signalement | Accueil | Onglet « Accueil » | Revenir à l'accueil |
| Suivi du signalement | Nouveau signalement | Onglet « Signaler » | Démarrer un autre signalement |
| Suivi du signalement | Suivi du signalement | Onglet « Suivi » | Garder la vue active |

### Règles de prototype

- La photo est la première action visuellement présentée.
- La localisation est la deuxième étape et reste modifiable.
- La description et les types de déchets sont facultatifs dans l'expérience cible.
- L'action d'envoi mène à l'écran de suivi dans le prototype uniquement. Elle ne déclenche aucun appel API.
- Le prototype doit être présenté comme une simulation UX, jamais comme une soumission réelle.

### État manquant à ajouter ensuite

Un écran de confirmation de dépôt (référence, date, état initial et accès au suivi) améliorerait le retour utilisateur. Il n'est pas dans les six frames actuelles ; la transition directe vers le suivi est une simplification de prototype.

## 3. Flow agent de terrain

Point de départ : **Agent — Mes missions**.

| Source | Cible | Déclencheur | Comportement |
|---|---|---|---|
| Mes missions | Détail et itinéraire | Carte de mission ou « Voir la mission » | Ouvrir le détail sélectionné |
| Détail et itinéraire | Mes missions | Bouton retour | Revenir à la liste |
| Détail et itinéraire | Mes missions | « Accepter la mission » | Retour à la liste comme simulation de prise en compte |

### Limites à ne pas masquer

- L'action « Ouvrir l'itinéraire » doit, en production, ouvrir l'application cartographique du téléphone avec les coordonnées réelles du site. Le wireframe ne contient qu'un fond cartographique fictif et une destination d'exemple ; il ne faut pas ajouter un lien GPS avec des coordonnées inventées.
- Le clic « Accepter la mission » ne peut pas représenter l'ensemble de l'exécution. Une fois la mission acceptée, l'agent doit pouvoir démarrer une intervention, prendre les photos avant/après, saisir un compte rendu, choisir le résultat et soumettre les preuves.
- Aucun écran d'exécution d'intervention n'est présent dans les six wireframes.

### Écrans à ajouter pour un parcours agent complet

1. Confirmation/état de mission après acceptation.
2. Intervention en cours : accès itinéraire, démarrage, preuves photo et compte rendu.
3. Confirmation de soumission : résultat, date et attente de vérification.

Le prototype à six écrans peut démontrer la consultation et le détail d'une mission, mais pas une exécution terrain de bout en bout.

## 4. Flow Web — centre de commandement

Point de départ : **Web — Centre de commandement**.

Interactions cibles sur la frame actuelle :

| Source | Cible / effet | Déclencheur |
|---|---|---|
| Carte opérationnelle | Sélection du point et mise à jour du panneau droit | Clic sur un marqueur |
| Panneau droit | Fiche détaillée du dossier | « Ouvrir le dossier » |
| Panneau droit | Historique métier | « Voir l'historique » |
| Sidebar | Accès aux vues métier | Clic sur chaque entrée |

La frame actuelle montre déjà un point sélectionné et son panneau de contexte. Une version interactive doit présenter plusieurs états (aucun point sélectionné, signalement sélectionné, affectation sélectionnée, intervention sélectionnée), sans créer l'illusion que le fond cartographique est déjà intégré.

### Écrans Web complémentaires requis

- Fiche signalement et qualification, avec demandes de complément, acceptation ou rejet selon habilitation.
- Détail de dossier et historique.
- Panneau d'affectation : choix d'une équipe active et compétente, puis confirmation.
- Détail d'intervention et preuves.
- Panneau de vérification avec décision conforme ou reprise.

Le centre de commandement doit conserver la carte en arrière-plan et présenter les détails dans un panneau latéral ou un drawer. Les actions doivent dépendre du rôle actif ; aucune action administrative ne doit apparaître comme universellement disponible.

## 5. Interactions transversales

- Les écrans mobiles citoyens et agents sont deux espaces de la même application, mais leurs bottom navigations restent différentes.
- Le changement d'espace n'est pas visible dans les six frames actuelles. Ajouter un contrôle de contexte dans Profil avant de prétendre que le multi-rôle est entièrement prototypé.
- Les retours doivent suivre la pile de navigation logique et conserver les filtres ou l'équipe sélectionnée lorsque cela est pertinent.
- Les transitions doivent rester sobres et rapides ; éviter les animations qui retardent une action de terrain.
- Les états « loading », « erreur », « vide », « permission refusée » et « hors connexion » restent à prototyper.

## 6. Ce qui relève du prototype et ce qui relève du produit réel

| Comportement | Prototype Figma | Produit réel |
|---|---|---|
| Navigation entre les frames | Oui | Navigation native/routeur |
| Envoi du signalement | Simulation | API, idempotence, upload photo et confirmation |
| Timeline | Événements statiques de démonstration | Endpoint citoyen filtré et sécurisé |
| Carte | Fond et marqueurs fictifs | Fournisseur de cartes et données géographiques réelles |
| Sélection de point Web | Simulation de panneau | Read model cartographique et endpoints de détail |
| Affectation | Simulation visuelle | Règles métier et API d'affectation |
| Itinéraire agent | Non tant que les coordonnées sont fictives | Deep link cartographique avec coordonnées API |
| Intervention | Parcours à concevoir | API d'intervention, médias et vérification |
| Temps réel | Non | Stratégie de rafraîchissement/diffusion dédiée |

## 7. Ordre de réalisation lors de la prochaine session Figma

1. Ajouter les réactions `ON_CLICK` entre les écrans existants du flow citoyen.
2. Ajouter les liens de mission du flow agent.
3. Définir deux points de départ de prototype : citoyen et agent.
4. Ajouter les nouveaux écrans agent d'exécution.
5. Créer les états de sélection et les panneaux contextuels Web.
6. Ajouter les transitions Web vers qualification, dossier, affectation et vérification.
7. Tester les parcours complets en mode Present, puis documenter les limites restantes.

### Critères de validation

- Chaque action visuellement principale a une destination ou un résultat prototype explicite.
- Aucun bouton principal ne conduit à une frame inexistante.
- Les deux flows mobiles sont compréhensibles séparément.
- Le prototype Web permet de comprendre le comportement de sélection cartographique.
- Les données fictives sont identifiées comme exemples.
- Aucun lien GPS, état métier ou événement de timeline n'est présenté comme réel s'il ne l'est pas.
