# Screen Specification

# Informations générales

## Identifiant

SCR-004

## Nom de l'écran

Création d'un signalement

## Module

* Citizen

## Objectif

Permettre au citoyen de signaler un dépôt de déchets avec géolocalisation, photos et types de déchets.

## Utilisateurs concernés

* Citizen

---

# Description

Formulaire guidé (stepper) en 3 étapes : 1) localisation (carte + GPS), 2) photos et description, 3) types de déchets et zone. À la soumission, les photos sont hébergées puis leurs URLs envoyées à l'API (l'API n'accepte que des URLs — décision documentée). Le signalement est créé au statut `en_attente_validation` (BR-SIG-001).

---

# Parcours utilisateur

SCR-003 → `/citizen/reports/create` (SCR-004) → succès → SCR-003 (signalement affiché)

Précédent : SCR-003 — Suivant : SCR-003

---

# Navigation

## Entrées

* Bouton « Nouveau signalement » depuis SCR-003.

## Sorties

* SCR-003 (annulation ou succès).

---

# Permissions

* Authentification requise ; rôle `citizen`. La création est ouverte à tous les rôles authentifiés côté API, mais l'écran est proposé dans l'espace Citizen.

---

# Sources de données

| Endpoint | Méthode | Description |
| -------- | ------- | ----------- |
| /api/signalements | POST | Création du signalement |
| /api/types-dechets | GET | Liste des types de déchets (sélecteur) |
| /api/zones | GET | Liste des zones (champ optionnel) |

---

# Données affichées

| Élément | Source | Description |
| ------- | ------ | ----------- |
| Carte de localisation | Geolocation navigateur + position saisie | Point de dépôt |
| Photos sélectionnées | Fichiers locaux (previews) | Avant upload |
| Types de déchets | GET /api/types-dechets | Cases à cocher avec quantité/volume/dangerosité/remarque |
| Zones | GET /api/zones | Liste déroulante optionnelle |
| Description | Saisie | Champ libre optionnel |

---

# Actions utilisateur

| Action | Résultat attendu |
| ------ | ---------------- |
| Prendre une photo | Appareil photo / import, preview |
| Supprimer une photo | Retrait de la sélection |
| Définir la position | Épingler sur la carte / utiliser le GPS |
| Ajouter un type de déchet | Ajout avec détails (quantité, volume, dangerosité, remarque) |
| Soumettre | Upload photos → POST /api/signalements |
| Annuler | Retour SCR-003 (avec confirmation si des données sont saisies) |

---

# États de l'écran

## Loading

Upload des photos en cours (progression par photo) ; soumission avec bouton désactivé.

## Success

Snackbar « Signalement enregistré, il sera traité par les services de collecte » → retour SCR-003.

## Empty

Non applicable (étapes obligatoires : position et au moins une source visuelle encouragée).

## Error

422 → messages champ par champ (lat/lng hors plage, type de déchet inconnu, URL photo invalide) ; échec upload → message par fichier ; réseau → bannière + conservation du brouillon local.

## No Results

Types de déchets vides (référentiel non alimenté) → avertissement « Aucun type de déchet disponible » + possibilité de soumettre sans.

## Offline

Bannière « Hors ligne » ; brouillon local avec avertissement (le backend n'accepte que des URLs : l'upload est impossible hors ligne).

---

# Validations

* Position : latitude −90..90, longitude −180..180 (requises).
* Photos : URLs valides (le champ photo est optionnel côté API mais vivement recommandé).
* Types de déchets : `type_dechet_id` requis pour chaque entrée ; quantité/volume ≥ 0 ; dangerosité dans l'enum.
* Description : libre (optionnelle).

---

# Messages utilisateur

* Succès : « Signalement enregistré ! »
* Erreur 422 : « Certains champs sont invalides, corrigez-les ci-dessous ».
* Erreur upload : « Échec de l'envoi de la photo [nom] ».
* Annulation : « Abandonner la création ? Vos saisies seront perdues ».

---

# Composants UI

* Formulaire de signalement — CMP-002 (`docs/02-design/component-specifications/CMP-002-formulaire-signalement.md`)
* Stepper / Wizard
* Map (sélection de point)
* Input (description)
* Photo Uploader (preview, retrait, prise de vue)
* Checkbox List (types de déchets)
* Select (zone)
* Number Input (quantité, volume)
* Select / Chips (dangerosité)
* Button (Primary, Ghost), Snackbar, Modal (confirmation)

---

# Responsive

* Paradigme : Mobile First (espace Citizen/Agent).
* Mobile : stepper vertical plein écran, bouton « photo » accessible.
* Tablet : deux colonnes (carte + formulaire) à partir de 768 px.
* Desktop : carte à gauche, formulaire à droite.

---

# Accessibilité

* Focus management entre les étapes du stepper.
* Labels associés à tous les champs.
* Photos : texte alternatif.
* Contraste AA.

---

# Performance

* Upload des photos en parallèle (limité), prévisualisation optimisée (compression locale avant upload).
* Lazy loading cartographie.

---

# Cas limites

* Géolocalisation refusée : l'utilisateur peut épingler manuellement ; soumission impossible sans coordonnées (message dédié).
* Beaucoup de photos : limite conseillée (ex. 5), avertissement au-delà.
* Types de déchets volumineux : liste scrollable avec recherche.
* Double soumission : bouton désactivé.

---

# Dépendances

* Écrans : SCR-003.
* Composants : Map, PhotoUploader, Stepper.
* Services : SignalementService (create), TypeDechetService, ZoneService, StorageService (upload photos).

---

# Maquette Figma

Lien : fichier Figma "ISI-Eco Report" - Page : 01 Components - Frames : MapView, Input, Select, PhotoUploader, Button, Modal, Snackbar - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Références Backend

Controller : `app/Http/Controllers/Api/SignalementController.php` — Service : `app/Services/SignalementService.php` — Request : `app/Http/Requests/Signalement/StoreSignalementRequest.php` — Policy : `app/Policies/SignalementPolicy.php`

---

# Critères d'acceptation

* [ ] L'écran correspond à la maquette Figma.
* [ ] Les endpoints utilisés existent.
* [ ] Tous les états sont gérés.
* [ ] Les erreurs sont correctement affichées.
* [ ] Le responsive est conforme.
* [ ] Les composants Shared sont utilisés.
* [ ] Les règles métier sont respectées (BR-SIG-001).

---

# Hypothèses

* Un service de stockage d'images (fournisseur tiers ou backend dédié) est disponible pour produire les URLs envoyées à l'API.
* La limite de photos est une décision produit (l'API n'impose pas de maximum).

---

# Décisions

* Photos en 2 temps : upload → URLs → POST signalement.
* Stepper en 3 étapes pour guider la saisie mobile.
* La position est obligatoire (règle backend), la description facultative.

---

# Historique

Auteur : Product Architect — Version : 1.0 — Date : 2026-08-06

---

# Statut

Validé
