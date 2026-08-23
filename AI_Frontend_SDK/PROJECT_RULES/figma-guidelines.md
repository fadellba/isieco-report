# PROJECT RULES — Figma Guidelines

Version : 1.0

---

# Objectif

Définir les conventions de conception Figma afin de garantir un Design System cohérent, maintenable et exploitable par les développeurs Angular.

Figma est la source de vérité visuelle du projet.

---

# Principes

Toute interface doit être :

* cohérente ;
* simple ;
* accessible ;
* réutilisable ;
* responsive.

Le Design System prévaut sur toute décision individuelle.

---

# Organisation du fichier

Le fichier Figma doit respecter l'organisation suivante :

00 Foundations

01 Components

02 Citizen

03 Agent

04 Admin

05 Prototype

Aucune page supplémentaire ne doit être créée sans justification.

> **Adaptation plan Starter (3 pages max)** : si le compte Figma est limité à 3 pages, l'organisation devient `00 Foundations` / `01 Components` / `02 Screens` — la page `02 Screens` regroupe les trois espaces (Citizen, Agent, Admin) en sections nommées, et le prototype vit dans une section `Prototype` de la même page.

> **Création des composants via plugin (limitation)** : le plugin MCP ne supporte pas la conversion frames → composants (opération « create component » défaillante, paramètre `componentId` manquant). Procédure : les variantes sont créées comme **frames nommés `Nom/type=X, size=Y`** (auto layout + variables liées) puis conversion en component set en **1 clic dans Figma** (sélectionner les frames → clic droit → « Create component set » — les variants sont déduits des noms).

---

# Foundations

La page Foundations contient uniquement :

* Couleurs
* Typographie
* Espacements
* Grille
* Icônes
* Ombres
* Rayons
* Variables
* Styles

---

# Components

Tous les composants doivent être créés comme composants Figma.

Utiliser :

* Variants
* Auto Layout
* Variables
* Component Properties

Éviter les duplications.

---

# Design Tokens

Toutes les couleurs doivent provenir des Variables.

Ne jamais appliquer une couleur en valeur fixe lorsqu'une Variable existe.

Même règle pour :

* espacements ;
* rayons ;
* tailles ;
* typographie.

---

# Auto Layout

Auto Layout est obligatoire.

Tous les composants doivent être :

* flexibles ;
* redimensionnables ;
* adaptables.

Les positions absolues doivent rester exceptionnelles.

---

# Grille

Utiliser une grille de 8 px.

Tous les espacements doivent être des multiples de cette grille.

---

# Responsive

Prévoir les variantes nécessaires :

Citizen

→ Mobile

Agent

→ Mobile

Admin

→ Desktop

Les composants doivent fonctionner sur plusieurs tailles d'écran.

---

# Composants

Les composants doivent être génériques.

Exemple :

Button

Variantes :

* Primary
* Secondary
* Outline
* Danger
* Ghost

États :

* Default
* Hover
* Focus
* Active
* Disabled
* Loading

Même principe pour tous les composants.

---

# Icônes

Utiliser une seule bibliothèque d'icônes pour tout le projet.

Ne jamais mélanger plusieurs styles.

---

# Couleurs

Les couleurs doivent respecter :

* Primary
* Secondary
* Success
* Warning
* Error
* Info
* Neutral

Aucune couleur arbitraire.

---

# Typographie

Définir des styles :

* Display
* H1
* H2
* H3
* Body Large
* Body
* Small
* Caption

Ne jamais appliquer une taille manuellement si un style existe.

---

# États d'interface

Chaque écran doit prévoir :

* Loading
* Empty
* Error
* Success

Ces états doivent également exister dans Figma.

---

# Accessibilité

Respecter :

* contraste suffisant ;
* zones tactiles adaptées ;
* lisibilité ;
* hiérarchie visuelle.

---

# Prototype

Le prototype doit permettre de démontrer les principaux parcours :

* Citizen
* Agent
* Admin

Les interactions doivent être simples et réalistes.

---

# Documentation

Chaque composant complexe doit comporter une description indiquant :

* son usage ;
* ses variantes ;
* ses propriétés ;
* les règles d'utilisation.

---

# Interdictions

Il est interdit de :

* dupliquer un composant existant ;
* créer des couleurs hors Design System ;
* utiliser des espacements arbitraires ;
* casser Auto Layout ;
* modifier un composant validé sans justification.

---

# Definition of Done

Le travail est terminé lorsque :

* le Design System est complet ;
* tous les composants utilisent Auto Layout ;
* toutes les couleurs utilisent des Variables ;
* toutes les maquettes utilisent exclusivement les composants officiels ;
* les écrans sont prêts à être implémentés dans Angular sans ambiguïté.
