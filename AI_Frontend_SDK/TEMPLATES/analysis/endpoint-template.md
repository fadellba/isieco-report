# Endpoint Documentation Template

---

# Informations générales

## Nom

<!-- Nom fonctionnel du endpoint -->

---

## URI

<!-- Exemple : /api/reports -->

---

## Méthode HTTP

<!-- GET | POST | PUT | PATCH | DELETE -->

---

## Description

<!-- Description courte de l'objectif du endpoint -->

---

# Authentification

Authentification requise :

* Oui
* Non

---

# Autorisation

Rôles autorisés :

* Citizen
* Agent
* Administrator

Préciser les permissions ou Policies appliquées.

---

# Paramètres

## Path Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |

---

## Query Parameters

| Nom | Type | Obligatoire | Description |
| --- | ---- | ----------- | ----------- |

---

## Request Body

| Champ | Type | Obligatoire | Validation | Description |
| ----- | ---- | ----------- | ---------- | ----------- |

---

# Validation

Lister toutes les règles de validation appliquées par le backend.

Exemple :

* required
* string
* integer
* exists
* enum
* min
* max

Ne jamais interpréter les validations.

---

# Réponse

## Succès

### HTTP Status

<!-- Exemple : 200 -->

### Corps de la réponse

```json
{
  "..."
}
```

Décrire chaque propriété importante.

---

# Erreurs possibles

| HTTP | Exception | Cause | Message |
| ---- | --------- | ----- | ------- |

Inclure uniquement les erreurs réellement observées dans le backend.

---

# Règles métier

Lister toutes les règles métier appliquées avant ou pendant l'exécution du endpoint.

Ne jamais faire de supposition.

---

# Services impliqués

Lister les Services appelés.

---

# Repositories impliqués

Lister les Repositories utilisés.

---

# Resources

Lister les API Resources utilisées.

---

# DTO

Lister les DTO impliqués.

---

# Événements

Lister les Events déclenchés.

---

# Notifications

Lister les Notifications envoyées.

---

# Transactions

Indiquer si une transaction base de données est utilisée.

---

# Journalisation

Décrire les logs produits, si applicable.

---

# Consommation Frontend

Écrans concernés :

* Citizen
* Agent
* Admin

Fonctionnalités utilisant ce endpoint :

* ...

---

# Dépendances

Lister les autres endpoints ou traitements dont dépend celui-ci.

---

# Références

Controller :

Service :

Repository :

Request :

Policy :

Resource :

Model :

Exception :

Tests :

---

# Notes

Informations complémentaires.

Uniquement des faits observés.

---

# Statut

* Documenté
* Vérifié
* À revoir

---

# Dernière vérification

Date :

Auteur :

Version :
