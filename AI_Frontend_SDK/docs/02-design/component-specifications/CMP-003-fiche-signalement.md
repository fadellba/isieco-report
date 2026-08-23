# Component Specification

# Informations générales

## Identifiant

CMP-003

---

## Nom

Fiche signalement (statuts, transitions)

---

## Catégorie

* Data Display

---

## Description

Composant de présentation d'un signalement dans le détail (SCR-006) : informations complètes, galerie de photos, statut actuel et actions de transition autorisées selon le rôle et l'état. Il pilote l'affichage des actions « valider / rejeter / prioriser / affecter / terminer / clôturer » selon la machine à états du backend, sans exécuter de logique métier.

---

# Objectif

Uniformiser la consultation et la gestion d'un signalement sur les trois espaces (citoyen, agent, admin) à partir d'un seul composant, garantissant la cohérence des actions affichées avec la table de transitions (BR-SIG-002).

---

# Responsabilité

Afficher les données d'un signalement et exposer les actions de transition pertinentes selon (rôle, statut) ; la décision d'autorisation finale reste côté backend (les 422 sont affichés tels quels).

---

# Utilisation

* Citizen : SCR-006 (suivi — lecture seule après soumission)
* Agent : SCR-006 (consultation, lien vers interventions)
* Admin : SCR-006 (validation, priorisation, affectation), SCR-008 (file de validation)

---

# Variantes

* Fiche consultation (Citizen) : lecture seule, suivi de statut, aucun bouton de transition (le citoyen ne modifie pas au-delà du brouillon — BR-SIG-001)
* Fiche gestion (Admin) : actions valider / rejeter / prioriser / affecter selon le statut
* Fiche agent : lien vers l'intervention, actions liées aux interventions (créer, terminer, clôturer si concerné)

---

# États

* Default
* Loading (squelette du détail)
* Error (impossible de charger le signalement)
* Success (données affichées)
* Disabled (actions masquées selon rôle/statut)

États exclus (justification) : `Empty` — le composant ne s'affiche pas sans signalement chargé ; l'écran hôte gère l'absence de données. `No Results` — sans objet (détail unique, pas de liste). `Offline` — la détection hors ligne est gérée globalement ; l'échec de chargement aboutit à l'état `Error`.

---

# Propriétés

| Nom | Type | Obligatoire | Valeur par défaut | Description |
| --- | ---- | ----------- | ----------------- | ----------- |
| signalement | Signalement | Oui | — | Données complètes du signalement (GET /api/signalements/{id}) |
| role | Role | Oui | — | Rôle de l'utilisateur courant (pilotage des actions affichées) |
| pendingAction | Boolean | Non | false | Indique une transition en cours (verrouille les boutons) |

---

# Événements

| Événement | Déclencheur | Description |
| --------- | ----------- | ----------- |
| actionRequested | Clic sur une action de transition | Transmet { action, signalement } à la page (qui appelle l'API) |
| affectRequested | Clic sur « Affecter » | Ouverture de SCR-009 pré-rempli |
| interventionRequested | Clic sur « Intervention » | Navigation vers la création/suivi d'intervention |

---

# Slots / Contenu

* Galerie de photos (URLs de l'API).
* Badge de statut (mapping statut → libellé/couleur).
* Informations : description, adresse, zone, type(s) de déchet(s), date de création, priorité, dangerosité.
* Actions de transition (uniquement selon rôle/statut).

---

# Règles d'utilisation

* Utiliser exclusivement dans le contexte du détail d'un signalement (SCR-006 et dérivés).
* Les actions affichées respectent la machine à états : `brouillon` (auteur), `en_attente_validation` → valider/rejeter (admin), `valide`/`priorise` → affecter (admin), `affecte` → démarrer intervention (agent), `en_intervention` → terminer, `terminee` → clôturer.
* Ne jamais masquer une erreur backend : un 422 est affiché même si l'action semblait autorisée.
* Le citoyen ne voit aucun bouton de transition après soumission (BR-SIG-001).

---

# Accessibilité

* Badges avec libellé textuel (pas uniquement la couleur).
* Boutons avec libellés explicites et focus clavier.
* Actions annoncées via aria-live lors des transitions.

---

# Responsive

* Mobile : fiche en colonne, galerie en plein écran (légère), actions en bas (pleine largeur).
* Tablet : fiche deux colonnes (informations / actions).
* Desktop : fiche large, actions latérales ou en haut à droite.

---

# Design System

Variables utilisées (à préciser par l'UI Designer avec le Design System Figma) :

* Couleurs : badge par statut, boutons d'action (primary/danger pour rejeter)
* Typographie : titres de sections, corps, badges
* Espacements : sections de la fiche
* Ombres : carte de la fiche
* Rayons : carte, badges

Aucune valeur arbitraire.

---

# Dépendances

* Enfants : Badge (Design System), galerie photos, CMP-001 (carte de localisation en lecture seule), CMP-005 (si points affichés)
* Parents : pages SCR-006 (citizen/agent/admin), SCR-008 (file de validation)
* Services : aucun direct — les actions sont remontées à la page

---

# Figma

Page : 01 Components (fichier Figma "ISI-Eco Report") - Composants lies : Card, Badge, MapView, PhotoUploader, Button - Variants : conformes a la spec - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Angular

* Nom du composant : ReportDetail
* Sélecteur : `app-report-detail`
* Inputs : `signalement`, `role`, `pendingAction`
* Outputs : `actionRequested`, `affectRequested`, `interventionRequested`
* Signals utilisés : `role`, `signalement` (inputs signaux), `visibleActions` (computed selon rôle/statut)
* Services utilisés : aucun (mapping statuts via pipes shared)

---

# Performance

* Aucun re-rendu inutile : les actions visibles sont calculées en `computed()` (OnPush).
* Galerie : chargement paresseux des images (lazy).

---

# Tests

* Rendu : données affichées (description, photos, statut).
* Variantes : actions visibles par (rôle, statut) conformément à la machine à états.
* Événements : `actionRequested` émis avec la bonne action.
* Accessibilité : badges textuels, focus clavier.

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

* La table de transitions (BR-SIG-002, RG15/RG16) est la référence unique pour l'affichage des actions.
* Le citoyen est en lecture seule après soumission (BR-SIG-001).

---

# Décisions

* Le composant ne déclenche jamais l'API : il émet des événements, la page orchestre (architecture ARCH-002).
* Le mapping statut → libellé/couleur est centralisé dans des pipes shared (pas de valeurs disséminées).

---

# Historique

Auteur : Product Architect
Version : 1.0
Date : 2026-08-06

---

# Statut

Validé
