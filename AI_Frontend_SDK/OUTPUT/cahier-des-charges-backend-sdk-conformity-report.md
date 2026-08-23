# Rapport de conformité tripartite — Cahier des charges ↔ Backend ↔ AI Frontend SDK

| Champ | Valeur |
|---|---|
| Identifiant | CONFORM-001 |
| Type | Analyse transversale de conformité et de synchronisation |
| Périmètre | `isieco.pdf` (cahier des charges), backend Laravel `isieco-report`, `AI_Frontend_SDK` (v1.0.1), `knowledge-base/` (Merise) |
| Date | 2026-08-06 |
| Version | 1.1 — recommandations S1, A1→A5, M1→M3 **appliquées** (2026-08-06) |
| Méthode | Extraction du cahier des charges (2 pages), inventaire exhaustif du backend (routes, contrôleurs, services, repositories, DTOs, resources, modèles, migrations, enums, policies, tests), croisement avec les docs du SDK (audités REV-003) et les règles de gestion Merise (RG1-RG35) |
| Historique | 1.0 : analyse initiale ; 1.1 : application des recommandations du § 5 (S1, A1→A5, M1→M3) |

---

# 1. Conformité Cahier des charges ↔ Backend

| Exigence du cahier des charges | Backend | Verdict |
|---|---|---|
| MVP — Signalement avec photo (temps réel ou upload) | `POST /api/signalements` accepte `photos[]` (URLs uniquement, validation `url`) ; tables `photo_signalements` / `photo_interventions` | ⚠️ Partiel : aucun endpoint d'upload (multipart/S3/Cloudinary). Le stockage est délégué au frontend ou à un service tiers (ADR-005). |
| MVP — Géolocalisation automatique | `latitude decimal(10,8)` / `longitude decimal(11,8)` NOT NULL ; non modifiable via PUT | ✅ Conforme |
| MVP — Carte des zones à collecter (marqueurs pour **chaque** signalement actif) | Aucun endpoint de carte communautaire ; index citoyen filtré (`user_id`), carte personnelle ; heatmap admin par zone | ⚠️ Partiel : périmètre réduit à la carte personnelle + heatmap admin (documenté BR-SIG-005). |
| MVP — Authentification citoyenne | `POST /api/auth/register` force le rôle `citizen`, token Sanctum | ✅ Conforme |
| Avancé — Suivi du statut + **notification** aux changements d'état | Machine à états complète (9 statuts) mais **aucun mécanisme de notification** | ❌ Absent |
| Avancé — Tableau de bord admin : heatmap + assignation d'équipes | `GET /api/dashboard/heatmap` (admin), CRUD affectations/équipes | ✅ Conforme |
| Avancé — Gamification : points + **classement Éco-Citoyens** | Points : 100 pts à la clôture (BR-INT-003) ; historique lisible ; **aucun endpoint de classement/solde** | ⚠️ Partiel : points ✅, classement ❌ |
| Avancé — Catégorisation (Plastique, Gravats, Organique…) | CRUD `types_dechets` générique (6 types seedés par factory) | ✅ Conforme |
| Contraintes — Mobile First | Frontend à développer (paradigme documenté dans le SDK) | ✅ Prévu |
| Contraintes — Geolocation API navigateur | Côté frontend (documenté user-flows.md:70, report-create.md:73) | ✅ Prévu |
| Contraintes — Leaflet/Mapbox/Google Maps | Choix Leaflet (ADR-002) + leaflet.heat | ✅ Conforme |
| Contraintes — Backend PHP (Laravel) | Laravel 13.8, Sanctum, Spatie Permission | ✅ Conforme |
| Contraintes — PostgreSQL/PostGIS ou MySQL | `DB_CONNECTION=pgsql` (PostgreSQL) — PostGIS non utilisé (lat/long decimal, pas de geometry) | ✅ Conforme (recommandation non contraignante) |
| Livrables — README, MCD/MLD, doc API | README ✅, knowledge-base (MCD/MLD Merise) ✅, OpenApi.php (31 chemins) + endpoints.md | ⚠️ Swagger incomplet (index historique-points et `cloturer` absents) |

**Écarts fonctionnels CA ↔ backend : notifications de statut (2.2), classement Éco-Citoyens (2.2), upload de photos (2.1), carte communautaire (2.1).**

---

# 2. Conformité Backend ↔ AI Frontend SDK

Déjà validée par le re-audit REV-003 (44 endpoints ↔ 44 routes réelles, 0 écart ; enums identiques ; machine à états fidèle). Constats résiduels :

| Constat | Détail | Sévérité |
|---|---|---|
| Service fantôme — **résolu (S1)** | `map-citizen.md:182` : « GeolocationService (service frontend à créer — wrapper navigator.geolocation, aucune implémentation backend) » | Résolu |
| Champs masqués — **résolus (A5/M1)** | `api-analysis.md` § 9 bis (champs masqués par `UserResource` + décision requise) ; hypothèses ajoutées dans `profile.md` et `users.md` | Résolu |
| Ambiguïtés actives bien suivies | n° 1 (historique de points non filtré) et n° 11 (auto-édition profil) documentées et contournées côté UI | Conforme |
| Gamification alignée | BR-GAM-001/002/004 = comportement réel ; BR-GAM-003 = absence de classement documentée | Conforme |
| Casse des champs — **documentée (A2)** | `api-analysis.md` § 9 bis « Contrat d'intégration frontend ↔ backend » : casse snake_case → camelCase (mappers DTO), pagination `data/links/meta`, codes d'erreur, `VITE_API_URL`, session/token, champs masqués, absence de versioning | Résolu |

---

# 3. Convention entre les trois sources

1. **Le SDK observe le backend** : `endpoints.md` = miroir de `routes/api.php` (44/44) ; `business-rules.md` trace chaque règle vers le code (Policies, Services, enums, migrations) ; `api-analysis.md` documente modèle de données, enums et ambiguïtés. La convention est **factuelle et vérifiée par les audits REV-001 → REV-003**.
2. **Le SDK documente les écarts backend** sous forme d'« ambiguïtés » (n° 1, n° 11) et de points de vigilance — plutôt que de les corriger.
3. **La knowledge-base Merise (RG1-RG35, MCD/MLD) est désormais référencée** : hiérarchie documentaire d'`AI_CONTEXT.md` (M3) + correspondance **RG ↔ BR** complète dans `business-rules.md` avec les RG non satisfaites (RG2, RG6, RG10, RG28, RG29) — A1 appliqué.
4. **Contrat d'intégration formel créé** : § 9 bis d'`api-analysis.md` (casse des champs, pagination, codes d'erreur, base URL, session, champs masqués, versioning) + **Runbook de synchronisation** en Étape 9 de `WORKFLOW/05-review.md` (A2/A4 appliqués).

---

# 4. Écarts Règles de gestion Merise ↔ implémentation (à trancher)

| RG | Énoncé | Implémentation | Écart |
|---|---|---|---|
| RG2 | Un utilisateur a exactement un rôle | Spatie multi-rôles ; un seul assigné en pratique | Structurel (mineur) |
| RG6 | Seuls les agents appartiennent aux équipes | `EquipeService` attache des `agent_ids` sans vérifier le rôle | Non vérifié |
| RG10 | Un signalement appartient à une seule zone | `zone_id` **nullable** (signalement sans zone possible) | Documenté côté SDK ? partiellement (DTO nullable) |
| RG28 | Un signalement peut être réaffecté | Transition `affecte → affecte` interdite (point de vigilance business-rules.md:1340) | Contredit |
| RG29 | Une affectation peut générer plusieurs interventions | 1re intervention → statut `en_intervention` ; plus d'intervention possible sur l'affectation | Contredit |

---

# 5. Recommandations — statut d'application

Toutes les recommandations (S1, A1→A5, M1→M3) ont été **appliquées le 2026-08-06** :

## 5.1 Suppressions

| ID | Action | Statut |
|---|---|---|
| S1 | Retirer « GeolocationService » des Dépendances de `map-citizen.md:182` (service inexistant) ou le marquer « service frontend à créer ». | ✅ Appliquée — reformulé « service frontend à créer (wrapper `navigator.geolocation`, aucune implémentation backend) » |

## 5.2 Ajouts

| ID | Action | Statut |
|---|---|---|
| A1 | Référencer `knowledge-base/` dans `AI_CONTEXT.md` (arborescence docs/) et créer un mapping **RG-* ↔ BR-*** dans business-rules.md (avec la liste des RG non satisfaites : RG2, RG6, RG10, RG28, RG29) | ✅ Appliquée — `AI_CONTEXT.md` (hiérarchie + note amont) ; `business-rules.md` (section « Correspondance RG1 → RG35 », tableau 35 lignes, statuts Conforme/Partielle/Contredite/Sans objet/Non vérifié) |
| A2 | Nouvelle section « Contrat d'intégration frontend ↔ backend » dans api-analysis.md : casse des champs (snake_case API → convention TS), pagination `data/links/meta`, codes d'erreur, base URL/config (ex. `VITE_API_URL`), traitement 401/session | ✅ Appliquée — § 9 bis d'`api-analysis.md` |
| A3 | Nouveau doc `docs/01-analysis/ecarts-cahier-des-charges.md` : inventaire des exigences du cahier des charges non implémentées (notifications 2.2, classement 2.2, upload photos 2.1, carte communautaire 2.1) avec statut « décision requise » | ✅ Appliquée — `docs/01-analysis/ecarts-cahier-des-charges.md` (E-01 → E-10, tableau de suivi) |
| A4 | Section « Runbook de synchronisation » dans WORKFLOW/05-review.md (ou nouveau doc) : procédure à suivre quand `routes/api.php`, les enums, les policies ou les migrations évoluent (re-analyse → mise à jour endpoints.md/api-analysis.md/business-rules.md → re-audit ciblé) | ✅ Appliquée — Étape 9 « Runbook de synchronisation avec le backend » dans `WORKFLOW/05-review.md` |
| A5 | Documenter dans api-analysis.md les champs masqués par `UserResource` (`telephone`, `adresse`, `etat_compte`) avec décision requise (les exposer ou les écarter) | ✅ Appliquée — § 9 bis d'`api-analysis.md` |

## 5.3 Modifications

| ID | Action | Statut |
|---|---|---|
| M1 | `profile.md` / `users.md` : mentionner explicitement que téléphone/adresse/état du compte ne sont pas exposés par l'API | ✅ Appliquée — hypothèses ajoutées dans les deux specs |
| M2 | `CMP-005` : clarifier la « variante delta pour les notifications de gain » (aucune notification backend n'existe) | ✅ Appliquée — `CMP-005-badge-points.md` (Décisions) renvoie vers `ecarts-cahier-des-charges.md` |
| M3 | `AI_CONTEXT.md` : ajouter la knowledge-base dans la hiérarchie documentaire amont (après RELEASE/ ou en annexe) | ✅ Appliquée — entrée `knowledge-base/` après `RELEASE/` + note de prévalence |

## 5.4 Constats backend hors périmètre SDK (à signaler au propriétaire backend)

- Swagger incomplet : index `GET /api/historique-points` et `POST /api/interventions/{id}/cloturer` absents de la doc OpenAPI.
- Commentaire de route « lecture seule (propre utilisateur ou Admin) » non respecté : `HistoriquePointController@index` expose les points de tous les utilisateurs.
- Code mort : `AuthResultDTO`, `AuthenticatedUserDTO`, 4 exceptions jamais levées.
- `GET /api/user` et `POST /api/auth/logout` sans nom de route ; aucun rate limiting ; pas de versioning `/api/v1`.

---

# 6. Verdict

- **Cahier des charges ↔ backend** : conforme sur le MVP et les contraintes techniques ; **3 exigences non implémentées** (notifications, classement, upload de photos) et 1 partiellement (carte communautaire) — désormais **inventoriées** dans `docs/01-analysis/ecarts-cahier-des-charges.md` (E-01 → E-10, statut « décision requise »).
- **Backend ↔ SDK** : **en phase** (44/44 endpoints, enums, règles, machine à états) ; les écarts documentaires (S1, A5) sont **résolus** ; le contrat d'intégration (§ 9 bis) et les hypothèses d'écrans sont à jour.
- **Convention** : le maillon amont (knowledge-base/RG ↔ BR) et le contrat d'intégration frontend ↔ backend sont désormais **formalisés** ; la synchronisation est reproductible via le runbook (Étape 9 du Workflow 05).

Recommandations résiduelles (hors SDK, à arbitrer avec le propriétaire backend) : E-01 notifications, E-02 classement, E-03 upload photos (voir `ecarts-cahier-des-charges.md`), Swagger incomplet, commentaire de route non respecté, code mort backend, noms de routes manquants.
