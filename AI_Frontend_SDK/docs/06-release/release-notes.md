# Notes de version

---

# Informations générales

## Version

1.1.0

---

## Date de release

2026-08-10

---

## Résumé

Couverture front complète (Agents, Citoyens, Administrateurs) sur l'application `isieco-report-frontend`, alignée sur le contrat API Laravel. Cette version clôt le cycle de développement et la revue QA du module Admin (REV-001) : réconciliation du contrat utilisateur (`prenom` + confirmation du mot de passe), filtres de liste implémentés, chargement complet des agents d'équipe.

---

# Nouvelles fonctionnalités

* **FEAT-ADMIN-DASHBOARD** — Tableau de bord admin : heatmap, zones critiques, six tuiles d'accès rapide.
* **FEAT-ADMIN-VALIDATION** — File de validation des signalements (Valider / Rejeter / Prioriser).
* **FEAT-ADMIN-AFFECTATION** — Affectation des signalements aux équipes.
* **FEAT-ADMIN-INTERVENTION** — Suivi des interventions (toutes / en cours / terminées).
* **FEAT-ADMIN-EQUIPE** — Gestion des équipes avec multi-sélection d'agents (chargement complet, plus de limite à la page 1).
* **FEAT-ADMIN-REFERENTIEL** — Référentiels Zones et Types de déchets (CRUD).
* **FEAT-ADMIN-USER** — Gestion des comptes utilisateurs (création, modification, mot de passe + confirmation, suppression, filtres).

---

# Améliorations

* Recherche utilisateur opérationnelle : filtres `nom`, `email` et `rôle` appliqués côté API (`paginateWithFilters`).
* Formulaire utilisateur : champ `prénom` et confirmation du mot de passe (contrôle de concordance `passwordMismatch`).
* Liste des équipes : les agents des équipes sont chargés (eager-loading) et la sélection d'agents parcourt toute la pagination.

---

# Corrections

| Identifiant | Description | Gravité |
|---|---|---|
| BUG-ADMIN-001 | Création de compte : le backend exigeait `prenom` et `password_confirmation`, absents du front (crash 422). Aligné dans les payloads et le formulaire. | Majeure |
| BUG-ADMIN-002 | Filtres de liste utilisateurs non appliqués côté backend. Implémentation via `paginateWithFilters`. | Majeure |
| BUG-ADMIN-003 | Sélection d'agents limitée à la première page. Chargement paginé complet (`role=agent`). | Mineure |
| BUG-ADMIN-004 | Saisie mot de passe sans confirmation / étiquette ambiguë. Champ de confirmation + control `passwordMismatch`. | Mineure (UX) |

---

# Limitations connues

* Stockage des photos : l'API n'accepte que des URLs (pas d'upload) — provider externe prévu (ADR-005), non livré.
* Réinitialisation du mot de passe par courriel : l'écran est livré (SCR-017), l'envoi de courriel reste côté backend (non fourni).
* Cartographie : warnings « leaflet n'est pas ESM » au build (non bloquants).

---

# Installation / Mise à jour

* Backend : `php artisan migrate --seed`, puis `php artisan test`.
* Frontend : `npm ci`, `npm run build` ; tests unitaires `npm test`.

---

# Historique

Créé par : Release Manager (openCode)

Date : 2026-08-10

Dernière mise à jour : 2026-08-10

---

# Notes

Informations complémentaires vérifiées uniquement.