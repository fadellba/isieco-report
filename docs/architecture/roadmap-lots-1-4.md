# Feuille de route ISIECO — Lots 1 à 4

**Date de référence :** 13 novembre 2026  
**Branche de référence :** `main`  
**Révision fonctionnelle de référence :** [`652d16d56b0e7898b639ca09a822a35de5fb2e3b`](https://github.com/fadellba/isieco-report/commit/652d16d56b0e7898b639ca09a822a35de5fb2e3b). Les commits suivants PR #97/#99 ne modifient que la documentation.

Ce document regroupe les travaux prioritaires en quatre lots cohérents. Il distingue explicitement une fonctionnalité présente dans le code, une validation attestée et un travail encore planifié. Une issue ouverte ou un build vert ne vaut pas livraison.

## Synthèse du statut

| Lot | Périmètre | Statut constaté | Suivi GitHub |
|---|---|---|---|
| 1 | Documentation et état réel du dépôt | Réconciliation de base fusionnée via PR #91 ; présente mise à jour synchronise la documentation avec PR #94, PR #96, PR #98 et les preuves CI/staging/production du commit courant | Ce document, [état des livrables](etat-des-livrables.md) |
| 2 | Sauvegardes, restauration et préparation à la production | Non clôturé : restauration indépendante PostgreSQL + Storage non démontrée ; staging en retard de trois migrations | [#54](https://github.com/fadellba/isieco-report/issues/54), [#51](https://github.com/fadellba/isieco-report/issues/51) |
| 3 | Mobile hors ligne, carte native et notifications | Trois capacités absentes du code ; aucun test matériel attesté | [#87](https://github.com/fadellba/isieco-report/issues/87), [#88](https://github.com/fadellba/isieco-report/issues/88), [#90](https://github.com/fadellba/isieco-report/issues/90), recette [#53](https://github.com/fadellba/isieco-report/issues/53) |
| 4 | Cartographie et actualisation du centre Web | Viewport/pagination livrés via PR #94 ; SSE livré via PR #96 ; purge sur révocation livrée via PR #98 ; activation staging et performance restent à valider | [#89](https://github.com/fadellba/isieco-report/issues/89) |

## Lot 1 — Réconcilier la documentation avec le dépôt

**Objectif :** faire de la documentation un reflet vérifiable du code et des environnements réellement observés.

### Travaux
- Aligner le README racine, l'index documentaire, l'état des livrables et le blueprint UX sur le commit courant.
- Documenter le nombre exact de migrations suivies dans Git et distinguer ce nombre du nombre réellement appliqué en staging.
- Corriger les statuts de PR et de commits ; la PR #86 est fusionnée dans `main`.
- Décrire précisément l'état de la carte Web : viewport/pagination livrés via PR #94, SSE via PR #96, purge sur révocation via PR #98, polling de secours de 60 secondes et activation staging non attestée.
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
- Le workflow staging de la PR #96 [#43516567399](https://github.com/fadellba/isieco-report/actions/runs/43516567399) s'est arrêté avant Render : 14 migrations sont versionnées dans Git, 11 sont appliquées en staging et trois restent en attente, dont la migration du trigger SSE.

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

## Lot 4 — Cartographie et actualisation du centre de commandement Web

**Objectif :** rendre la carte limitée à la zone visible, paginée, réactive et sécurisée, sans suivi GPS des agents.

### Livré dans main — PR #94, PR #96 et PR #98

**Viewport et pagination — PR #94**
- Le client calcule les bornes géographiques visibles, attend 350 ms après un déplacement/zoom, puis appelle l'API avec les quatre bornes.
- L'API valide bornes et plages, prend en charge les viewports traversant l'antiméridien et rejette les valeurs invalides en HTTP 400.
- Dossiers et signalements sont filtrés en base avant pagination.
- Pagination keyset, curseur opaque lié au viewport, ordre déterministe, lookahead `limit + 1`, total viewport calculé sans curseur et recalculé à chaque requête.
- Plafond serveur de 250 résultats/page, bouton « Charger les éléments suivants » et protection contre les réponses HTTP obsolètes.

**Actualisation événementielle — PR #96**
- Le ledger append-only `audit.evenement_metier` déclenche `audit.notify_command_center_change()`.
- Après insertion du ledger, le trigger émet `pg_notify('command_center_changed', 'invalidate')` pour les entités autres que `UTILISATEUR`. Le payload est constant et ne transmet aucune donnée métier.
- `CommandCenterEventsService` maintient une connexion PostgreSQL dédiée, exécute `LISTEN command_center_changed`, relaie un message SSE et reconnecte avec backoff exponentiel de 1 à 30 s.
- `GET /api/v1/command-center/events` est protégé par `SupabaseAuthGuard` et `RolesGuard`, envoie des heartbeats toutes les 15 s et renouvelle chaque connexion après 60 s.
- À la connexion initiale ou après reconnexion du listener, un événement `listener_connected` provoque aussi un rafraîchissement.
- Le Web récupère un jeton Supabase à chaque reconnexion, consomme SSE, regroupe les invalidations sur 250 ms et garde le polling REST 60 s comme fallback.
- Aucun GPS agent ni permission de localisation mobile n'est ajouté.

**Révocation d'accès — PR #98**
- Sur HTTP 401/403 du SSE, le client invalide les requêtes en cours, vide la carte et la sélection, rafraîchit le profil et laisse `ProtectedRoute` retirer le centre si le rôle n'est plus actif.

La CI PR #96 [#43516567328](https://github.com/fadellba/isieco-report/actions/runs/43516567328), PR #98 [#43530017692](https://github.com/fadellba/isieco-report/actions/runs/43530017692) et main [#43530992124](https://github.com/fadellba/isieco-report/actions/runs/43530992124) a réussi.

### État de déploiement
La migration `20261113215000_command_center_event_notifications` est versionnée mais non appliquée au staging. Sur les 14 migrations Git, 11 sont enregistrées ; trois sont en attente :
- `20261109100000_business_audit_event_order`
- `20261109110000_backfill_business_audit_event_sequence_order`
- `20261113215000_command_center_event_notifications`

Le workflow [Staging Forward Deploy #43516567399](https://github.com/fadellba/isieco-report/actions/runs/43516567399) échoue au contrôle de cohérence avant Render/readiness/E2E. Le flux SSE est livré dans le code, mais l'activation du trigger en staging n'est pas attestée.

### Travaux restants — issue #89
1. **Activation staging :** réconcilier les trois migrations après validation des sauvegardes/restauration et autorisation d'exploitation.
2. **Listener PostgreSQL :** valider `DIRECT_URL` (ou connexion session dédiée), TLS et reconnexion sur staging ; vérifier le trigger après migration contrôlée.
3. **Performance :** mesurer plans SQL et latence sur un dataset représentatif ; n'ajouter des index géographiques/PostGIS que sur preuve.
4. **Clustering/densité :** tester lisibilité, taille de réponse et navigation sur zones chargées.
5. **Filtres métier :** vérifier si statut/priorité/période doivent être appliqués côté serveur avant pagination.

### Critères de sortie restants
- Les trois migrations sont appliquées après validation des sauvegardes/restauration et autorisation d'exploitation.
- Le trigger et le listener fonctionnent sur staging ; le client recharge l'API après reconnexion et le polling reste opérationnel.
- Une révocation de rôle ne laisse pas les données périmées visibles après HTTP 401/403 ; la connexion SSE réévalue l'accès au plus tard toutes les 60 s.
- Les plans SQL, latences et comportements de densité sont mesurés sur un dataset représentatif.
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
