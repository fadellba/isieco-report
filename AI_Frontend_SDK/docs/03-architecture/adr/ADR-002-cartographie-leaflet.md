# Architecture Decision Record

## Identifiant

ADR-002

---

## Titre

Leaflet pour la cartographie (cartes et heatmap)

---

## Statut

* Accepté

---

## Date

Date de la décision : 2026-08-06

---

## Auteur

Nom : Frontend Architect
Rôle : Architecture (Workflow 03)

---

# Résumé

La cartographie (SCR-003, SCR-006, SCR-007) est implémentée avec Leaflet (open source, sans clé API) ; la heatmap admin utilise le plugin `leaflet.heat` sur l'agrégat `GET /api/dashboard/heatmap`.

---

# Contexte

Le cahier des charges et les specs imposent une carte pour le citoyen (mes signalements), une carte dans les détails (SCR-006) et une heatmap des zones critiques pour l'admin (SCR-007, BR-DASH-001). Les données proviennent des coordonnées de `signalements` et de l'agrégat backend `dashboard/heatmap` (zones pondérées).

---

# Problème

Quelle solution cartographique adopter pour rester léger, gratuit et compatible avec les données de l'API (lat/lng + pondération par zone) ?

---

# Objectifs

* afficher des marqueurs (signalements) et une heatmap (zones) ;
* éviter une clé API payante et un poids de bundle important ;
* fonctionner hors ligne d'infrastructure tierce (tuiles configurables).

---

# Options étudiées

## Google Maps JavaScript API

### Description

SDK cartographique de Google avec heatmap intégrée.

### Avantages

* fonctionnalités riches ; heatmap native ; couverture mondiale.

### Inconvénients

* clé API obligatoire ; quota et coût au-delà du gratuit ; poids élevé ; consentement RGPD.

### Pourquoi cette option n'a pas été retenue

Besoin simple (marqueurs + heatmap) ; coût et dépendance à un compte Google non justifiés.

---

## Leaflet + plugin leaflet.heat

### Description

Bibliothèque open source légère (~40 Ko) avec plugin heatmap.

### Avantages

* gratuit, sans clé API ; léger ; plugin heatmap éprouvé ; tuiles interchangeables (OSM, etc.).

### Inconvénients

* rendu moins riche que Google (pas de satellite premium, 3D) ; plugin tiers.

### Pourquoi cette option a été retenue

Couvre exactement les besoins, respecte le budget zéro et le poids du bundle ; recommandé dans les specs écrans (SCR-003, SCR-007).

---

# Décision retenue

Utiliser Leaflet pour toutes les cartes de l'application : composant `MapView` dans `shared/components/map/` (marqueurs, popups, couches), et un composant `HeatmapView` (plugin `leaflet.heat`) pour SCR-007. Les tuiles sont configurables via l'environnement (défaut OpenStreetMap).

---

# Justification

C'est la solution la plus simple et la moins coûteuse répondant aux besoins ; la heatmap backend fournit directement `latitude`, `longitude`, `weight` pour le plugin.

---

# Conséquences

## Positives

* aucun coût ni clé API ; bundle léger ; lazy loading facile (module Leaflet chargé à la demande).

---

## Négatives

* dépendance à un plugin communautaire (mise à jour à surveiller) ;
* les tuiles OSM doivent respecter la politique d'usage (démarrage prod : tuiles dédiées ou autre provider).

---

## Risques

* Disponibilité des tuiles OSM — atténué par la configurabilité via environnement.

---

# Impacts

## Backend

Aucun (les endpoints `signalements` et `dashboard/heatmap` suffisent).

---

## Frontend

`shared/components/map/` (MapView, HeatmapView), dépendances `leaflet`, `@types/leaflet`, `leaflet.heat`, lazy loading des routes cartographiques.

---

## UX

Rendu des marqueurs et de la heatmap conforme aux specs (SCR-003, SCR-007).

---

## Documentation

* `docs/03-architecture/frontend-architecture.md` (ARCH-002)

---

# Traçabilité

## Business Rules

* BR-DASH-001

---

## Endpoints

* API-034 (GET /api/signalements), API-040 (GET /api/dashboard/heatmap)

---

## Screens

* SCR-003, SCR-006, SCR-007

---

## Components

* CMP-001

---

## Features

* FEAT-001, FEAT-006

---

## Proposals

Sans objet.

---

## Reviews

Sans objet.

---

# Plan de migration

Sans objet (projet neuf).

---

# Critères de validation

* La carte citoyen (SCR-003) affiche les marqueurs de l'API filtrés pour l'utilisateur.
* La heatmap admin (SCR-007) s'affiche avec les pondérations de l'API.
* Le bundle cartographique n'est chargé que sur les écrans concernés.

---

# Références

Documentation : `docs/02-design/screen-specifications/map-citizen.md`, `docs/02-design/screen-specifications/dashboard.md`, `docs/03-architecture/frontend-architecture.md`.

Maquette Figma : à compléter par l'UI Designer.

Issues : sans objet.

Liens utiles : leafletjs.com.

---

# Historique

Version : 1.0
Auteur : Frontend Architect
Date : 2026-08-06
Commentaires : Création initiale.
