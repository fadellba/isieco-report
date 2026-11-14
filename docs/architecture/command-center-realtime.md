# ADR — Actualisation événementielle du centre de commandement Web

**Statut :** décision mise en œuvre dans le code ; activation staging en attente  
**Date :** 13 novembre 2026  
**Issue :** [#89](https://github.com/fadellba/isieco-report/issues/89)  
**Mise en œuvre :** [PR #96](https://github.com/fadellba/isieco-report/pull/96), commit `c54765535cd269b3ed63dd846640fe1b91829ae8`  
**Périmètre :** invalidation du centre Web après mutation métier, sans diffuser les lignes d'audit ni des données personnelles.

## 1. Décision

**Conserver PostgreSQL LISTEN/NOTIFY + Server-Sent Events (SSE). Ne pas ajouter Supabase Realtime Broadcast pour le même flux.**

La fonctionnalité événementielle existe déjà dans `main` :
- trigger PostgreSQL après insertion dans `audit.evenement_metier` ;
- notification constante `command_center_changed / invalidate` ;
- listener PostgreSQL partagé dans l'API ;
- endpoint SSE protégé par authentification et rôles ;
- client Web qui recharge l'API après notification ;
- polling REST de 60 secondes en secours.

Le Broadcast Supabase a été examiné, mais il créerait un second canal de diffusion et introduirait de nouvelles policies/grants sur `realtime.messages` sans apporter de capacité indispensable au parcours actuel. Il n'est pas retenu. Aucune policy Realtime ou modification de grants n'est nécessaire pour le mécanisme SSE actuel.

## 2. Flux effectivement implémenté

### 2.1 Base de données

La migration `prisma/migrations/20261113215000_command_center_event_notifications/migration.sql` crée :

- `audit.notify_command_center_change()`, trigger function PL/pgSQL avec `search_path = pg_catalog` ;
- trigger `evenement_metier_command_center_notify`, `AFTER INSERT` sur `audit.evenement_metier` ;
- notification via `pg_catalog.pg_notify('command_center_changed', 'invalidate')` lorsque `NEW.entity_type <> 'UTILISATEUR'`.

Le trigger est exécuté dans la transaction métier. PostgreSQL ne délivre la notification aux listeners qu'après le commit. Le payload est une constante : aucun ID, numéro de séquence, champ `metadata`, motif, coordonnée ou donnée utilisateur n'est envoyé. Les événements de type `UTILISATEUR`, dont les événements de compte et de rôle, ne déclenchent pas d'invalidation cartographique.

La liste des codes métiers émis est centralisée dans `apps/api/src/infrastructure/audit/business-audit.ts`. Le trigger actuel filtre par `entity_type` et non par `action_code` : toutes les insertions du ledger hors `UTILISATEUR` déclenchent une invalidation. C'est volontairement simple et robuste ; si la fréquence devient excessive, mesurer puis introduire une liste blanche par `action_code` ou une coalescence.

### 2.2 API

`CommandCenterEventsService` :
- ouvre une connexion PostgreSQL dédiée avec `DIRECT_URL` en priorité, puis `DATABASE_URL` en fallback ;
- exécute `LISTEN command_center_changed` ;
- ne relaie que le canal attendu et le payload exact `invalidate` ;
- diffuse un message SSE constant `{ invalidated: true }` ;
- envoie un heartbeat toutes les 15 secondes ;
- reconnecte le listener après perte avec backoff exponentiel de 1 à 30 secondes ;
- ferme chaque flux SSE après 60 secondes.
- après la connexion initiale ou une reconnexion PostgreSQL réussie, émet aussi `command_center_changed` avec `{ reason: 'listener_connected' }` ; le client traite ce signal comme une invalidation et recharge la vue.

Le contrôleur expose `GET /api/v1/command-center/events` via `@Sse('events')`, protégé par `SupabaseAuthGuard` et `RolesGuard`. Les rôles autorisés sont :
`AGENT_QUALIFICATION`, `RESPONSABLE_TRAITEMENT`, `RESPONSABLE_AFFECTATION`, `VERIFICATEUR_CLOTURE`, `GESTIONNAIRE_REFERENTIEL` et `ADMINISTRATEUR_COMPTES`.

Le `RolesGuard` relit à chaque nouvelle connexion le compte actif et les affectations de rôles dont `date_debut` est passée et `date_fin` absente ou future. La durée de 60 secondes borne donc la durée d'une connexion établie avant une révocation de rôle.

### 2.3 Web

`OperationalCommandCenter` :
- récupère le jeton Supabase avant chaque connexion SSE ;
- lit `GET /api/v1/command-center/events` avec `Authorization: Bearer` et `Accept: text/event-stream` ;
- consomme uniquement l'événement `command_center_changed` ;
- traite aussi l'événement de connexion/récupération (`reason: 'listener_connected'`) comme un signal de refresh, afin de resynchroniser la carte après redémarrage du listener ;
- regroupe les invalidations rapprochées sur 250 ms puis recharge `GET /api/v1/command-center/overview` pour le viewport courant ;
- renouvelle la connexion à sa fermeture avec backoff exponentiel ;
- maintient un polling REST périodique de 60 secondes en fallback.

Les notifications ne sont pas un journal durable. Après une coupure, le client recharge l'API au lieu d'essayer de rejouer les événements perdus.

## 3. Déploiement et preuve

La PR #96 est fusionnée dans `main`. Sa CI [#43516567328](https://github.com/fadellba/isieco-report/actions/runs/43516567328) a réussi (typecheck, tests API, OpenAPI et builds Web/API/Mobile). La CI du commit courant `main` [#43516982237](https://github.com/fadellba/isieco-report/actions/runs/43530992124) a également réussi.

La migration du trigger est présente dans Git, mais le staging n'est pas au même niveau :
- 14 migrations versionnées dans Git ;
- 11 migrations enregistrées dans `public._prisma_migrations` ;
- trois migrations en attente : `20261109100000_business_audit_event_order`, `20261109110000_backfill_business_audit_event_sequence_order` et `20261113215000_command_center_event_notifications`.

Le workflow [Staging Forward Deploy #43516567399](https://github.com/fadellba/isieco-report/actions/runs/43516567399) échoue au contrôle de cohérence des migrations avant Render, readiness et E2E. Le flux SSE et son listener sont donc présents dans la source ; l'activation du trigger en staging n'est pas encore prouvée.

## 4. Sécurité et limites restantes

### 4.1 Révocation d'un rôle pendant une connexion active

Les autorisations sont réévaluées à chaque nouvelle connexion SSE, au plus tard après 60 secondes. En revanche, le client traitait jusqu'ici un HTTP 401/403 comme une erreur de transport, continuait ses tentatives et conservait les entités précédemment chargées en mémoire. Ce comportement doit être corrigé.

La correction livrée par [PR #98](https://github.com/fadellba/isieco-report/pull/98) (commit `652d16d`) :
- invalide les requêtes Web en cours ;
- vide les données de carte et la sélection ;
- rafraîchit le profil métier ;
- laisse les gardes de route retirer l'espace de supervision si le rôle n'est plus valide ;
- remonte le flux uniquement si l'accès reste autorisé.

### 4.2 Connexion PostgreSQL

Le listener doit utiliser une connexion de session dédiée. `DIRECT_URL` est privilégié ; le fallback `DATABASE_URL` n'est acceptable que si le mode de connexion supporte PostgreSQL `LISTEN` sur une session persistante. TLS et validation CA doivent être testés sur staging et production. Ne jamais logger la chaîne de connexion ni ses identifiants.

### 4.3 Notifications et confidentialité

- Le message reste une invalidation sans donnée métier.
- Les réponses sensibles sont toujours récupérées par l'API, qui réexécute les contrôles d'accès.
- Aucun GPS agent, identifiant d'agent, identifiant de dossier/signalement ou contenu du ledger n'est diffusé.
- Le trigger actuel exclut `entity_type = 'UTILISATEUR'` ; les événements non pertinents peuvent entraîner des refresh supplémentaires. Mesurer avant d'optimiser.
- Le polling 60 secondes reste le filet de sécurité si le listener, SSE ou le réseau est indisponible.

## 5. Tests et critères de sortie

Déjà couverts :
- test unitaire du listener PostgreSQL : seuls le bon canal et le payload exact sont relayés ;
- notification de connexion initiale et nettoyage du listener ;
- authentification et contrôle de rôles sur le contrôleur SSE via les guards existants ;
- CI PR #96 et CI du commit main vertes.

À valider après réconciliation des migrations :
- trigger émetteur actif après une mutation métier committée ;
- aucun message avant commit ou après rollback ;
- reconnexion après coupure du listener avec émission d'une invalidation ;
- TLS/connexion dédiée sur staging ;
- session expirée, compte suspendu, rôle expiré/révoqué : nouvelle connexion refusée et données Web purgées ;
- fallback polling lorsque SSE indisponible ;
- latence événement → refetch et fréquence d'invalidation sur données représentatives.

## 6. Hors périmètre

- Supabase Realtime Broadcast/Policies : non retenu, car le flux PostgreSQL LISTEN/NOTIFY + SSE est déjà implémenté.
- Diffusion de données métier, de lignes du ledger ou d'identifiants dans les messages : interdite.
- Télémétrie GPS continue ou historique de déplacement des équipes : interdits.

**État actuel :** SSE et le trigger sont livrés dans le dépôt. Leur activation staging attend les trois migrations. Le client purge les données du centre après HTTP 401/403 depuis la fusion de la PR #98. Aucun déploiement production n'est autorisé par ce document.
