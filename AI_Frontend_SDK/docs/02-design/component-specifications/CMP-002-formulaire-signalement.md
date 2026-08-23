# Component Specification

# Informations générales

## Identifiant

CMP-002

---

## Nom

Formulaire de signalement

---

## Catégorie

* Form

---

## Description

Formulaire structuré de création d'un signalement : localisation (carte + GPS), description, types de déchets (cases avec quantité/volume/dangerosité/remarque), zone optionnelle, photos (upload puis URLs). Il gère la saisie, les validations locales et la soumission vers l'API, sans contenir de logique métier.

---

# Objectif

Offrir un formulaire unique et complet pour la création de signalement (SCR-004), garantissant que les données envoyées respectent le contrat de `POST /api/signalements`.

---

# Responsabilité

Collecter, valider localement et soumettre les données d'un signalement ; afficher les erreurs champ par champ (y compris les 422 backend) ; gérer l'état de soumission.

---

# Utilisation

* Citizen : SCR-004 (création de signalement)

---

# Variantes

* Mode création (SCR-004) : formulaire complet.
* (Évolution possible — non documentée dans cette phase : mode brouillon si l'API l'expose.)

---

# États

* Default
* Focus
* Disabled (champs verrouillés pendant soumission ou selon rôle)
* Loading (soumission en cours)
* Error (erreurs champ par champ + bannière globale)
* Success (signalement envoyé — transition vers l'écran de confirmation)

États exclus (justification) : `Empty` et `No Results` — sans objet pour un formulaire (aucune liste de données). `Offline` — la détection hors ligne est gérée globalement ; une soumission sans réseau aboutit à l'état `Error`.

---

# Propriétés

| Nom | Type | Obligatoire | Valeur par défaut | Description |
| --- | ---- | ----------- | ----------------- | ----------- |
| submitLabel | String | Non | « Signaler » | Libellé du bouton de soumission |
| typesDechets | TypeDechet[] | Oui | — | Liste des types de déchets (GET /api/types-dechets) |
| zones | Zone[] | Oui | — | Liste des zones optionnelles (GET /api/zones) |
| initialPosition | LatLng \| null | Non | null | Position GPS pré-remplie |

---

# Événements

| Événement | Déclencheur | Description |
| --------- | ----------- | ----------- |
| submitted | Soumission réussie (201) | Transmet le signalement créé à la page (navigation vers SCR-005/SCR-006) |
| canceled | Annulation | Retour à l'écran précédent |

---

# Slots / Contenu

* Photos : composant PhotoUploader (upload → URLs, SCR-004) intégré en section.
* Localisation : carte (CMP-001) en mode sélection + bouton « Ma position ».
* Aucun slot ouvert — contenu structuré fixe.

---

# Règles d'utilisation

* Utiliser exclusivement pour la création de signalement (SCR-004).
* Les champs envoyés suivent strictement le contrat de l'API : `description`, `latitude`, `longitude`, `adresse`, `zone_id` (optionnel), `type_dechets` (avec `quantite_estime`, `volume_estime`, `dangerosite`, `remarque`), `photos` (URLs uniquement — ADR-005).
* Ne pas bloquer la soumission sur des règles non connues du backend ; les 422 sont affichés tels quels.
* Le champ « dangerosité » utilise l'enum backend traduit en libellés UI.

---

# Accessibilité

* Labels explicites sur tous les champs.
* Erreurs reliées aux champs (`aria-describedby`).
* Navigation clavier complète ; boutons de taille suffisante (mobile).
* Statut de soumission annoncé (aria-live).

---

# Responsive

* Mobile : champs pleine largeur empilés, carte en tête, bouton de soumission en bas.
* Tablet : deux colonnes (données / localisation).
* Desktop : layout large centré, deux colonnes équilibrées.

---

# Design System

Variables utilisées (à préciser par l'UI Designer avec le Design System Figma) :

* Couleurs : champs (états default/focus/error), bouton primaire
* Typographie : labels, placeholders, aides
* Espacements : gaps du formulaire, paddings
* Ombres : champs focus
* Rayons : champs et boutons

Aucune valeur arbitraire.

---

# Dépendances

* Enfants : CMP-001 (carte), PhotoUploader (shared), composants Form du Design System (Input, Select, Checkbox, Button, Textarea)
* Parents : page SCR-004
* Services : SignalementService (POST), TypeDechetService, ZoneService, StorageProvider (photos)

---

# Figma

Page : 01 Components (fichier Figma "ISI-Eco Report") - Composants lies : Input, Select, PhotoUploader, MapView, Button - Variants : conformes a la spec - Version : DS v1.0 (2026-08-06). Conversion des frames en component sets a faire dans Figma (1 clic) - voir PROJECT_RULES/figma-guidelines.md.

---

# Angular

* Nom du composant : ReportForm
* Sélecteur : `app-report-form`
* Inputs : `submitLabel`, `typesDechets`, `zones`, `initialPosition`
* Outputs : `submitted`, `canceled`
* Signals utilisés : `form` (FormGroup réactif), `isSubmitting`, `serverErrors`
* Services utilisés : SignalementService, TypeDechetService, ZoneService, StorageProvider

---

# Performance

* Chargement des référentiels (types dechets, zones) en parallèle au montage.
* Validation locale légère (validators Angular) ; aucun calcul métier.

---

# Tests

* Rendu : tous les champs présents.
* Validation : champs requis et formats.
* Événements : `submitted` émis avec le payload conforme ; `canceled` à l'annulation.
* Erreurs : 422 affichées champ par champ.
* Accessibilité : labels et liens d'erreur.

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

* Le contrat de `POST /api/signalements` et les enums (`dangerosite`) sont stables (docs/01-analysis/endpoints.md, docs/01-analysis/api-analysis.md).
* Le stockage des photos est disponible via StorageProvider (ADR-005).

---

# Décisions

* Le formulaire est un composant autonome (pas de logique dans la page SCR-004).
* Les URLs des photos sont produites avant la soumission (flux upload → URLs → POST).

---

# Historique

Auteur : Product Architect
Version : 1.0
Date : 2026-08-06

---

# Statut

Validé
