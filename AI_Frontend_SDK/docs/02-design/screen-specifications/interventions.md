# Screen Specification

# Informations générales

## Identifiant

SCR-010

## Nom de l'écran

Interventions

## Module

* Agent
* Admin

## Objectif

Permettre aux agents de suivre, créer, terminer et clôturer les interventions de collecte.

## Utilisateurs concernés

* Agent
* Administrator

---

# Description

Écran de travail des agents : liste des interventions (vue par défaut Agent), détail avec compte rendu et photos, création d'intervention sur une affectation, terminaison (statut `terminee`) et clôture (qui clôt le signalement et attribue 100 points — BR-INT-003). L'admin dispose de la même vue en lecture/écriture.

---

# Parcours utilisateur

Connexion (SCR-001) → `/agent/interventions` (SCR-010) → détail → terminer → clôturer → retour

Précédent : SCR-001, SCR-007 (admin) — Suivant : SCR-010 (détail), SCR-006 (signalement lié)

---

# Navigation

## Entrées

* Redirection post-connexion (agent).
* Tuile « Interventions » depuis SCR-007 (admin).

## Sorties

* `/agent/reports/:id` (SCR-006) — signalement lié à l'intervention.
* `/admin/dashboard` (SCR-007) — retour admin.

---

# Permissions

* Authentification requise ; Agent et Admin (BR-INT-001 à 003, policy Intervention). Lecture/écriture/clôture ouvertes aux deux rôles.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/interventions | GET | Liste paginée |
| /api/interventions/{id} | GET | Détail (affectation, photos) |
| /api/interventions | POST | Création (date_heure_debut, affectation_id, observation) |
| /api/interventions/{id} | PUT | Mise à jour (date_heure_fin, statut, compte_rendu, observation, photos) |
| /api/interventions/{id}/cloturer | POST | Clôture (+100 points au citoyen) |
| /api/affectations | GET | Sélecteur d'affectations (création) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Cartes d'interventions | data[] | Statut, dates, affectation, signalement lié |
| Détail | show | Compte rendu, observation, photos, affectation, signalement |
| Formulaire de création | POST body | Date/heure début, affectation, observation |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Créer une intervention | POST → signalement passe `en_intervention` (BR-INT-001) |
| Ajouter compte rendu / photos | PUT (photos : URLs) |
| Terminer | PUT `statut = terminee` → signalement `termine` (BR-INT-002) |
| Clôturer | POST cloturer → signalement `cloture` + 100 points (BR-INT-003) |
| Voir le signalement | Navigation SCR-006 |
| Suspendre | PUT `statut = suspendue` (aucun impact sur le signalement) |

---

# États de l'écran

## Loading

Squelettes.

## Success

Liste/détail chargés ; actions disponibles selon statut.

## Empty

« Aucune intervention » (Agent : + « Créer une intervention »).

## Error

Bannière + « Réessayer » ; 422 → messages champ par champ.

## No Results

Non applicable (pas de filtre obligatoire).

## Offline

Bannière hors ligne ; écriture désactivée.

---

# Validations

* Date/heure début : format `Y-m-d H:i:s`, requise.
* Affectation : requise (existe) ; l'API exige un signalement `affecte` (BR-INT-001) — le sélecteur exclut les affectations dont le signalement n'est pas `affecte` (filtre client).
* Compte rendu / observation : libres.
* Photos : URLs valides (upload préalable, comme SCR-004).
* Clôture : uniquement après `terminee` (masquée sinon).

---

# Messages utilisateur

* Succès création : « Intervention démarrée ».
* Succès terminaison : « Intervention terminée ».
* Succès clôture : « Signalement clôturé, 100 points attribués au citoyen ».
* 422 : « Le signalement doit être affecté avant de démarrer une intervention » / « Le signalement doit être terminé avant clôture ».

---

# Composants UI

* Page Header
* Tabs (En cours / Terminées)
* Intervention Card
* Form (datetime, select affectation, textarea, photo uploader)
* Button (contextuels : démarrer, terminer, clôturer)
* Modal (confirmation), Snackbar, Banner

---

# Responsive

* Paradigme : Mobile First (espace Agent).
* Mobile : liste + écran de détail dédié, boutons pleine largeur.
* Tablet : deux colonnes (liste + détail).
* Desktop : liste (40 %) + détail (60 %).

---

# Accessibilité

* Actions clavier, badges textuels de statut, focus trap modal, contraste AA.

---

# Performance

* Pagination (15/page) ; détail chargé à la demande.

---

# Cas limites

* Affectation dont le signalement n'est plus `affecte` : exclue du sélecteur.
* Clôture tentée avant terminaison : bouton masqué + 422 possible.
* Double clôture : bouton masqué après succès (statut `cloture` terminal).
* Photos multiples : limite conseillée + progression d'upload.

---

# Dépendances

* Écrans : SCR-006, SCR-007.
* Composants : InterventionCard, Tabs, Form, PhotoUploader, Modal.
* Services : InterventionService, AffectationService, StorageService.

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : Tabs, Card, Button, Modal, PhotoUploader, Snackbar, Banner, Skeleton - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/InterventionController.php` — Service : `app/Services/InterventionService.php` — Requests : `app/Http/Requests/Intervention/StoreInterventionRequest.php`, `UpdateInterventionRequest.php` — Policy : `app/Policies/InterventionPolicy.php` — Tests : `tests/Feature/InterventionApiTest.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-INT-001, BR-INT-002, BR-INT-003).

---

# Hypothèses

* L'agent accède aux affectations en lecture pour sélectionner une affectation valide.
* L'upload des photos suit le même principe que SCR-004 (URLs).

---

# Décisions

* La clôture est une action distincte du bouton « Terminer » (modèle backend : `terminee` puis `cloturer`).

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
