# Component Specification

# Informations générales

## Identifiant

CMP-001

---

## Nom

Carte interactive

---

## Catégorie

* Map

---

## Description

Composant d'affichage cartographique des signalements : marqueurs positionnés sur les coordonnées fournies par l'API, popups de consultation rapide et couche heatmap pour les zones critiques (admin). Aucune logique métier — il reçoit des données cartographiques et les rend.

---

# Objectif

Offrir une vue géographique unique, réutilisable sur les trois espaces (citoyen, agent, admin) sans dupliquer la logique de rendu Leaflet.

---

# Responsabilité

Rendre des données cartographiques (marqueurs et/ou heatmap) sur une carte interactive, avec interactions standard (pan, zoom, popup). C'est le seul composant de l'application qui manipule Leaflet.

---

# Utilisation

* Citizen : SCR-003 (carte de mes signalements), SCR-006 (localisation dans le détail)
* Agent : SCR-006 (localisation dans le détail)
* Admin : SCR-007 (heatmap des zones critiques — BR-DASH-001), SCR-006

---

# Variantes

* Carte marqueurs (SCR-003, SCR-006) : un marqueur par signalement, popup avec informations essentielles
* Carte heatmap (SCR-007) : couche de chaleur pondérée par zone (data de `GET /api/dashboard/heatmap`)
* Carte lecture seule (SCR-006) : sans interaction d'ajout, marqueur unique centré

---

# États

* Default
* Loading (squelette / indicateur pendant le chargement des données ou des tuiles)
* Error (impossible de charger la carte ou les données)
* Empty (aucun marqueur à afficher — message « Aucun signalement à afficher sur cette zone »)

États exclus (justification) : `No Results` — le composant n'effectue pas de filtrage ; `Empty` couvre l'absence de marqueurs. `Offline` — la détection hors ligne est gérée globalement par la couche applicative ; l'échec des tuiles ou des données aboutit à l'état `Error`.

---

# Propriétés

| Nom | Type | Obligatoire | Valeur par défaut | Description |
| --- | ---- | ----------- | ----------------- | ----------- |
| markers | MarkerData[] | Non | [] | Marqueurs (id, latitude, longitude, titre, statut, informations popup) |
| heatmapData | HeatmapPoint[] | Non | [] | Points pondérés (latitude, longitude, weight) |
| center | LatLng | Non | Selon les données | Centre initial de la carte |
| zoom | Number | Non | 13 | Niveau de zoom initial |
| interactive | Boolean | Non | true | Autorise pan/zoom/popups |
| markerClick | Événement | Non | — | Émis au clic sur un marqueur |

---

# Événements

| Événement | Déclencheur | Description |
| --------- | ----------- | ----------- |
| markerClick | Clic sur un marqueur | Transmet l'identifiant du signalement (navigation vers SCR-006) |
| ready | Carte initialisée | Signale que la carte est prête |

---

# Slots / Contenu

* Popup du marqueur : titre du signalement, statut (libellé UI), miniature de photo si disponible, action « Voir le détail ».
* Aucun slot de contenu interne — les données arrivent par propriétés.

---

# Règles d'utilisation

* Utiliser CMP-001 pour toute représentation géographique de signalements ou de zones.
* Ne pas l'utiliser pour des contenus non cartographiques.
* La heatmap est réservée à l'admin (les données ne sont exposées qu'à ce rôle).
* Les coordonnées proviennent exclusivement de l'API (jamais calculées côté frontend).
* Limitation : Leaflet ne dispose pas de clé API ; le choix des tuiles est configurable par l'environnement (ADR-002).

---

# Accessibilité

* La carte est doublée d'une liste alternative (les écrans SCR-003/SCR-005 offrent une vue liste).
* Navigation clavier : focus sur les marqueurs (tab), activation (Enter).
* Rôle ARIA : `application` ou `img` avec `aria-label` décrivant la zone affichée.
* Alternatif textuel : le nombre de signalements affichés est annoncé.

---

# Responsive

* Mobile : carte pleine largeur, hauteur adaptée (60 % de la hauteur d'écran max), boutons de zoom adaptés.
* Tablet : carte pleine largeur ou en colonne secondaire.
* Desktop : carte dans son conteneur, hauteur 400-500 px par défaut ; heatmap admin en pleine largeur (SCR-007).

---

# Design System

Variables utilisées (à préciser par l'UI Designer avec le Design System Figma) :

* Couleurs : couleur du marqueur selon le statut (mapping des statuts), couleur de la couche heatmap (dégradé)
* Typographie : popup (styles texte du Design System)
* Espacements : marges de la popup
* Ombres : popup (token d'ombre)
* Rayons : popup (token de rayon)

Aucune valeur arbitraire.

---

# Dépendances

* Enfants : aucun composant interne (Leaflet + plugin heatmap — ADR-002)
* Parents : pages SCR-003, SCR-006, SCR-007
* Services : aucun direct — données fournies par les pages

---

# Figma

Page : 01 Components (fichier Figma "ISI-Eco Report") - Composants lies : MapView + Badge - Variants : conformes a la spec - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Angular

* Nom du composant : MapView (+ HeatmapView)
* Sélecteur : `app-map-view`, `app-heatmap-view`
* Inputs : `markers`, `heatmapData`, `center`, `zoom`, `interactive`
* Outputs : `markerClick`, `ready`
* Signals utilisés : `markers`/`heatmapData` en `input()` ; état de chargement local
* Services utilisés : aucun (Leaflet importé en lazy — module chargé à la demande)

---

# Performance

* Lazy loading du module cartographique (chargé uniquement sur les écrans concernés).
* Re-rendu uniquement en cas de changement des entrées (OnPush).
* Pas de tuiles chargées hors viewport (comportement natif Leaflet).

---

# Tests

* Rendu : marqueurs affichés selon les données fournies.
* Variantes : mode heatmap (SCR-007) et mode lecture seule (SCR-006).
* Événements : `markerClick` émis avec le bon identifiant.
* Accessibilité : présence de l'alternative textuelle et focus clavier.

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

* Leaflet (et le plugin `leaflet.heat`) sont des dépendances validées (ADR-002).
* Les données de la heatmap arrivent avec la forme `latitude`, `longitude`, `weight` (`GET /api/dashboard/heatmap`).

---

# Décisions

* CMP-001 est l'unique composant autorisé à manipuler Leaflet (isolation technique).
* La heatmap est un mode du composant, pas un composant séparé.

---

# Historique

Auteur : Product Architect
Version : 1.0
Date : 2026-08-06

---

# Statut

Validé
