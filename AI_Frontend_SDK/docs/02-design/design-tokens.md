# Design Tokens — ISI-Eco-Report

Statut : Vérifié (direction « Night City — Ember/graphite » validée — à reproduire en Variables Figma)

Auteur : Product Architect

Date : 2026-08-06

Version : 1.1

---

# Conventions de lecture

* Source actuelle : ce document + les **Variables Figma** du fichier ISI-Eco Report (collection `Colors` — 44 variables, page `00 Foundations`), créées le 2026-08-06 et **liées aux échantillons** du frame `01 Palette — Night City` (voir `OUTPUT/figma-audit-report.md`, R-01/R-02 appliquées). Toute modification de valeur se fait dans les deux sources (voir Workflow 05, Étape 9).
* Grille de base : **8 px** (tous les espacements et rayons sont des multiples de 8).
* Mobile First (Citizen/Agent) ; Desktop First (Admin).
* **Dark First** : le thème sombre est le mode par défaut et unique — ambiance « ville la nuit » (graphite profond + ember). Les surfaces claires restent réservées aux éléments compacts (chips, badges sur fond sombre).
* Rôles sémantiques obligatoires : Primary, Secondary, Success, Warning, Error, Info, Neutral — aucune couleur arbitraire (figma-guidelines.md).
* Aucune couleur verte n'est utilisée comme couleur d'identité (success = menthe bleu-vert, distinct du cliché « éco vert »).

---

# Couleurs

## Accents

| Token | Valeur | Usage |
| ----- | ------ | ----- |
| `color-primary` | `#E8A33D` | Ember — actions principales (citoyen), éléments interactifs, focus |
| `color-primary-hover` | `#D18E2C` | Hover/actif |
| `color-primary-soft` | `rgba(232, 163, 61, 0.14)` | Fond des états sélectionnés, encarts sur fond sombre |
| `color-primary-light` | `#F3C878` | Icônes/surlignages sur fond sombre |
| `color-secondary` | `#5B8DEF` | Bleu acier — actions secondaires, liens |
| `color-secondary-hover` | `#4A79DE` | Hover/actif |
| `color-secondary-soft` | `rgba(91, 141, 239, 0.14)` | Fond des encarts liens/info |
| `color-success` | `#2BB3A3` | Menthe — succès, validation, points gagnés |
| `color-success-hover` | `#249A8C` | Hover/actif |
| `color-success-soft` | `rgba(43, 179, 163, 0.14)` | Fond des confirmations |
| `color-warning` | `#C6D23E` | Lime signalétique — avertissements, statuts intermédiaires |
| `color-warning-hover` | `#AEB93A` | Hover/actif |
| `color-warning-soft` | `rgba(198, 210, 62, 0.14)` | Fond des encarts d'alerte |
| `color-error` | `#E5484D` | Vermillon — erreurs, rejets, suppressions |
| `color-error-hover` | `#CF3F44` | Hover/actif des actions destructrices |
| `color-error-soft` | `rgba(229, 72, 77, 0.14)` | Fond des messages d'erreur |
| `color-info` | `#A78BFA` | Violet — informations neutres |
| `color-info-soft` | `rgba(167, 139, 250, 0.14)` | Fond des encarts info |

## Fond et surfaces (graphite)

| Token | Valeur | Usage |
| ----- | ------ | ----- |
| `color-background` | `#15171D` | Fond principal (graphite profond) |
| `color-surface` | `#1B1E26` | Cartes, tiroirs |
| `color-surface-alt` | `#21252E` | Surfaces alternées, champs |
| `color-border` | `#2C313D` | Bordures |
| `color-border-strong` | `#3A4150` | Bordures fortes, séparateurs |
| `color-overlay` | `rgba(10, 11, 15, 0.6)` | Arrière-plan des modales |

## Texte (crème chaud)

| Token | Valeur | Usage |
| ----- | ------ | ----- |
| `color-text-primary` | `#EDE7DB` | Texte principal |
| `color-text-secondary` | `#A6ACB8` | Texte secondaire |
| `color-text-disabled` | `#5C626E` | Texte/icônes désactivés |
| `color-on-primary` | `#1B140B` | Texte sur Primary (contraste) |
| `color-on-secondary` | `#10141C` | Texte sur Secondary |
| `color-on-success` | `#0B2B26` | Texte sur Success |
| `color-on-warning` | `#191B07` | Texte sur Warning |
| `color-on-error` | `#2A0C0D` | Texte sur Error |
| `color-on-info` | `#151021` | Texte sur Info |

## Neutres (chauds — surfaces claires compactes)

| Token | Valeur | Usage |
| ----- | ------ | ----- |
| `color-neutral-0` | `#FFFFFF` | — |
| `color-neutral-50` | `#F6F4EF` | Fond des chips sur fond sombre |
| `color-neutral-100` | `#ECE8DE` | — |
| `color-neutral-200` | `#D9D3C5` | Bordures de chips |
| `color-neutral-300` | `#C0B8A6` | — |
| `color-neutral-400` | `#A09685` | Icônes désactivées |
| `color-neutral-500` | `#7E776A` | Texte secondaire sur clair |
| `color-neutral-600` | `#5D574C` | — |
| `color-neutral-700` | `#3E3931` | — |
| `color-neutral-800` | `#27231D` | — |
| `color-neutral-900` | `#191613` | Texte sur fond clair |

---

# Typographie

Famille : **Inter** (Google Fonts) — fallback `system-ui`. Famille à confirmer par l'UI Designer.

| Token | Taille | Hauteur de ligne | Poids | Usage |
| ----- | ------ | ---------------- | ----- | ----- |
| `typo-display` | 30 | 36 | 700 | Titres de page (mobile) |
| `typo-h1` | 24 | 32 | 700 | Titres d'écran |
| `typo-h2` | 20 | 28 | 600 | Sections |
| `typo-h3` | 18 | 24 | 600 | Sous-sections, cartes |
| `typo-body` | 16 | 24 | 400 | Texte courant |
| `typo-body-strong` | 16 | 24 | 600 | Texte courant important |
| `typo-small` | 14 | 20 | 400 | Texte secondaire |
| `typo-caption` | 12 | 16 | 400 | Légendes, métadonnées |
| `typo-label` | 14 | 20 | 600 | Labels de champs |
| `typo-button` | 16 | 20 | 600 | Boutons |

Interlignage : 1.5 pour le texte courant (accessibilité). Interlettrage : 0, sauf `display` (−0.5) et `caption` (+0.3) si nécessaire.

---

# Espacements (grille 8 px)

| Token | Valeur |
| ----- | ------ |
| `spacing-0` | 0 |
| `spacing-1` | 8 |
| `spacing-2` | 16 |
| `spacing-3` | 24 |
| `spacing-4` | 32 |
| `spacing-5` | 40 |
| `spacing-6` | 48 |
| `spacing-8` | 64 |
| `spacing-10` | 80 |
| `spacing-12` | 96 |
| `spacing-16` | 128 |

Règle : aucun espacement hors multiples de 8 (sauf `spacing-0`).

---

# Rayons

| Token | Valeur | Usage |
| ----- | ------ | ----- |
| `radius-none` | 0 | — |
| `radius-sm` | 8 | Champs, petits éléments |
| `radius-md` | 16 | Cartes, modales |
| `radius-lg` | 24 | Cartes principales |
| `radius-pill` | 999 | Badges, boutons pilules |

---

# Ombres (sur fond sombre)

| Token | Valeur | Usage |
| ----- | ------ | ----- |
| `shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.25)` | Surfaces discrètes |
| `shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.35)` | Cartes, dropdowns |
| `shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.45)` | Modales, overlays |
| `shadow-overlay` | `0 12px 32px rgba(0, 0, 0, 0.6)` | Toast, tooltips |

---

# Bordures, opacités, focus

| Token | Valeur |
| ----- | ------ |
| `border-width` | 1 px |
| `opacity-disabled` | 0.5 |
| `opacity-skeleton` | 0.25 |
| `focus-outline` | 2 px `color-primary`, décalage 2 px |

---

# Breakpoints

| Token | Valeur | Cible |
| ----- | ------ | ----- |
| `breakpoint-mobile` | 375 px (min) | Citizen, Agent |
| `breakpoint-tablet` | 768 px | Adaptation |
| `breakpoint-desktop` | 1280 px (min) | Admin |

---

# Icônes

* Une seule bibliothèque pour tout le projet (à fixer avec l'UI Designer — ex. Lucide ou Material Symbols).
* Tailles : 16 / 20 / 24 px.
* Ne jamais mélanger plusieurs styles (figma-guidelines.md).

---

# Animations

| Token | Valeur |
| ----- | ------ |
| `duration-fast` | 150 ms |
| `duration-base` | 200 ms |
| `easing` | `cubic-bezier(0.4, 0, 0.2, 1)` |

---

# Mapping Angular

Les tokens sont exposés en CSS custom properties :

```css
:root {
  --color-primary: #E8A33D;
  --color-background: #15171D;
  --color-text-primary: #EDE7DB;
  --spacing-1: 8px;
  --radius-md: 16px;
  ...
}
```

Convention de nommage : `--<catégorie>-<nom>`. Le Design System Figma (Variables) devra reproduire ces mêmes noms.

---

# Règles d'usage

* Toute couleur provient des tokens — aucune valeur hex dans les specs ou le code.
* Toute taille provient de la grille 8 px.
* Tout composant UI (`shared/components`) consomme exclusivement ces tokens.
* Thème sombre uniquement : jamais de fond clair plein écran.
* Texte principal sur fond sombre : `color-text-primary` (crème) — jamais de blanc pur.
* Les états (Default, Hover, Focus, Active, Disabled, Loading) utilisent les tokens `-hover` / `-soft` / `opacity-disabled`.
* Boutons Primary : texte `color-on-primary` (sombre) — le blanc sur ember ne respecte pas le contraste.

---

# Interdictions

* créer des couleurs hors palette ;
* introduire un vert « éco » comme couleur d'identité ;
* utiliser des espacements arbitraires (hors multiples de 8) ;
* appliquer une taille manuelle lorsqu'un style existe ;
* mélanger plusieurs bibliothèques d'icônes ;
* utiliser du blanc pur (`#FFFFFF`) pour du texte sur fond sombre.

---

# Historique

| Version | Date | Auteur | Commentaire |
| ------- | ---- | ------ | ----------- |
| 1.0 | 2026-08-06 | Product Architect | Version initiale (vert éco) |
| 1.1 | 2026-08-06 | Product Architect | Direction « Night City — Ember/graphite » validée : dark-first, plus de vert |
