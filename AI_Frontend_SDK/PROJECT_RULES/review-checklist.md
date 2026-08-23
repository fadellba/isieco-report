# PROJECT RULES — Review Checklist

Version : 1.0

---

# Objectif

Définir une checklist unique de validation applicable à tous les livrables du projet.

Cette checklist est utilisée :

* avant toute fin de mission ;
* avant toute fusion de code ;
* avant toute démonstration ;
* lors des audits QA.

Chaque critère doit être évalué comme :

* ✅ Oui
* ❌ Non
* ➖ Non applicable

Aucun point ne doit être ignoré.

---

# 1. Respect de la mission

□ Le périmètre de la mission est respecté.

□ Aucun fichier hors périmètre n'a été modifié.

□ Les livrables attendus sont présents.

□ Les contraintes de l'agent sont respectées.

---

# 2. Respect du backend

□ Aucun endpoint n'a été inventé.

□ Tous les endpoints existent.

□ Les méthodes HTTP sont correctes.

□ Les contrats API sont respectés.

□ Aucune logique métier n'a été déplacée dans le frontend.

□ Les validations backend sont respectées.

---

# 3. Respect de l'architecture

□ L'architecture Angular est respectée.

□ Les conventions du projet sont respectées.

□ Aucun composant dupliqué.

□ Aucun service dupliqué.

□ Les responsabilités sont correctement séparées.

---

# 4. Qualité du code

□ Le code est lisible.

□ Les noms sont explicites.

□ Aucun code mort.

□ Aucun TODO oublié.

□ Aucun commentaire obsolète.

□ Aucun `any` injustifié.

---

# 5. Réutilisation

□ Les composants Shared sont réutilisés.

□ Aucun composant du Design System n'a été recréé.

□ Les services existants sont réutilisés lorsque possible.

---

# 6. Interface utilisateur

□ Conforme aux maquettes Figma.

□ Responsive.

□ Accessibilité respectée.

□ Espacements cohérents.

□ Couleurs conformes au Design System.

□ Typographie cohérente.

---

# 7. États d'interface

Chaque écran gère :

□ Loading

□ Empty

□ Error

□ Success

□ No Results (si applicable)

□ Offline (si applicable)

---

# 8. Gestion des erreurs

□ Les erreurs API sont correctement affichées.

□ Les erreurs métier conservent leur signification.

□ Les erreurs techniques ne sont pas exposées à l'utilisateur.

---

# 9. Performance

□ Aucun appel API inutile.

□ Lazy Loading utilisé lorsque pertinent.

□ Aucun rechargement inutile.

□ Les listes importantes sont paginées si l'API le permet.

---

# 10. Sécurité

□ Les Guards sont respectés.

□ Les rôles sont correctement pris en compte.

□ Les données sensibles ne sont pas exposées.

□ Les autorisations ne sont pas reproduites côté frontend.

---

# 11. Documentation

□ Les hypothèses sont documentées.

□ Les décisions importantes sont documentées.

□ Les limitations sont documentées.

---

# 12. Tests

□ Les tests prévus sont présents.

□ Les comportements critiques sont couverts.

□ Les tests passent.

---

# 13. Expérience utilisateur

□ Les parcours sont fluides.

□ Les formulaires sont ergonomiques.

□ Les messages sont compréhensibles.

□ Les confirmations sont pertinentes.

---

# 14. Démonstration Hackathon

□ Les fonctionnalités MVP sont opérationnelles.

□ Les fonctionnalités premium sont visibles.

□ Les KPI sont fonctionnels.

□ Les cartes sont opérationnelles.

□ Les graphiques sont lisibles.

□ Le prototype est démontrable sans erreur bloquante.

---

# Validation finale

Le livrable est accepté uniquement si :

* tous les critères obligatoires sont validés ;
* aucune anomalie bloquante n'est ouverte ;
* les anomalies majeures sont connues et documentées.

---

# Rapport

À la fin de chaque revue, produire un résumé comprenant :

## Résultat

* Conforme
* Conforme avec réserves
* Non conforme

## Forces

Lister les points positifs.

## Anomalies

Lister les anomalies classées par gravité.

## Recommandations

Lister les actions à réaliser avant validation.

---

# Definition of Done

Une revue est terminée lorsque :

* toute la checklist a été parcourue ;
* chaque point possède un statut ;
* les anomalies sont documentées ;
* une décision de validation est prise ;
* le rapport final est produit.
