# PROJECT RULES — Angular Guidelines

Version : 1.0

---

# Objectif

Définir les conventions Angular obligatoires pour l'ensemble du projet.

Tous les développeurs Frontend doivent respecter ces règles.

---

# Version

Angular : 22

Utiliser exclusivement les fonctionnalités modernes d'Angular.

---

# Architecture

Le projet suit une architecture **Feature-Based**.

Structure principale :

* core/
* shared/
* layouts/
* features/
* assets/
* environments/

Chaque fonctionnalité appartient à une seule Feature.

---

# Standalone Components

Tous les composants doivent être **Standalone**.

Les NgModules sont interdits, sauf nécessité exceptionnelle explicitement justifiée.

---

# Découpage

Chaque écran doit être composé de composants plus petits.

Privilégier :

* Smart Components
* Presentational Components

Éviter les composants de plusieurs centaines de lignes.

---

# Signals

Les Angular Signals constituent la solution par défaut pour la gestion d'état locale.

Utiliser RxJS uniquement lorsque cela est nécessaire :

* HTTP
* Streams
* WebSocket
* Interop Angular

Ne pas convertir inutilement Signals en Observables.

---

# Injection de dépendances

Utiliser la fonction `inject()` plutôt que l'injection par constructeur lorsque cela améliore la lisibilité.

Les services doivent rester spécialisés.

---

# Routing

Utiliser :

* Lazy Loading
* Route Guards
* Role Guards
* Routes typées lorsque possible

Le routage doit suivre les parcours définis dans `docs/02-design/navigation.md`.

---

# HTTP

Tous les appels API passent par :

* HttpClient
* Services dédiés
* Interceptors

Les composants ne doivent jamais appeler directement HttpClient.

---

# Gestion des erreurs

Les erreurs HTTP sont centralisées via les Interceptors.

Les erreurs métier sont affichées à l'utilisateur sans être modifiées dans leur signification.

Les composants ne doivent pas contenir une logique complexe de traitement des erreurs.

---

# Modèles

Toutes les réponses API doivent être représentées par des interfaces ou types TypeScript.

Éviter l'utilisation de `any`.

---

# Services

Chaque service a une responsabilité unique.

Exemples :

* AuthService
* UserService
* ReportService
* DashboardService

Éviter les services "fourre-tout".

---

# Shared

Le dossier `shared/` contient uniquement :

* composants réutilisables ;
* directives ;
* pipes ;
* helpers ;
* utilitaires.

Aucune logique métier.

---

# Core

Le dossier `core/` contient :

* authentification ;
* configuration ;
* interceptors ;
* guards ;
* services techniques ;
* gestion de session.

Aucune fonctionnalité métier.

---

# Features

Chaque fonctionnalité possède son propre dossier.

Exemple :

features/

* citizen/
* agent/
* admin/

Les fonctionnalités ne doivent pas dépendre directement les unes des autres.

---

# Composants UI

Tous les composants UI doivent provenir du Design System.

Il est interdit de recréer :

* Button
* Input
* Modal
* Card
* Badge
* Table
* Snackbar
* etc.

---

# Responsive

Citizen

→ Mobile First

Agent

→ Mobile First

Admin

→ Desktop First

Le responsive est obligatoire.

---

# Accessibilité

Respecter les bonnes pratiques :

* navigation clavier ;
* libellés explicites ;
* contraste suffisant ;
* structure sémantique.

---

# Performance

Privilégier :

* Lazy Loading ;
* OnPush si pertinent ;
* Signals ;
* `track` dans les boucles ;
* limitation des re-rendus.

Éviter les optimisations prématurées qui nuisent à la lisibilité.

---

# Tests

Les composants et services critiques doivent être testés selon les conventions du projet.

Les tests doivent vérifier les comportements, pas les détails d'implémentation.

---

# Documentation

Toute décision technique inhabituelle doit être documentée.

Les hypothèses doivent être clairement identifiées.

---

# Interdictions

Il est interdit de :

* utiliser `any` sans justification ;
* appeler directement l'API depuis un composant ;
* dupliquer un composant Shared ;
* déplacer une logique métier dans le frontend ;
* modifier l'architecture sans validation.

---

# Definition of Done

Une implémentation Angular est terminée lorsque :

* elle respecte cette convention ;
* elle est conforme aux maquettes Figma ;
* elle consomme uniquement les endpoints existants ;
* elle est fortement typée ;
* elle est responsive ;
* elle est maintenable ;
* elle ne crée aucune régression.
