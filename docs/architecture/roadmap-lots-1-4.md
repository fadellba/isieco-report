# Feuille de route ISIECO — Lots 1 à 4

**Date de référence :** 13 novembre 2026  
**Branche de référence :** `main`  
**Commit vérifié :** [`dab3b2dc3aecc140709beae91cefa1525edec0be`](https://github.com/fadellba/isieco-report/commit/dab3b2dc3aecc140709beae91cefa1525edec0be)

Ce document regroupe les travaux prioritaires en quatre lots cohérents. Il distingue explicitement une fonctionnalité présente dans le code, une validation attestée et un travail encore planifié. Une issue ouverte ou un build vert ne vaut pas livraison.

## Synthèse du statut

| Lot | Périmètre | Statut constaté | Suivi GitHub |
|---|---|---|---|
| 1 | Documentation et état réel du dépôt | Réconciliation de base fusionnée via PR #91 ; présente mise à jour synchronise la documentation avec PR #94 et les preuves CI/staging/production du commit de fusion | Ce document, [état des livrables](etat-des-livrables.md) |
| 2 | Sauvegardes, restauration et préparation à la production | Non clôturé : restauration indépendante PostgreSQL + Storage non démontrée ; staging en retard de deux migrations | [#54](https://github.com/fadellba/isieco-report/issues/54), [#51](https://github.com/fadellba/isieco-report/issues/51) |
| 3 | Mobile hors ligne, carte native et notifications | Trois capacités absentes du code ; aucun test matériel attesté | [#87](https://github.com/fadellba/isieco-report/issues/87), [#88](https://github.com/fadellba/isieco-report/issues/88), [#90](https://github.com/fadellba/isieco-report/issues/90), recette [#53](https://github.com/fadellba/isieco-report/issues/53) |
| 4 | Cartographie et actualisation du centre Web | Viewport + pagination keyset livrés via PR #94 ; actualisation événementielle et validation de performance restent ouvertes | [#89](https://github.com/fadellba/isieco-report/issues/89) |

## Lot 1 — Réconcilier la documentation avec le dépôt

**Objectif :** faire de la documentation un reflet vérifiable du code et des environnements réellement observés.

### Travaux
- Aligner le README racine, l'index documentaire, l'état des livrables et le blueprint UX sur le commit courant.
- Documenter le nombre exact de migrations suivies dans Git et distinguer ce nombre du nombre réellement appliqué en staging.
- Corriger les statuts de PR et de commits ; la PR #86 est fusionnée dans `main`.
- Décrire précisément l'état de la carte Web : filtre viewport et pagination keyset livrés par PR #94, limite de 250 par page, polling périodique et événements non livrés.
- Documenter les absences Mobile : mode hors ligne, carte native agent et notifications métier.
- Remplacer toute formulation qui pourrait suggérer un suivi GPS des agents par une règle explicite d'absence de télémétrie.
- Relier chaque écart à une issue de suivi et conserver les preuves (SHA, run, appareil, résultat) à proximité de la décision.

### Source de vérité et règles
- `prisma/schema.prisma` et `prisma/migrations/` : modèle et historique versionné.
- Le workflow GitHub Actions : preuve d'un job exécuté sur un SHA précis, pas preuve automatique de déploiement ou de validation métier.
- Les issues : exigences et critères d'acceptation, pas preuve d'implémentation.
- Les résultats de staging et de recette physique : preuves séparées, datées et associées à un SHA exact.

### Critère de sortie
Un lecteur peut identifier le commit étudié, les migrations présentes et appliquées, les fonctionnalités réelles, les validations effectuées, les limites et les travaux restants sans déduire un statut à partir d'une ancienne PR.

## Lot 2 — Résilience, sauvegardes et préparation à la production

**Objectif :** démontrer qu'un état de données et ses médias peuvent être récupérés à partir d'une sauvegarde définie, dans une cible isolée, avec une preuve reproductible.

### Situation observée
- L'issue [#54](https://github.com/fadellba/isieco-report/issues/54) reste ouverte.
- Le workflow de répétition `staging-restore-drill.yml` copie la source staging active vers un PostgreSQL éphémère et un bucket privé temporaire. C'est un test de transfert/intégrité utile, mais il ne restaure pas une sauvegarde historique indépendante et ne mesure pas le RPO d'un point de sauvegarde.
- Les sauvegardes gérées Supabase et PITR dépendent d'une offre payante selon le cadrage courant. Aucune montée de plan ou dépense n'est autorisée implicitement par cette feuille de route.
- Le workflow staging du commit de fusion [#43513727249](https://github.com/fadellba/isieco-report/actions/runs/43513727249) s'est arrêté avant Render parce que deux migrations présentes dans Git ne sont pas appliquées au staging.

### Travaux
1. Inventorier les sources de sauvegarde PostgreSQL et Storage réellement disponibles, leur fréquence, leur date, leur rétention et les responsabilités.
2. Choisir une voie compatible avec le plan et la décision budgétaire : export logique PostgreSQL daté, sauvegarde distincte des objets du bucket privé et manifeste d'intégrité.
3. Obtenir l'autorisation d'exploitation avant toute copie de données staging vers un runner ou une cible temporaire.
4. Restaurer PostgreSQL dans une cible isolée et les médias dans un bucket privé séparé, sans écraser staging ni production.
5. Vérifier contraintes, volumes par table, références photo, existence et empreinte SHA-256 des objets, droits d'accès et génération de nouvelles URLs signées.
6. Consigner les timestamps source, les temps de sauvegarde/restauration, le RPO et le RTO observés, ainsi que les limites non testées.
7. Faire examiner les résultats par une personne indépendante de l'exécution et conserver uniquement des preuves expurgées.
8. Une fois les prérequis de sauvegarde satisfaits, appliquer les migrations manquantes via le workflow contrôlé de migration staging, puis relancer le déploiement exact et les tests E2E.

### Critères de sortie
- Restauration PostgreSQL et Storage démontrée depuis des sauvegardes identifiées et datées.
- Références SQL et objets binaires cohérents ; contrôles d'accès privés maintenus.
- RPO/RTO mesurés ou explicitement déclarés non mesurables.
- Rapport horodaté, SHA testé et revue indépendante consignés.
- Le workflow staging passe la porte `prisma migrate status`, déploie le SHA exact et réussit readiness, smoke tests et E2E.
- Les garde-fous de production restent actifs jusqu'à une approbation séparée. L'issue [#51](https://github.com/fadellba/isieco-report/issues/51) ne peut être clôturée sur la seule base d'une CI verte.

## Lot 3 — Compléter les capacités de l'application mobile

**Objectif :** rendre l'application utile sur le terrain, y compris en réseau dégradé, sans réduire la sécurité des données ou les contrôles serveur.

### 3.1 Mode hors ligne sécurisé — issue #87
- Stockage local chiffré, clé protégée par le stockage sécurisé natif.
- Cache minimal des missions récentes, isolé par utilisateur, avec TTL, quota, version de schéma et purge.
- Brouillons et médias persistés dans l'espace privé durable de l'application.
- Synchronisation explicite et idempotente à la reconnexion.
- Revalidation serveur des rôles, appartenance à l'équipe, affectation et état de l'intervention avant toute écriture.
- Aucune transition irréversible (accepter/refuser, démarrer, soumettre) rejouée automatiquement depuis un cache périmé.
- Résolution des conflits sans écraser les données serveur ; conservation des saisies locales en cas d'échec.

### 3.2 Carte native des missions — issue #88
- Choisir un fournisseur et une bibliothèque compatibles Expo SDK 57 / React Native 0.86.3, après examen des coûts, restrictions, clés et builds natives.
- Utiliser les coordonnées réelles déjà exposées par les réponses d'affectation agent ; ne créer aucun point fictif pour une mission sans coordonnées.
- Afficher exclusivement les missions autorisées à l'agent connecté, avec filtres équipe/état, détail et lancement d'itinéraire.
- Garder la liste comme alternative si la carte ne charge pas.
- Ne pas ajouter de permission de localisation pour suivre les agents, de GPS en arrière-plan ou de télémétrie.

### 3.3 Notifications métier — issue #90
- Comparer les solutions compatibles Expo et documenter leurs coûts/contraintes avant de choisir le fournisseur.
- Définir les événements et destinataires métier côté serveur.
- Enregistrer, faire tourner et révoquer les jetons d'appareil côté API.
- Assurer idempotence, retries et déduplication via outbox transactionnelle ou mécanisme équivalent justifié.
- Ne pas exposer de données sensibles ou d'URL signée dans les payloads affichés sur écran verrouillé.
- Recharger chaque détail depuis l'API à l'ouverture avec une authentification et une autorisation actuelles.
- Gérer permission refusée, préférences, réception au premier plan, ouverture depuis notification et jeton invalide.

### 3.4 Recette physique — issue #53
Après intégration des fonctionnalités, produire une build de test liée au SHA exact, calculer son checksum et exécuter la matrice Android/iOS réelle. Les tests doivent couvrir le mode hors ligne, redémarrage forcé, conflits de synchronisation, permissions de notifications, réception et ouverture d'une notification, carte native, permissions refusées, photos, URLs signées et séparation inter-comptes. Un cas non exécuté est « Non testé », jamais « Réussi ».

### Critères de sortie du lot 3
- Hors ligne : données locales chiffrées, persistance après redémarrage, synchronisation sans doublon et conflits explicites.
- Carte : uniquement des points métier réels et autorisés, sans positions d'agents.
- Notifications : envoi fiable, payload minimisé et ouverture protégée par l'API.
- Android et iOS : rapports de recette sur appareils physiques, associés au commit et à la version exacts.

## Lot 4 — Cartographie du centre de commandement Web

**Objectif :** rendre l'exploration cartographique scalable, limitée à la zone visible et réactive, sans suivi GPS des agents.

### Livré dans main — PR #94 (commit de fusion `dab3b2d`)
- **Viewport :** le client calcule les bornes géographiques visibles, attend 350 ms après un déplacement/zoom, puis appelle l'API avec les quatre bornes.
- **Validation API :** bornes complètes et plages latitude/longitude vérifiées ; viewports traversant l'antiméridien pris en charge ; valeurs vides/non numériques et latitudes inversées rejetées en HTTP 400.
- **Filtrage base :** dossiers et signalements sont filtrés au niveau Prisma avant récupération des pages.
- **Pagination keyset :** curseur opaque et validé, lié au viewport initial ; tri déterministe date/type/identifiant ; deux flux (dossiers et signalements) récupèrent `limit + 1` pour calculer `hasMore`.
- **Stabilité :** le total du viewport n'intègre pas le curseur et reste stable entre pages ; dates de soumission nulles traitées en fin de flux ; curseur rejeté s'il est réutilisé sur une autre zone.
- **Interface :** bouton de chargement des pages suivantes ; protection contre les réponses HTTP obsolètes ; maximum serveur de 250 éléments par page.
- **Confidentialité :** aucune permission, télémétrie, historique ou position GPS d'agent ajouté.

La CI de PR #94 [#43512678022](https://github.com/fadellba/isieco-report/actions/runs/43512678022) et la CI du commit de fusion [#43513727264](https://github.com/fadellba/isieco-report/actions/runs/43513727264) ont réussi : typecheck, tests applicatifs, builds Web/API/Mobile et génération/validation OpenAPI.

### Travaux restants — issue #89
1. **Actualisation événementielle :** étudier SSE/WebSocket ou une solution adaptée, sélectionner les événements métier, sécuriser les abonnements, gérer reconnexion, rattrapage et fallback polling.
2. **Performance :** mesurer les plans SQL et la latence sur un dataset représentatif ; n'ajouter des index spatiaux ou PostGIS que si les mesures le justifient.
3. **Clustering et densité :** définir un seuil d'agrégation et tester lisibilité, pagination et volume sur des zones denses.
4. **Filtres métier serveur :** vérifier les besoins de filtres de statut/priorité/période et les combiner au viewport si nécessaire ; les filtres Web de type/recherche actuels opèrent sur les entités déjà reçues.

### Critères de sortie restants
- Les plans SQL et temps de réponse sont mesurés sur un jeu représentatif.
- Le clustering est validé sur des cas de densité réalistes.
- Les mises à jour métier pertinentes sont propagées par événement avec reconnexion/rattrapage ; le fallback fonctionne.
- Les événements ne divulguent aucune donnée non autorisée.
- Aucun emplacement personnel d'agent n'est collecté, stocké ou diffusé.

## Ordre et dépendances

1. **Lot 1** fournit la référence documentaire commune et le registre des preuves.
2. **Lot 2** doit être validé avant une migration distante à risque et avant toute décision de mise en production.
3. **Lot 3** et **Lot 4** peuvent être développés en parallèle une fois leurs contrats API et leurs règles de confidentialité validés.
4. La recette physique de l'issue #53 intervient après l'intégration des capacités mobiles #87, #88 et #90.
5. La production reste bloquée par les portes de sécurité et de reprise de l'issue #51.

## Règle de statut

- **Implémenté** : le code existe sur un SHA identifié.
- **CI validée** : les jobs du SHA concerné ont réussi.
- **Déployé** : le service cible sert effectivement ce SHA.
- **Recetté** : le parcours est exécuté sur l'environnement et les appareils prévus.
- **Validé indépendamment** : la preuve a été examinée par une personne distincte de l'exécutant.

Ces états ne sont pas interchangeables. Ne jamais fermer une issue de validation sur la base d'une implémentation ou d'une CI uniquement.
