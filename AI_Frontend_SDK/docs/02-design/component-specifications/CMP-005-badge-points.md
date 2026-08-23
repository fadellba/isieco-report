# Component Specification

# Informations générales

## Identifiant

CMP-005

---

## Nom

Badge de points / fidélité

---

## Catégorie

* Data Display

---

## Description

Composant d'affichage du solde de points du citoyen : badge compact avec le total de points, option de libellé contextuel (« points ») et variante d'historique (signe +/‑ pour les gains et dépenses). Il affiche une valeur fournie — aucun calcul métier.

---

# Objectif

Afficher de manière cohérente et réutilisable les éléments de gamification (BR-GAM-001 à BR-GAM-004) sur les écrans citoyen, sans dupliquer le formatage.

---

# Responsabilité

Rendre visuellement une valeur de points (solde ou delta) avec son libellé et son signe éventuel ; il n'effectue aucun calcul ni appel API.

---

# Utilisation

* Citizen : SCR-003 (header/accueil — solde), SCR-005 (liste — solde), SCR-015 (points — total + historique avec signes), SCR-006 (détail — points gagnés après clôture, le cas échéant)

---

# Variantes

* Solde : valeur positive, libellé « points » (SCR-003, SCR-005, SCR-015).
* Delta positif : +X points (gain — clôture d'intervention, BR-INT-003).
* Delta négatif : −X points (dépense si le backend en expose).
* Compact : version réduite pour les en-têtes/barres de navigation.

---

# États

* Default
* Loading (squelette pendant le chargement du solde)
* Empty (valeur 0 — « 0 point »)
* Disabled (affichage grisé si l'utilisateur n'est pas citoyen)

États exclus (justification) : `Error` — en cas d'échec de chargement, le badge n'est pas rendu ; l'écran hôte affiche l'état d'erreur. `No Results` — sans objet (valeur unique). `Offline` — la détection hors ligne est gérée globalement par la couche applicative.

---

# Propriétés

| Nom | Type | Obligatoire | Valeur par défaut | Description |
| --- | ---- | ----------- | ----------------- | ----------- |
| value | Number | Oui | 0 | Valeur affichée |
| variant | 'solde' \| 'delta' | Non | 'solde' | Mode d'affichage (avec signe ou non) |
| compact | Boolean | Non | false | Version réduite |
| label | String | Non | 'points' | Libellé affiché après la valeur |

---

# Événements

| Événement | Déclencheur | Description |
| --------- | ----------- | ----------- |
| click | Clic sur le badge | Navigation vers SCR-015 (historique) — uniquement si `interactive` |

---

# Slots / Contenu

* Icône (points/trophée) optionnelle via la variante compact.
* Aucun contenu libre — valeur + libellé seulement.

---

# Règles d'utilisation

* Utiliser pour tout affichage de points citoyens.
* Ne jamais calculer le solde côté frontend : la valeur provient de l'API (somme exposée ou calcul documenté — ambiguïté n° 1, SCR-015).
* Le badge n'est affiché qu'aux citoyens (les autres rôles ne reçoivent pas de points).
* Ne pas l'utiliser pour d'autres métriques (compteurs non-fidélité).

---

# Accessibilité

* Texte lisible « X points » (pas uniquement l'icône).
* `aria-label` explicite sur la version compacte.
* Annonce des variations (aria-live) lors d'un gain visible (SCR-015).

---

# Responsive

* Mobile : compact dans les barres de navigation, standard dans les cartes.
* Tablet / Desktop : standard, position variable selon le layout.

---

# Design System

Variables utilisées (à préciser par l'UI Designer avec le Design System Figma) :

* Couleurs : fond du badge, couleur du texte, couleur du delta positif/négatif
* Typographie : chiffre + libellé (styles du Design System)
* Espacements : padding du badge
* Rayons : badge arrondi

Aucune valeur arbitraire.

---

# Dépendances

* Enfants : aucun (icône du Design System éventuellement)
* Parents : SCR-003, SCR-005, SCR-006, SCR-015, layouts citoyen
* Services : aucun direct

---

# Figma

Page : 01 Components (fichier Figma "ISI-Eco Report") - Composants lies : Badge + StatCard - Variants : conformes a la spec - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Angular

* Nom du composant : PointsBadge
* Sélecteur : `app-points-badge`
* Inputs : `value`, `variant`, `compact`, `label`
* Outputs : `click`
* Signals utilisés : `value`, `variant` (inputs signaux) ; formatage via pipe shared
* Services utilisés : aucun

---

# Performance

* OnPush ; aucun re-rendu inutile (entrées immuables).

---

# Tests

* Rendu : valeur + libellé ; signe pour le delta.
* Variantes : solde / delta / compact.
* Événements : `click` émis.
* Accessibilité : libellé textuel présent.

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

* La source du solde est l'API (ambiguïté n° 1 non résolue — SCR-015 définit le contournement : surlignage des entrées du citoyen, somme des gains côté client si le total n'est pas exposé).
* Le backend n'expose pas de dépenses actuellement (variante delta négatif réservée).

---

# Décisions

* Affichage uniquement : aucune logique de calcul dans le composant.
* Variante delta pour l'historique (SCR-015). Les « notifications de gain » ne sont pas prévues : le backend ne dispose d'aucun mécanisme de notification (exigence 2.2 du cahier des charges non implémentée — voir `docs/01-analysis/ecarts-cahier-des-charges.md`).

---

# Historique

Auteur : Product Architect
Version : 1.0
Date : 2026-08-06

---

# Statut

Validé
