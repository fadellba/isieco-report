# Screen Specification

# Informations générales

## Identifiant

SCR-009

## Nom de l'écran

Affectation des signalements

## Module

* Admin

## Objectif

Affecter les signalements validés ou priorisés à des équipes de collecte.

## Utilisateurs concernés

* Administrator

---

# Description

Écran de gestion des affectations : liste des affectations existantes et formulaire de création. La création exige un signalement au statut `valide` ou `priorise` (BR-SIG-004) et une équipe existante ; le signalement passe ensuite à `affecte` (BR-AFF-001). L'annulation est possible mais le statut du signalement reste `affecte` (limitation backend — voir `docs/01-analysis/api-analysis.md`, ambiguïté n° 2).

---

# Parcours utilisateur

SCR-007 → `/admin/affectations` (SCR-009) → création → retour liste / ouverture SCR-006

Entrée alternative : détail signalement (SCR-006) → « Affecter » → SCR-009 pré-rempli

Précédent : SCR-007, SCR-006 — Suivant : SCR-006, SCR-007

---

# Navigation

## Entrées

* Tuile « Affectations » depuis SCR-007.
* Action « Affecter » depuis SCR-006 (signalement pré-sélectionné).

## Sorties

* `/admin/reports/:id` (SCR-006) — voir le signalement affecté.
* `/admin/dashboard` (SCR-007) — retour.

---

# Permissions

* Authentification requise ; rôle `admin` (création/suppression — BR-AFF-001/002). Lecture : admin + agent (policy viewAny).

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/affectations | GET | Liste paginée des affectations |
| /api/affectations | POST | Création (date, equipe_id, signalement_id, observation) |
| /api/affectations/{id} | DELETE | Annulation |
| /api/equipes | GET | Sélecteur d'équipes |
| /api/signalements | GET | Sélecteur de signalements (statuts `valide`/`priorise` filtrés en UI) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Cartes d'affectations | data[] | Équipe, signalement, date, observation |
| Formulaire | POST body | Date/heure, équipe, signalement, observation |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Créer une affectation | POST → succès → statut du signalement `affecte` (BR-AFF-001) |
| Annuler une affectation | Confirmation → DELETE → 204 |
| Ouvrir le signalement | Navigation SCR-006 |
| Filtrer les signalements éligibles | Filtre client : `valide`/`priorise` uniquement |

---

# États de l'écran

## Loading

Squelettes liste + formulaire.

## Success

Affectation créée (message + rafraîchissement).

## Empty

« Aucune affectation » ; formulaire toujours disponible.

## Error

Bannière « Impossible de charger les affectations » ; 422 → messages champ par champ.

## No Results

Aucune équipe disponible → avertissement « Créez d'abord une équipe » (lien SCR-011).

## Offline

Bannière hors ligne ; écriture désactivée.

---

# Validations

* Date/heure : format `Y-m-d H:i:s` (sélecteur datetime).
* Équipe : requise (existe).
* Signalement : requis (existe), statut `valide`/`priorise` (masqué sinon).
* Observation : optionnelle.

---

# Messages utilisateur

* Succès : « Signalement affecté à l'équipe ».
* Confirmation annulation : « Annuler cette affectation ? Le statut du signalement ne sera pas modifié » (mention explicite de la limitation backend).
* 422 : « Le signalement doit être validé ou priorisé avant affectation ».

---

# Composants UI

* Page Header
* Data List (affectations)
* Form (datetime picker, select équipe, select signalement, textarea observation)
* Modal (confirmation annulation)
* Snackbar, Banner
* Empty State

---

# Responsive

* Paradigme : Desktop First (espace Admin) — utilisable mobile.
* Mobile : liste puis formulaire en bas (section repliable).
* Tablet : deux colonnes.
* Desktop : liste (60 %) + formulaire latéral (40 %).

---

# Accessibilité

* Sélecteurs avec labels, navigation clavier, focus trap modal, contraste AA.

---

# Performance

* Pagination (15/page) ; sélecteurs chargés à la demande.

---

# Cas limites

* Signalement déjà affecté : exclu du sélecteur (statut ≠ `valide`/`priorise`).
* Annulation puis ré-affectation : impossible tant que le statut reste `affecte` (limitation documentée) — message informatif.
* Aucune équipe : blocage de la création avec lien vers SCR-011.

---

# Dépendances

* Écrans : SCR-006, SCR-007, SCR-011.
* Composants : Select, DateTimePicker, DataList, Modal.
* Services : AffectationService, EquipeService, SignalementService.

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Select, Table, Card, Button, Modal, Snackbar, Banner - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/AffectationController.php` — Service : `app/Services/AffectationService.php` — Request : `app/Http/Requests/Affectation/StoreAffectationRequest.php` — Policy : `app/Policies/AffectationPolicy.php` — Exception : `app/Exceptions/Business/SignalementNotValidatedException.php` — Tests : `tests/Feature/AffectationApiTest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-SIG-004, BR-AFF-001, BR-AFF-002).

---

# Hypothèses

* La liste des signalements éligibles est filtrée côté client (aucun filtre API).
* La limitation « pas de retour arrière de statut après annulation » reste en l'état (décision backend à trancher).

---

# Décisions

* Message d'avertissement explicite lors de l'annulation (transparence sur la limitation).
* Formulaire latéral sur desktop (gain de temps).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
