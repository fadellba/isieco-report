# Test de dogfooding — Rapport

| Champ | Valeur |
|---|---|
| Identifiant | MISSION-DOGFOOD-001 |
| Date | 2026-08-06 |
| Outil | opencode (session fraîche, sans contexte) |
| Dossier de démarrage | `C:\Users\FADEL\Herd\isieco-report` |
| Instruction utilisateur | Voir `OUTPUT/mission-dogfood-instruction.md` |
| Heure de début | _à remplir_ |
| Heure de fin | _à remplir_ |
| Modèle / version | _à remplir_ |

---

# Mode d'emploi du test

1. Ouvrir une **session opencode vierge** dans `C:\Users\FADEL\Herd\isieco-report`.
2. Coller l'instruction du fichier `OUTPUT/mission-dogfood-instruction.md` **telle quelle** (aucun ajout).
3. Observer sans intervenir : noter chaque action de l'IA (agents choisis, documents lus, livrables déposés, arrêts).
4. Noter **les arrêts** : la mission doit s'interrompre à la phase 02 Design (maquettes Figma incomplètes) — c'est le comportement attendu n° 5.
5. Remplir la grille ci-dessous puis le déroulé par phase.
6. Verdict et suivi.

---

# Grille des 5 comportements

| # | Comportement attendu | Observé ? (Oui/Non/Partiel) | Constat |
|---|---|---|---|
| 1 | Choisit le bon agent pour chaque phase (matrice MASTER) | _à remplir_ | |
| 2 | Lit les bons documents (workflow, prompts, templates, règles) avant d'agir | _à remplir_ | |
| 3 | Respecte les workflows (aucune étape sautée, ordre 00→06) | _à remplir_ | |
| 4 | Produit les livrables au bon endroit (docs/0X-*, RELEASE/, OUTPUT/) | _à remplir_ | |
| 5 | S'arrête lorsqu'une dépendance manque (maquettes Figma) et propose un déblocage | _à remplir_ | |

---

# Déroulé par phase

## Phase 00 — Bootstrap

| Champ | Constat |
|---|---|
| Agent choisi | |
| Documents lus | |
| Livrables déposés | |
| Sortie | Gate validée / arrêt (motif) |

## Phase 01 — Analysis

| Champ | Constat |
|---|---|
| Agent choisi | |
| Documents lus | |
| Livrables déposés | |
| Sortie | Gate validée / arrêt (motif) |

## Phase 02 — Design

| Champ | Constat |
|---|---|
| Agent choisi | |
| Documents lus | |
| Livrables déposés | |
| Sortie | Gate validée / arrêt (motif) — arrêt attendu : maquettes Figma incomplètes |

## Phases 03 → 06 (si atteintes — normalement non atteintes en l'état)

| Phase | Constat |
|---|---|
| 03 Architecture | |
| 04 Development | |
| 05 Review | |
| 06 Release | |

---

# Frictions et enseignements

| # | Friction observée | Enseignement / correctif SDK proposé |
|---|---|---|
| 1 | _à remplir_ | |
| 2 | _à remplir_ | |
| 3 | _à remplir_ | |

---

# Verdict

_À remplir — exemple :_

- [ ] SDK opérationnel : la mission est pilotée seule jusqu'à l'arrêt attendu
- [ ] SDK pilotable avec assistance mineure (frictions corrigeables)
- [ ] SDK non pilotable : correctifs MASTER/SDK nécessaires (lister)

---

# Suivi

| Action de correction | Responsable | Statut |
|---|---|---|
| _à remplir_ | | |
