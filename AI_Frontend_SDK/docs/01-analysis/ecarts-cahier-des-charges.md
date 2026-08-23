# Écarts cahier des charges ↔ backend ↔ SDK — ISI-Eco-Report

Statut : Vérifié

Auteur : Product Architect

Date : 2026-08-06

Version : 1.0

---

# Conventions de lecture

* Ce document recense les exigences du cahier des charges (`isieco.pdf`) non satisfaites ou partiellement satisfaites par l'implémentation (backend Laravel) et la spécification (SDK frontend).
* La couverture détaillée est dans `OUTPUT/cahier-des-charges-backend-sdk-conformity-report.md`.
* Chaque écart est traçable vers une section du cahier des charges et, le cas échéant, vers une ambiguïté d'`api-analysis.md`.

---

# Écarts constatés

| # | Exigence du cahier des charges | Section CA | Couverture | État | Référence |
| - | ------------------------------ | ---------- | ---------- | ---- | --------- |
| E-01 | Notifications de suivi de statut (« Signalé » → « En cours de collecte » → « Collecté ») | 2.2 | Aucun mécanisme de notification : pas de table, d'endpoint ni de file ; seul le statut est consultable via l'API | **Manquant (backend)** | `api-analysis.md` § 7 ; CMP-005 |
| E-02 | Classement des Éco-Citoyens | 2.2 | Aucun endpoint de classement/leaderboard ; l'historique de points est la seule source | **Manquant (backend)** | `api-analysis.md` § 8 n° 10 |
| E-03 | Signalement avec photo (prise en temps réel ou upload) | 2.1 | L'API n'accepte que des URLs (`photos[]`) — pas d'upload ni de stockage d'images (Cloudinary/S3) ; contraint au frontend de fournir un service de stockage | **Manquant (backend)** | ADR-005 ; `api-analysis.md` § 9 n° 6 |
| E-04 | Carte des zones à collecter (marqueurs pour chaque signalement actif) | 2.1 | Couverte par l'écran carte citoyen (SCR-004/005/006) ; vigilance : périmètre des statuts affichés sur la carte à confirmer | Partielle | `map-citizen.md` |
| E-05 | Catégorisation intelligente — 3 types (Plastique, Gravats, Organique) | 2.2 | 6 types de déchets seedés (factory) ; vérifier que les 3 types du CA sont bien présents parmi eux | Partielle | BR-REF-001 ; `DatabaseSeeder` |
| E-06 | Base de données PostgreSQL + extension PostGIS | Contraintes | PostgreSQL (`pgsql`, base `isieco_report`) ; extension PostGIS non confirmée dans les migrations | Partielle | `.env` |
| E-07 | Géolocalisation automatique au moment du signalement | 2.1 | Conforme — coordonnées requises à la création ; Geolocation API du navigateur côté frontend | Conforme | BR-SIG-001 ; `map-citizen.md` (S1) |
| E-08 | Authentification citoyenne (création de compte) | 2.1 | Conforme — `POST /api/auth/register` | Conforme | BR-AUTH-001 |
| E-09 | Tableau de bord admin : heatmap des zones critiques + assignation d'équipes | 2.2 | Conforme — `dashboard/heatmap` (agrégat SQL) + affectations | Conforme | BR-DASH-001 ; BR-AFF-001 |
| E-10 | Gamification — points attribués aux citoyens actifs | 2.2 | Conforme — attribution à la clôture, historique tracé | Conforme | BR-INT-003 ; BR-PTS-001 |

---

# Suivi

| Écart | Décision / Statut |
| ----- | ----------------- |
| E-01 | À arbitrer : développement d'un mécanisme de notifications backend (hors MVP) ou abandon documenté de l'exigence. |
| E-02 | À arbitrer : endpoint `GET /api/classement` (recommandé) ou calcul côté client sur l'historique. |
| E-03 | À arbitrer : service de stockage tiers (Cloudinary/S3) à intégrer, ou acceptation des URLs externes uniquement. |
| E-04 | Décision de Design : filtre des statuts affichés sur la carte à trancher (visible vs actif). |
| E-05 | Vérifier le seeder : les 3 types du CA doivent figurer parmi les 6. |
| E-06 | Vérifier l'installation de l'extension PostGIS ou assumer PostgreSQL simple. |

---

# Références

* Cahier des charges : `isieco.pdf` (2 pages)
* Rapport tripartite : `OUTPUT/cahier-des-charges-backend-sdk-conformity-report.md`
* Règles métier : `docs/01-analysis/business-rules.md`
* Analyse API : `docs/01-analysis/api-analysis.md`
