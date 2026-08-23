# Screen Specification

# Informations générales

## Identifiant

SCR-006

## Nom de l'écran

Détails d'un signalement

## Module

* Citizen
* Agent
* Admin

## Objectif

Afficher le détail complet d'un signalement et proposer les actions autorisées selon le rôle et le statut.

## Utilisateurs concernés

* Citizen
* Agent
* Administrator

---

# Description

Écran de consultation d'un signalement : description, localisation (carte), photos, types de déchets (quantité, volume, dangerosité), zone, dates et statut. Les actions affichées sont dérivées de la machine à états (BR-SIG-002) et des permissions :

* Citizen : modifier/supprimer si `brouillon` ; modifier si `en_attente_validation` ; sinon lecture seule.
* Admin : valider, rejeter, prioriser, et accès aux actions d'affectation (via SCR-009).
* Agent : lecture seule.

---

# Parcours utilisateur

SCR-005 (ou SCR-003 par marqueur) → `/citizen/reports/:id` (SCR-006) → retour

Admin : SCR-008 (file de validation) → `/admin/reports/:id` → décision → retour file

Précédent : SCR-003, SCR-005, SCR-008, SCR-010 — Suivant : SCR-003, SCR-005, SCR-008, SCR-009 (admin)

---

# Navigation

## Entrées

* Clic sur un marqueur (SCR-003).
* Clic sur une ligne (SCR-005).
* Clic depuis la file de validation (SCR-008).
* Clic depuis une intervention (SCR-010, Agent/Admin).

## Sorties

* Retour vers l'écran d'origine.
* `/admin/affectations` (SCR-009) — action « Affecter » (admin, statut `valide`/`priorise`).

---

# Permissions

* Authentification requise.
* Citizen : uniquement ses signalements (BR-SIG-008).
* Agent : tous (lecture).
* Admin : tous + actions de validation/priorisation (BR-SIG-002).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/signalements/{id} | GET | Détail avec user, zone, type_dechets, photos |
| /api/signalements/{id} | PUT | Modification (description, statut, priorite, zone_id) |
| /api/signalements/{id} | DELETE | Suppression (admin, ou citizen si `brouillon`) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Statut + priorité | statut, priorite | Badges |
| Description | description | Texte libre |
| Localisation | latitude, longitude | Carte centrée + coordonnées |
| Photos | photos[] | Galerie (url, description) |
| Types de déchets | type_dechets[] avec pivot | Libellés + quantité, volume, dangerosité, remarque |
| Zone | zone | Nom de la zone |
| Auteur | user | Nom complet (visible admin/agent ; le citoyen voit ses propres infos) |
| Dates | created_at, updated_at | Format local |

---

# Actions utilisateur

| Action | Résultat attendu | Rôle / condition |
| ------ | ---------------- | ---------------- |
| Modifier | Formulaire inline ou navigation vers un mode édition (mêmes champs que PUT) | Citizen (`brouillon`/`en_attente_validation`), Admin |
| Supprimer | Confirmation → DELETE → retour liste | Citizen (`brouillon`), Admin |
| Valider | PUT `statut = valide` | Admin (depuis `en_attente_validation`) |
| Rejeter | PUT `statut = rejete` | Admin (depuis `en_attente_validation`) |
| Prioriser | PUT `statut = priorise` | Admin (depuis `valide`) |
| Affecter | Navigation vers SCR-009 (pré-sélection du signalement) | Admin (`valide`/`priorise`) |
| Revenir au statut `brouillon` | Non proposé (transition non autorisée) | — |

---

# États de l'écran

## Loading

Squelette du détail.

## Success

Détail complet avec actions contextuelles.

## Empty

Non applicable (404 → redirection).

## Error

404 → « Signalement introuvable » + retour liste ; 403 → « Accès non autorisé » ; réseau → bannière + réessayer.

## No Results

Non applicable.

## Offline

Bannière « Hors ligne — données potentiellement obsolètes » ; actions d'écriture désactivées.

---

# Validations

* Formulaire de modification : statut et priorité restreints aux valeurs de l'API (enums) ; zone_id doit exister.
* Les transitions non autorisées sont masquées en UI (BR-SIG-002) ; le backend reste la source de vérité (422 possible).

---

# Messages utilisateur

* Succès modification : « Signalement mis à jour ».
* Succès suppression : « Signalement supprimé ».
* Confirmation suppression : « Supprimer définitivement ce signalement ? »
* 422 transition : message renvoyé par l'API.
* 403 : « Vous n'êtes pas autorisé à effectuer cette action ».

---

# Composants UI

* Page Header (retour + titre + badges)
* Report Details (blocs : infos, carte, photos, déchets, historique de statut) — CMP-003 (`docs/02-design/component-specifications/CMP-003-fiche-signalement.md`)
* Gallery (photos)
* Map (point unique)
* Data List (types de déchets)
* Button (contextuels : valider, rejeter, prioriser, affecter, modifier, supprimer)
* Modal (confirmation), Snackbar, Banner

---

# Responsive

* Paradigme : Mobile First (espace Citizen/Agent).
* Mobile : carte pleine largeur puis blocs empilés ; actions en barre inférieure fixe.
* Tablet : deux colonnes (carte + détails).
* Desktop : trois colonnes (détails, carte, actions).

---

# Accessibilité

* Carte : alternative textuelle avec les coordonnées.
* Galerie : navigation clavier, descriptions alternatives.
* Badges textuels, contraste AA.

---

# Performance

* Détail chargé à la demande (un appel) ; images en lazy loading.

---

# Cas limites

* Signalement sans zone, sans photo, sans description : blocs masqués proprement.
* Transition refusée malgré l'UI (état concurrent) : affichage du message 422.
* Suppression alors qu'un autre utilisateur l'a déjà modifié : 422/404 gérés.

---

# Dépendances

* Écrans : SCR-003, SCR-005, SCR-008, SCR-009, SCR-010.
* Composants : ReportDetails, Gallery, Badge, Map, Button, Modal.
* Services : SignalementService (get, update, delete).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Card, Badge, MapView, PhotoUploader, Button, Modal, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/SignalementController.php` — Service : `app/Services/SignalementService.php` — Request : `app/Http/Requests/Signalement/UpdateSignalementRequest.php` — Policy : `app/Policies/SignalementPolicy.php` — Exception : `app/Exceptions/Business/InvalidTransitionException.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-SIG-002, BR-SIG-006, BR-SIG-007, BR-SIG-008).

---

# Hypothèses

* Les actions affichées sont calculées à partir du statut et du rôle (table de transitions).
* La géolocalisation n'est pas modifiable (API) : pas d'action de déplacement.

---

# Décisions

* Écran unique multi-rôles ; la variante admin intègre les actions de validation/priorisation.
* L'affectation est lancée depuis ce détail (pré-sélection dans SCR-009).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
