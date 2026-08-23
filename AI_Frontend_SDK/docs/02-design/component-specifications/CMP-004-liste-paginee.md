# Component Specification

# Informations générales

## Identifiant

CMP-004

---

## Nom

Liste paginée générique

---

## Catégorie

* Data Display

---

## Description

Composant de listage paginé des ressources de l'API : rendu d'items, pagination (structure `data/links/meta`), états Loading/Empty/Error/No Results/Offline et actions contextuelles (recherche, filtres, ouverture de détail). Il est utilisé par toutes les listes de l'application.

---

# Objectif

Éviter la duplication du pattern « liste paginée » (pagination, états, rafraîchissement) sur l'ensemble des écrans de liste, conformément au contrat de pagination de l'API (15/page, `data/links/meta`).

---

# Responsabilité

Afficher une liste paginée à partir d'une source de données fournie par la page, gérer la navigation entre pages et les états de contenu ; il ne contient aucune logique métier.

---

# Utilisation

* Citizen : SCR-005 (mes signalements), SCR-015 (historique de points)
* Agent : SCR-010 (interventions)
* Admin : SCR-008 (file de validation), SCR-009 (affectations), SCR-011 (équipes), SCR-012 (référentiels), SCR-013 (utilisateurs)

---

# Variantes

* Liste simple : items avec ouverture de détail.
* Liste filtrable : avec SearchBar/filtres clients (les filtres sont côté client — l'API n'expose pas de paramètres de filtrage).
* Liste avec actions : boutons d'action par item (ex. valider, affecter, supprimer).
* Liste avec vue alternative carte : bascule liste ↔ carte (SCR-003, SCR-007).

---

# États

* Loading (squelettes)
* Success (items affichés)
* Empty (aucune donnée — message + action éventuelle « Créer »)
* Error (bannière + « Réessayer »)
* No Results (filtres actifs sans résultat — proposition de réinitialiser les filtres)
* Offline (bannière hors ligne)

---

# Propriétés

| Nom | Type | Obligatoire | Valeur par défaut | Description |
| --- | ---- | ----------- | ----------------- | ----------- |
| items | T[] | Oui | [] | Items de la page courante |
| total | Number | Oui | 0 | Nombre total d'éléments |
| currentPage | Number | Oui | 1 | Page courante |
| lastPage | Number | Oui | 1 | Dernière page |
| loading | Boolean | Non | false | Chargement en cours |
| emptyMessage | String | Non | « Aucun élément » | Message de l'état vide |
| noResultsMessage | String | Non | « Aucun résultat » | Message de l'état No Results |
| filtersActive | Boolean | Non | false | Indique que des filtres sont actifs |
| itemTemplate | TemplateRef | Oui | — | Gabarit d'affichage d'un item |
| actions | Action[] | Non | [] | Actions contextuelles par item |

---

# Événements

| Événement | Déclencheur | Description |
| --------- | ----------- | ----------- |
| pageChange | Navigation de pagination | Transmet la nouvelle page (la page appelle l'API) |
| retry | Clic « Réessayer » | Relance le chargement |
| itemClick | Clic sur un item | Transmet l'item (navigation vers le détail) |
| actionClick | Clic sur une action contextuelle | Transmet { action, item } |
| resetFilters | Clic « Réinitialiser les filtres » | Vide les filtres et recharge |

---

# Slots / Contenu

* `itemTemplate` : gabarit de chaque item (fourni par la page).
* En-tête : titre, compteur (« 3 / 42 »), actions globales (ex. « Créer »).
* Zone de filtres : contenu optionnel inséré par la page.

---

# Règles d'utilisation

* Utiliser pour toute liste paginée issue de l'API.
* La pagination suit la structure `data/links/meta` (ADR-004, ApiService).
* Ne pas l'utiliser pour des contenus statiques ou non paginés.
* Les filtres sont toujours clients (l'API ne supporte pas de filtrage — contrainte `docs/01-analysis/api-analysis.md`).
* Le chargement des données reste la responsabilité de la page (le composant est présentational).

---

# Accessibilité

* Navigation par pagination accessible (boutons avec labels, aria-current).
* États annoncés (aria-live) pendant le chargement et les erreurs.
* Navigation clavier entre items.

---

# Responsive

* Mobile : items empilés, pagination compacte (« Précédent / Suivant » + « Page X sur Y »).
* Tablet : items en grille 2 colonnes si adapté, sinon liste.
* Desktop : liste pleine largeur, pagination complète (numéros).

---

# Design System

Variables utilisées (à préciser par l'UI Designer avec le Design System Figma) :

* Couleurs : séparation des items, états de pagination (active)
* Typographie : titres, compteurs, messages vides
* Espacements : gaps de liste, paddings de pagination
* Ombres : cartes d'items
* Rayons : cartes

Aucune valeur arbitraire.

---

# Dépendances

* Enfants : composants Design System (Skeleton, EmptyState, Banner, Button, SearchBar)
* Parents : pages de liste (SCR-005, SCR-008, SCR-010, SCR-011, SCR-012, SCR-013, SCR-015)
* Services : aucun direct (les données arrivent de la page)

---

# Figma

Page : 01 Components (fichier Figma "ISI-Eco Report") - Composants lies : Card, Table, SearchBar, Skeleton, EmptyState, Badge - Variants : conformes a la spec - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Angular

* Nom du composant : DataList
* Sélecteur : `app-data-list`
* Inputs : `items`, `total`, `currentPage`, `lastPage`, `loading`, `emptyMessage`, `noResultsMessage`, `filtersActive`, `itemTemplate`, `actions`
* Outputs : `pageChange`, `retry`, `itemClick`, `actionClick`, `resetFilters`
* Signals utilisés : entrées en `input()` ; état de pagination local
* Services utilisés : aucun

---

# Performance

* OnPush ; items rendus avec `track` par identifiant.
* Si listes longues futures : virtualisation possible en évolution (non requis à 15/page).

---

# Tests

* Rendu : items, compteur, pagination.
* États : Loading/Empty/Error/No Results/Offline.
* Événements : `pageChange`, `retry`, `itemClick`, `actionClick`, `resetFilters`.
* Accessibilité : pagination et annonces.

---

# Critères d'acceptation

* [ ] Conforme au Design System (à valider avec la maquette Figma)
* [ ] Toutes les variantes existent
* [ ] Tous les états sont disponibles
* [ ] Responsive
* [ ] Accessible
* [ ] Réutilisable
* [ ] Documenté
* [ ] Testé

---

# Hypothèses

* Toutes les listes de l'API sont paginées à 15 avec la structure `data/links/meta` (docs/01-analysis/endpoints.md).
* Les filtres restent côté client tant que l'API n'expose pas de paramètres.

---

# Décisions

* Composant présentational : la page possède les données et orchestre les appels API.
* Un seul composant de liste pour toute l'application (pas de duplication par espace).

---

# Historique

Auteur : Product Architect
Version : 1.0
Date : 2026-08-06

---

# Statut

Validé
