# Rapport d'audit — Lien Figma ↔ AI Frontend SDK

| Champ | Valeur |
|---|---|
| Identifiant | FIGMA-AUDIT-001 |
| Type | Audit de vérifiabilité du Design System |
| Périmètre | Sections « Maquette Figma » / « Figma » des specs, document Figma, tokens |
| Date | 2026-08-06 |
| Méthode | Recherche exhaustive des références Figma dans le SDK (agents, prompts, workflows, templates, specs), lecture des sections concernées, inspection du document Figma ouvert via le plugin |

---

# 1. Constats

| # | Constat | Sévérité |
|---|---------|----------|
| F-01 | **Aucune maquette Figma n'existe** : toutes les sections « Maquette Figma » des 17 specs écrans et « Figma » des 5 specs composants contiennent « Lien : à compléter par l'UI Designer (Étape 6) » — aucun lien, aucun fichier | Majeure |
| F-02 | **Le document Figma ouvert est vierge** : « Untitled », 1 page « Page 1 » — aucun Design System (pas de 00 Foundations, 01 Components, ni pages Citizen/Agent/Admin) | Majeure |
| F-03 | **Les specs composants déclarent des variables « à préciser »** : CMP-001→005 (« Variables utilisées (à préciser par l'UI Designer avec le Design System Figma) ») | Majeure |
| F-04 | **Les tokens n'existent qu'en documentation** : nouveau `docs/02-design/design-tokens.md` (v1.0) définit les valeurs, mais aucune Variable Figma ne les matérialise | Majeure |
| F-05 | **La « source de vérité visuelle » est déclarée mais inexistante** : 10+ fichiers (AGENTS, WORKFLOW, PROJECT_RULES) affirment « Figma est la source de vérité visuelle » (ex. `AGENTS/qa-reviewer.md:26`, `figma-guidelines.md:11`) | Critique (contradiction) |
| F-06 | ADR-002 et ADR-005 portent « Maquette Figma : à compléter par l'UI Designer » | Mineure |

# 2. Conséquences

* Le Workflow 05 (Étape 4 « conformité aux maquettes Figma ») ne peut pas être exécuté — la vérification visuelle est inopérante.
* Les agents développeurs (citizen/agent/admin-developer) sont censés « interrompre l'implémentation » si la maquette manque (citizen-developer.md:191) : l'implémentation du frontend est bloquée tant que Figma n'existe pas.
* Le critère d'acceptation « L'écran correspond à la maquette Figma » de toutes les specs est non vérifiable.

# 3. Recommandations

| ID | Action | Priorité |
|----|--------|----------|
| R-01 | Créer le fichier Figma ISI-Eco Report : pages `00 Foundations` / `01 Components` / `02 Citizen` / `03 Agent` / `04 Admin` / `05 Prototype` (organisation imposée par figma-guidelines.md) | Critique |
| R-02 | Reproduire les tokens de `docs/02-design/design-tokens.md` en Variables Figma (mêmes noms) | Critique |
| R-03 | Créer les composants DS (Button, Input, Select, Card, Badge, Table, Modal, Snackbar, Banner, EmptyState, Skeleton, StatCard, Tabs, SearchBar, PhotoUploader, MapView, BottomNavigation) en Variants + Auto Layout | Haute |
| R-04 | Renseigner les sections « Maquette Figma » des 17 specs + 5 CMP (lien/version) une fois les maquettes produites | Haute |
| R-05 | Jusqu'à la création de Figma : considérer `docs/02-design/design-tokens.md` comme source visuelle temporaire (prévalence déclarée) | Moyenne |

# 4. Suivi d'application (2026-08-06)

| ID | Statut | Détaillé |
|----|--------|----------|
| R-01 | **Appliquée (partiel)** | Fichier créé via plugin Figma, mais **adaptation plan Starter (3 pages max)** : pages `00 Foundations`, `01 Components`, `02 Screens` (espaces Citizen/Agent/Admin + Prototype en sections de `02 Screens` — note ajoutée dans `PROJECT_RULES/figma-guidelines.md`) |
| R-02 | **Appliquée** | 44 Variables couleur (collection `Colors`), 11 espacements et 5 rayons (collections `Spacing` / `Radius`) créés et valorisés ; frame `01 Palette — Night City` avec 10 échantillons **liés aux Variables** (`boundVariables` vérifiés) |
| R-03 | **Appliquée** | **Button** complet (21 variantes, 7 types × 3 tailles) + **16 composants créés** le 2026-08-06 (séance de reprise) : Input (8), Select (6), Card (2), Badge (14), Table (2), Modal (1), Snackbar (4), Banner (4), EmptyState (1), Skeleton (3), StatCard (2), Tabs (2), SearchBar (2), PhotoUploader (2), MapView (1), BottomNavigation (1) — **47 nouveaux frames**, tous en auto layout, radius tokenisés, **tous les fills/strokes/textes liés aux Variables** (boundVariables vérifiés), nommés `Nom/prop=valeur` pour la conversion en component sets en 1 clic dans Figma |
| R-04 | **Appliquée** | Sections « Maquette Figma » des 17 specs écrans + 5 CMP renseignées (fichier Figma « ISI-Eco Report », page 01 Components, frames par écran, version DS v1.0 du 2026-08-06) ; ADR-002/ADR-005 mis à jour |
| R-05 | Devenue sans objet | Les tokens sont désormais matérialisés en Variables Figma |

# 5. Verdict

Le lien Figma ↔ SDK était **entièrement déclaratif et inexistant en pratique** au moment de l'audit (F-01 → F-04, F-05). R-01 et R-02 sont appliquées le jour même : le Design System est désormais **matérialisé** (3 pages, 3 collections de Variables, 60 Variables, palette Night City liée). R-03 (17 composants, 68 frames) et R-04 (24 documents renseignés) sont **appliquées le 2026-08-06 en séance de reprise** : le cycle de vérification du Workflow 05 est bouclé. Reste la conversion des frames en component sets (1 clic dans Figma) et le renommage/partage du fichier (actuellement « Untitled ») — actions manuelles documentées dans `PROJECT_RULES/figma-guidelines.md`.

# 6. Reprise des écrans Admin SCR-010 → SCR-013 (2026-08-06)

Suite à la remarque utilisateur « des choses ont échoué sur la maquette », reprise de la section Admin (`02 Screens`) :

| Résultat | Détail |
|----------|--------|
| FX-01 — Maquettes Admin sans contenu | Les frames SCR-010 (`72:694`), SCR-011 (`72:695`), SCR-012 (`72:696`), SCR-013 (`72:697`) ne contenaient **que les rectangles du shell** (aucun texte) : les IDs `73:797+` annoncés appartenaient aux frames SCR-007/008/009. **Corrigé** : shell textuel + contenus recréés |
| FX-02 — SCR-008 Badge/Title superposés | Badges (`73:833`, `73:839`, `73:845`) et titres des 3 cartes partageaient les mêmes coordonnées (x=286, y=180/320/460) → badges déplacés à **x=1330** |
| FX-03 — SCR-009 Form/Capacite superposé | `Form/Capacite` (`73:879`) empilait sur le label `Form/L1` (924,208). **Corrigé** : déplacé à (944,247) dans Field1 |
| R-06 | Reconstruire les textes des 4 écrans Admin (shell + contenu) avec les gabarits de SCR-007/008/009 |

**État après reprise** (vérifié par filtre `TEXT` par frame) :

| Frame | Textes créés |
|-------|--------------|
| SCR-010 Interventions (`72:694`) | 31 — shell + onglets, 3 cartes (badge INT-021/022 en cours, INT-019 terminée, boutons Terminer/Clôturer) |
| SCR-011 Équipes (`72:695`) | 33 — shell + liste 3 équipes (Alpha/Bravo/Charlie) + formulaire (nom, description, agents, zone) |
| SCR-012 Référentiels (`72:696`) | 30 — shell + onglets Zones/Types de déchets + tableau 4 zones |
| SCR-013 Utilisateurs (`72:697`) | 39 — shell + tableau 5 utilisateurs (nom, email, rôle FR, actions) + bouton « + Nouvel utilisateur » |

Actions manuelles restantes inchangées (conversion 1 clic, renommage/partage).
