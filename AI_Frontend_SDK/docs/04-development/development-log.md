# Développement — Workflow 04

Statut : Terminé

---

## Synthèse

Implémentation complète des espaces **Citizen** (5 pages) et **Admin** (8 pages) de l'application Angular `isieco-report-frontend`, conformément aux Screen Specifications (SCR-003 à SCR-009, SCR-010, SCR-011, SCR-012, SCR-013, SCR-015) et au contrat d'intégration `docs/01-analysis/endpoints.md`.

Toutes les pages suivent les conventions de la base existante (features agent) : composants standalone, state `signal`/`computed`, injection par `inject()`, `ChangeDetectionStrategy.OnPush`, passage systématique par `ApiService` (qui lève `ApiError`), délégation à `SnackbarService` pour les retours utilisateur, texte français, aucun commentaire et aucun `any`, composants UI importés par composant.

## Qualité

- `ng build` : **vert** (les 8 erreurs TypeScript initiales ont été corrigées au fil de l'eau ; seuls subsistent les warnings « leaflet n'est pas ESM », préexistants et non bloquants).
- `ng test` : **2/2 verts**. Le test « should render title » (boilerplate Angular) était devenu obsolète et a été remplacé par un test de rendu de l'app-shell (`router-outlet`).
- Lint : **non configuré** dans le projet (aucune cible `lint` ; l'ajout d'angular-eslint ne fait pas partie du périmètre).

## Feature Citizen

### Map / Carte (SCR-003)
Carte Leaflet réutilisant `MapViewComponent`, marqueurs colorés par statut de signalement, clic sur un marqueur vers le détail (`/citizen/reports/:id`), FAB vers la création, bouton « Recentrer » (géolocalisation + méthode `recenter()`), états loading/erreur/vide + légende.

### Liste des signalements (SCR-005)
Pagination cumulative (15/page, « Charger plus » via `meta.last_page`), chips de filtre par statut (filtrage client), cartes cliquables (statut, priorité, date, coordonnées), états vide/filtrage sans résultat.

### Création d'un signalement (SCR-004)
Écran en 3 étapes : position (carte/GPS, pré-remplie par `lat`/`lng` en queryParams) puis photos + description puis types de déchets (quantité, volume, dangerosité, remarque) + zone. Soumission `CreateSignalementPayload` puis retour vers `/citizen/map`. Modale de confirmation si l'utilisateur abandonne après avoir saisi des données.

### Détail d'un signalement (variante citizen, SCR-006)
Badges statut/priorité, description, zone, auteur, galerie photos, types de déchets (pivot complet), carte localisée. Actions selon le statut : modifier (description + zone) si `brouillon`/`en_attente_validation`, supprimer si `brouillon` (confirmation).

### Points citoyen (SCR-015)
Onglets Total / Historique, historique filtré au client sur `user.id === session.user().id`, pagination `/api/historique-points`. Aucun classement global ni total cumulé, conformément à la spec.

### Décisions / écarts (citizen)

- Ajout du **statut `rejete`** dans `SignalementStatut` (`enums.ts`) et `STATUT_LABELS.Rejete = 'Rejeté'` : le contrat API le référençait sans que l'enum ne l'expose (incohérence de `docs/01-analysis`). Vérifié au build — aucun usage cassé.
- La carte citizen ne repose pas sur `mapclick` (navigation directe via les marqueurs).
- Le détail citizen n'expose pas la priorisation (réservée à l'admin).

## Feature Admin

### Dashboard (SCR-007)

Heatmap `GET /api/dashboard/heatmap` (points agrégés par zone, intensité selon `weight`), KPI « zones critiques », six tuiles d'accès rapide, états loading/vide (« Aucune zone critique »)/erreur + bloc légende.

### File de validation (SCR-008)

Onglets En attente / Validés / Priorisés (filtre client), cartes de signalements avec actions contextuelles selon les transitions BR-SIG-002 : Valider (`en_attente_validation → valide`), Rejeter (modale de confirmation, `→ rejete`), Prioriser (`valide → priorise`). Après chaque action la liste est rafraîchie, avec repli sur rechargement en cas de 422.

### Affectations (SCR-009)

Liste paginée (60 %) + formulaire latéral (40 %) : date/heure (`Y-m-d H:i:s`), équipe (requise), signalement (filtré au client `valide`/`priorise`), observation. Annulation avec modale explicitant la limitation backend (« Le statut du signalement ne sera pas modifié »). Bloquée si aucune équipe (lien vers `/admin/equipes`).

### Interventions (SCR-010)

Liste admin avec onglets Toutes / En cours / Terminées, statut et équipe affichés, clic → détail. La page de détail **réutilise `InterventionDetailPageComponent` de la feature agent** (les deux rôles y sont autorisés) ; son bouton « Retour » redirige vers `/agent/interventions` — compromis assumé et documenté.

### Équipes (SCR-011)

Liste 50 % + formulaire 50 % : nom (requis), description, multi-sélection d'agents (liste des utilisateurs restreinte au rôle agent). Avertissement sur le remplacement de la composition lors de la mise à jour (BR-EQP-002). Création / mise à jour / suppression (confirmation).

### Référentiels (SCR-012)

Onglets Zones / Types de déchets. Table de données générique (`app-table` + template de cellule) pour chacun, CRUD dans un formulaire modal (nom/libellé requis, description optionnelle), suppression avec confirmation (« Les signalements associés conserveront leurs données »). Pagination par liste.

### Utilisateurs (SCR-013)

Recherche par nom (search-bar + bouton), filtres de rôle et email, tableau (nom, email, rôle, dates), formulaire modal (nom, **prénom**, email, mot de passe + confirmation, rôle). Rôles statiques (pas d'endpoint `/api/roles` — liste Spatie `admin`/`agent`/`citizen`) affichés en français. Auto-suppression de son compte bloquée, avertissement sur le changement de rôle d'un compte administrateur (verrouillage possible), confirmation de suppression. Filtres envoyés en query params (endpoint acceptant paramètres). Post-revue, le contrat réconcilié : `prenom` et `password_confirmation` envoyés/validés côté front (ADR-006).

### Détail du signalement (variante admin, SCR-006)

Lecture complète + actions selon le statut : Valider / Rejeter (confirmation) depuis `en_attente_validation`, Prioriser et Affecter depuis `valide`, Affecter depuis `priorise`. Auteur affiché. Retour vers `/admin/validation`.

### Décisions / écarts (admin)

- La liste des signalements « éligibles à l'affectation » est chargée par `/api/signalements` puis filtrée au client (pas de filtre API dédié, conforme à l'hypothèse SCR-009).
- La liste `/api/users` est appelée avec les paramètres facultatifs documentés (`nom`, `role`) ; seule la route prédéfinie est utilisée.
- Aucun KPI global supplémentaire au dashboard (pas d'endpoint de statistiques) — conforme à l'hypothèse SCR-007.

## Changements partagés

- `shared/components/map/map-view.component.ts` : ajout de `payload` dans `MapMarker`, sortie `markerClick`, méthode `recenter(latitude, longitude)`, correction de l'option `title` invalide sur `L.circleMarker` (remplacée par `bindPopup`).
- `core/models/enums.ts` + `shared/utils/enum-mappings.ts` : ajout de `SignalementStatut.Rejete` et de son libellé.
- `src/app/app.spec.ts` : test obsolète remplacé.

## Fichiers

- `src/app/features/{citizen,admin}/` : services, pages, routes.
- Routage : `features/citizen/routes.ts` et `features/admin/routes.ts` branchés dans `app.routes.ts` (lazy-loading avec guards existants).

---

## Historique

Auteur : Développeur — Version : Dev-1.0 — Date : 2026-08-06

Auteur : QA Reviewer — Version : Dev-1.1 — Date : 2026-08-10 — réconciliation contrat utilisateur (prenom + confirmation), filtres nom/email/rôle implémentés, agents d'équipe chargés sur toute la pagination.

---

## Statut

Terminé et validé — voir Workflow 05 (Review) : REV-001 clôturée, 72/72 tests backend, 15/15 tests front.