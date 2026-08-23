# PROJECT RULES — Backend API

Version : 1.0

---

# Objectif

Définir les règles de consommation de l'API Laravel.

Le backend constitue l'unique source de vérité métier.

Le frontend ne doit jamais modifier ou réinterpréter les règles métier.

---

# Principe fondamental

Le backend décide.

Le frontend affiche.

Toute logique métier appartient au backend.

---

# Source de vérité

Les sources officielles sont, dans l'ordre :

1. Backend Laravel
2. Documentation Swagger/OpenAPI
3. Documentation produite dans `docs/`

En cas de contradiction :

Le code du backend prévaut.

---

# Endpoints

Utiliser uniquement les endpoints existants.

Ne jamais :

* inventer un endpoint ;
* modifier une URI ;
* changer une méthode HTTP.

Si un endpoint manque :

* documenter le besoin ;
* proposer un nouvel endpoint ;
* attendre validation.

---

# Contrats API

Le frontend doit respecter strictement :

* les paramètres ;
* les validations ;
* les types ;
* les réponses ;
* les codes HTTP.

Ne jamais modifier le contrat côté frontend.

---

# Authentification

Toute authentification doit utiliser le mécanisme défini par le backend.

Ne jamais :

* stocker un mot de passe ;
* contourner l'authentification ;
* conserver un token de manière non prévue par l'architecture.

---

# Autorisation

Le frontend ne décide jamais des permissions.

Les contrôles côté frontend servent uniquement à améliorer l'expérience utilisateur.

Le backend reste responsable de toutes les autorisations.

---

# Logique métier

Le frontend ne doit jamais :

* calculer les points ;
* recalculer les statistiques ;
* modifier les statuts ;
* appliquer des règles métier.

Ces traitements appartiennent exclusivement au backend.

---

# Validation

Les validations métier proviennent du backend.

Le frontend peut ajouter :

* validation de format ;
* validation de saisie ;
* validation ergonomique.

Il ne doit jamais remplacer les validations serveur.

---

# Gestion des erreurs

Respecter les réponses du backend.

Pour chaque erreur :

* conserver le code HTTP ;
* conserver le message métier lorsque cela est approprié ;
* adapter uniquement la présentation.

Ne jamais masquer une erreur métier.

---

# Pagination

Lorsque l'API fournit une pagination :

* l'utiliser ;
* ne jamais charger l'ensemble des données pour paginer côté frontend.

---

# Recherche

Si l'API fournit un mécanisme de recherche :

* l'utiliser.

Ne pas reproduire une recherche complexe côté frontend.

---

# Tri

Utiliser les mécanismes de tri proposés par l'API.

Ne pas retraiter les données inutilement.

---

# Filtres

Les filtres doivent privilégier les capacités offertes par le backend.

---

# Upload

Respecter :

* le format attendu ;
* les tailles maximales ;
* les types de fichiers autorisés.

Ne jamais modifier les contraintes serveur.

---

# Géolocalisation

Les coordonnées reçues de l'API sont considérées comme exactes.

Ne jamais les corriger automatiquement.

---

# Dates

Les dates doivent être interprétées conformément au format renvoyé par l'API.

Éviter toute transformation irréversible.

---

# Cache

Le frontend peut mettre en cache des données uniquement lorsque cela ne modifie pas le comportement métier.

Le cache ne doit jamais provoquer l'affichage d'informations incohérentes.

---

# États

Chaque appel API doit prévoir :

* Loading
* Success
* Empty
* Error

Tous ces états doivent être gérés explicitement.

---

# Logging

Les erreurs techniques peuvent être journalisées.

Les données sensibles ne doivent jamais être enregistrées dans les logs du navigateur.

---

# Évolutions

Lorsqu'une évolution backend est jugée nécessaire :

* documenter le besoin ;
* expliquer la valeur métier ;
* proposer un nouveau contrat API.

Ne jamais modifier un endpoint existant sans validation.

---

# Interdictions

Il est interdit de :

* inventer un endpoint ;
* modifier un contrat API ;
* déplacer une logique métier dans Angular ;
* recalculer une donnée métier ;
* ignorer une erreur serveur ;
* contourner une Policy ou une autorisation.

---

# Definition of Done

Une intégration API est considérée comme terminée lorsque :

* seuls des endpoints existants sont utilisés ;
* les contrats API sont respectés ;
* les erreurs sont correctement gérées ;
* aucune logique métier n'a été déplacée vers le frontend ;
* tous les états d'interface sont pris en charge ;
* l'implémentation est conforme aux conventions du projet.
