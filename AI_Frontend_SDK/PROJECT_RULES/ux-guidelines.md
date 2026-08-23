# PROJECT RULES — UX Guidelines

Version : 1.0

---

# Objectif

Définir les règles d'expérience utilisateur applicables à l'ensemble du projet.

Ces règles s'appliquent aux trois espaces :

* Citizen
* Agent
* Admin

L'objectif est de proposer une application intuitive, rapide et cohérente.

---

# Principes

Chaque écran doit répondre à ces principes :

* Clarté
* Simplicité
* Rapidité
* Cohérence
* Accessibilité

L'utilisateur ne doit jamais avoir à deviner quoi faire.

---

# Hiérarchie visuelle

Chaque écran doit présenter clairement :

* une action principale ;
* des actions secondaires ;
* des informations importantes ;
* des informations complémentaires.

Les éléments critiques doivent être immédiatement visibles.

---

# Navigation

La navigation doit être :

* prévisible ;
* cohérente ;
* peu profonde.

Limiter le nombre d'actions nécessaires pour atteindre un objectif.

Éviter les impasses.

---

# Mobile First

Pour Citizen et Agent :

* navigation à une main ;
* boutons facilement accessibles ;
* zones tactiles adaptées ;
* interactions rapides.

Privilégier les gestes simples.

---

# Desktop First

Pour Admin :

* exploitation de l'espace disponible ;
* tableaux lisibles ;
* filtres visibles ;
* raccourcis d'accès.

Optimiser les tâches de gestion.

---

# Temps de réponse

Chaque interaction doit fournir un retour immédiat.

Prévoir :

* indicateurs de chargement ;
* animations discrètes ;
* confirmations visuelles.

L'utilisateur ne doit jamais se demander si une action est en cours.

---

# États d'interface

Chaque écran doit gérer explicitement :

* Loading
* Empty
* Error
* Success
* No Results
* Offline (si applicable)

Aucun écran ne doit rester vide sans explication.

---

# Formulaires

Les formulaires doivent :

* limiter le nombre de champs ;
* afficher les erreurs au bon endroit ;
* conserver les données saisies en cas d'erreur ;
* indiquer les champs obligatoires.

Ne jamais afficher une erreur uniquement après soumission si elle peut être détectée avant.

---

# Feedback utilisateur

Chaque action importante doit produire un retour clair.

Exemples :

* succès ;
* erreur ;
* suppression ;
* sauvegarde ;
* mise à jour.

Le feedback doit être court et compréhensible.

---

# Recherche

Lorsqu'une recherche est disponible :

* fournir un champ visible ;
* indiquer les filtres actifs ;
* permettre la réinitialisation des filtres.

---

# Tableaux

Les tableaux doivent permettre :

* tri ;
* pagination ;
* recherche ;
* filtres.

Afficher clairement le nombre de résultats.

---

# Cartes

Les cartes doivent :

* charger progressivement les données ;
* afficher une légende si nécessaire ;
* permettre les interactions prévues sans surcharge visuelle.

---

# Accessibilité

Respecter :

* navigation clavier lorsque pertinente ;
* contraste suffisant ;
* labels explicites ;
* ordre logique de lecture ;
* messages compréhensibles.

---

# Gestion des erreurs

Les erreurs doivent :

* expliquer le problème ;
* proposer une action lorsque possible ;
* conserver le contexte utilisateur.

Ne jamais afficher une erreur technique brute.

---

# Confirmation

Demander une confirmation uniquement pour les actions destructrices ou irréversibles.

Éviter les confirmations inutiles.

---

# Responsive

Le contenu doit rester utilisable sur toutes les tailles d'écran prévues.

Aucune fonctionnalité ne doit devenir inaccessible.

---

# Animations

Les animations doivent :

* être courtes ;
* renforcer la compréhension ;
* ne jamais ralentir l'utilisateur.

Éviter les animations décoratives excessives.

---

# Performance perçue

Améliorer la perception de vitesse grâce à :

* Skeleton Loaders ;
* Lazy Loading ;
* Chargement progressif ;
* Préchargement des données pertinentes.

---

# Cohérence

Les mêmes actions doivent produire les mêmes comportements dans toute l'application.

Les composants identiques doivent fonctionner de manière identique.

---

# Interdictions

Il est interdit de :

* masquer une action importante ;
* utiliser des comportements incohérents ;
* multiplier les confirmations inutiles ;
* changer le comportement d'un composant selon l'écran sans justification.

---

# Definition of Done

Une interface est considérée comme terminée lorsque :

* elle est intuitive ;
* tous les états sont gérés ;
* elle est responsive ;
* les retours utilisateur sont explicites ;
* les formulaires sont ergonomiques ;
* la navigation est fluide ;
* elle respecte les parcours définis dans la documentation fonctionnelle.
