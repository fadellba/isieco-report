# AI Frontend SDK - MASTER (Orchestrateur)

Version: 1.1.0

---

# Rôle

MASTER est la **couche d'orchestration** du SDK : le mode d'exécution qui permet à une IA de piloter l'ensemble du framework à partir d'une **seule demande utilisateur**, sans intervention humaine intermédiaire.

Ce document est le **point d'entrée unique** de toute mission. Il est lu **en premier**, avant `AI_CONTEXT.md`.

---

# Entrée d'une mission

Toute mission commence par une instruction utilisateur, par exemple :

> « Je possède un backend Laravel. Je veux développer un frontend Angular 22. Utilise le SDK. Conduis la mission jusqu'à la livraison finale. Ne saute aucune étape. »

L'orchestrateur doit alors :

1. extraire le besoin (application, acteurs, contraintes techniques) ;
2. localiser le backend de référence ;
3. vérifier que le SDK est présent et à jour (`RELEASE/VERSION.md`) ;
4. initialiser le journal de mission (`docs/mission-log.md`) ;
5. démarrer la boucle de pilotage phase par phase.

---

# Boucle de pilotage

Pour **chaque phase** du cycle obligatoire, appliquer les 7 étapes :

```
1. Identifier la phase courante (00 → 06)

2. Lire le workflow correspondant (WORKFLOW/0X-*)

3. Sélectionner l'agent responsable (matrice ci-dessous)

4. Vérifier les prérequis de la phase (gates, section suivante)

5. Exécuter avec l'agent :
   - lire son rôle (AGENTS/*) ;
   - lire les prompts associés (PROMPTS/*) ;
   - utiliser les templates officiels (TEMPLATES/*) ;
   - respecter les règles (PROJECT_RULES/*).

6. Déposer les livrables au bon endroit (docs/0X-*)

7. Valider la sortie de phase (gate de sortie)
   avant de passer à la phase suivante.
```

Aucune phase ne peut être sautée ni exécutée hors ordre sans décision documentée (voir « Décisions »).

---

# Matrice de sélection des agents

| Phase | Agents responsables |
|---|---|
| 00 Bootstrap | Orchestrateur (MASTER) |
| 01 Analysis | Backend Analyst + Product Architect |
| 02 Design | Product Architect + UI Designer |
| 03 Architecture | Frontend Architect |
| 04 Development | Citizen Developer / Agent Developer / Admin Developer (selon l'espace) |
| 05 Review | QA Reviewer |
| 06 Release | Release Manager |

Un agent ne remplace pas un autre agent (séparation stricte des responsabilités).

---

# Gates de phase (prérequis d'entrée / sortie)

Chaque phase a des conditions vérifiables. L'orchestrateur **doit s'arrêter** si une condition d'entrée n'est pas satisfaite — il ne doit **jamais improviser** pour contourner une dépendance manquante.

| Phase | Prérequis d'entrée | Livrables de sortie |
|---|---|---|
| 00 Bootstrap | SDK présent, backend accessible, instruction utilisateur claire | `docs/00-bootstrap/` rempli, journal de mission initialisé |
| 01 Analysis | Bootstrap validé | `docs/01-analysis/` : api-analysis, business-rules, cahier des charges, écarts |
| 02 Design | Analysis validée | `docs/02-design/` : user-flows, navigation, specs écrans (SCR-*), specs composants (CMP-*) **+ maquettes Figma liées** |
| 03 Architecture | Design validé | `docs/03-architecture/` : architecture applicative, décisions (ADR) |
| 04 Development | Architecture validée **+ maquettes Figma existantes** (le développeur interrompt l'implémentation sinon) | `docs/04-development/` : code, développement log |
| 05 Review | Development terminé | `docs/05-review/` : rapports de revue, bugs corrigés |
| 06 Release | Review validée | `RELEASE/` : VERSION, CHANGELOG, COMPATIBILITY, ROADMAP ; `OUTPUT/` : dossier de livraison |

---

# Règles d'arrêt

L'orchestrateur s'arrête et **revient vers l'utilisateur** quand :

- un prérequis d'entrée de phase n'est pas satisfait (ex. maquettes Figma absentes avant le développement) ;
- une information utilisateur est ambiguë ou contradictoire ;
- une règle du SDK est en conflit avec une demande utilisateur ;
- un livrable attendu est manquant à la sortie d'une phase.

Chaque arrêt est consigné dans le journal de mission avec : phase, dépendance manquante, action de déblocage proposée.

---

# Critères d'acceptation (dogfooding)

Une mission est pilotée correctement si les 5 comportements suivants sont observés :

1. **L'IA choisit le bon agent** pour chaque phase (matrice respectée) ;
2. **L'IA lit les bons documents** (workflow, prompts, templates, règles) avant d'agir ;
3. **L'IA respecte les workflows** (aucune étape sautée, ordre respecté) ;
4. **L'IA produit les livrables au bon endroit** (docs/0X-*, RELEASE/, OUTPUT/) ;
5. **L'IA s'arrête lorsqu'une dépendance manque** (règle d'arrêt appliquée, déblocage proposé).

Ces critères servent de grille au rapport de test `OUTPUT/mission-dogfood-*.md`.

---

# Journal de mission

`docs/mission-log.md` retrace pour chaque phase :

- date et agent exécutant ;
- entrée (prérequis vérifiés) ;
- actions menées ;
- livrables déposés (chemins) ;
- sortie (gate validée ou arrêt avec motif).

Ce journal est la preuve de traçabilité du pilotage.

---

# Décisions

Toute dérogation (étape sautée, ordre modifié, dépendance contournée) doit être :

1. documentée dans `docs/03-architecture/decisions/` (format ADR) ou dans le journal de mission selon la portée ;
2. justifiée par un motif explicite ;
3. signalée à l'utilisateur avant exécution.

---

# Ordre de lecture pour l'IA

```
MASTER.md          ← ce document (orchestration)

↓

README.md          ← présentation générale

↓

AI_CONTEXT.md      ← contexte permanent

↓

PROJECT_RULES/     ← règles globales

↓

WORKFLOW/          ← processus obligatoire

↓

TEMPLATES/ → PROMPTS/ → AGENTS/

↓

docs/              ← livrables de la mission

↓

RELEASE/ → OUTPUT/ → tools/ → knowledge-base/
```

En cas de contradiction, le document supérieur prévaut.

---

# Version

```
AI Frontend SDK
Version 1.1.0
Status: Stable
Type: Feature Release (couche d'orchestration)
```
