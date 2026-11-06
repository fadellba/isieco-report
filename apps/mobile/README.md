# Application mobile ISI-Eco Report

Application React Native basée sur Expo SDK 57, destinée aux citoyens et aux agents de terrain.

## Versions et styles

- Expo SDK 57 / React Native 0.86.3 / React 19.2.3.
- NativeWind 4.2.7 + Tailwind CSS 3.4.17.
- Les classes utilitaires sont utilisées via la prop `className`.
- NativeWind 5 n'est pas utilisé car il est encore en release candidate.

Après installation des dépendances, vérifier l'alignement natif du SDK avec :

```bash
pnpm --filter @isieco/mobile exec expo install --fix
pnpm --filter @isieco/mobile exec expo install --check
```

## Démarrage

```bash
pnpm dev:mobile
```

L'authentification Supabase et le chargement du profil métier via l'API sont intégrés. L'accueil présente les espaces correspondant aux rôles `CITOYEN` et `AGENT_TERRAIN`.

## Parcours citoyen — Phase 18 intégrée

- `/(citizen)/reports` : liste paginée et suivi des seuls signalements du compte connecté ;
- `/(citizen)/reports/new` : dépôt idempotent avec description obligatoire, date de constat facultative, description du lieu et coordonnées manuelles facultatives ;
- `/(citizen)/reports/[id]` : détail propriétaire, catégories qualifiées, demandes de complément et réponses.

La soumission réutilise `POST /api/v1/reports` et l'en-tête `Idempotency-Key`. La clé est conservée lors d'une nouvelle tentative avec un contenu inchangé et renouvelée lorsque le formulaire change. Les demandes et réponses réutilisent les endpoints Reports existants. Aucun endpoint de référentiel réservé au gestionnaire n'est appelé par le citoyen.

## Parcours Agent terrain — Phase 19 intégrée

La PR #24 a intégré `/(agent)/missions` :

- découverte des équipes actives auxquelles appartient le compte connecté via `GET /api/v1/interventions/my-teams` ;
- consultation des affectations et interventions de l'équipe sélectionnée ;
- acceptation ou refus motivé d'une affectation ;
- démarrage d'une intervention acceptée ;
- saisie du compte rendu et du résultat terrain ;
- motif obligatoire si le résultat est `PARTIELLE` ou `IMPOSSIBLE` ;
- démarrage d'une reprise uniquement après une décision de vérification `REPRISE`.

Le formulaire de compte rendu n'est affiché que pour l'agent auteur de l'intervention. L'API recontrôle l'appartenance, l'auteur et les états métier à chaque opération.

Le parcours est intégré dans `main`. Les endpoints réutilisés revérifient côté API le compte actif, l'appartenance, l'auteur et les états métier.

## Médias et géolocalisation native — Phase 21 intégrée (PR #26)

La PR #26 a intégré :

- sélection de photos depuis la galerie et capture caméra pour les signalements citoyens et les interventions Agent terrain ;
- conversion en JPEG, limitation du bord long à 1600 px et envoi multipart vers les endpoints API privés déjà existants ;
- aperçu des photos du signalement avec URL signée de courte durée, obtenue uniquement à la demande ;
- limite de trois photos par signalement dans l'interface citoyenne, appliquée aussi côté API sous verrou SQL du signalement pour résister aux dépôts concurrents ;
- localisation ponctuelle au premier plan, uniquement après action explicite, avec précision estimée ; la saisie manuelle reste disponible ;
- plugins Expo et permissions Android/iOS limités aux usages nécessaires.

L'API reste l'autorité : elle vérifie le propriétaire du signalement ou l'auteur de l'intervention, les appartenances, les états métier, le type réel de l'image et la taille maximale de 10 MiB. Les ajouts de preuves sont auditables, sans conserver de chemin Storage dans l'événement. Aucun chemin Storage ni clé privilégiée n'est exposé au Mobile. Les permissions peuvent être refusées sans bloquer le dépôt manuel d'un signalement. La CI complète est verte, et le staging vérifie désormais le parcours API complet jusqu'à la clôture. La recette native sur appareils réels reste à effectuer.

## Build et distribution native

`eas.json` contient les profils `preview-apk` et `production-apk` (Android, format APK). La CI GitHub vérifie actuellement le typecheck, les tests et l'export JavaScript/bundles Android (`expo export --platform android`) ; cet export n'est **pas** un APK Android signé. Aucun build EAS, APK signé, SHA-256 de release ou GitHub Release n'a été vérifié au 6 novembre 2026.

Avant de distribuer une build de test, vérifier l'identifiant du projet Expo, les identifiants de signature Android et le secret `EXPO_TOKEN` dans l'environnement de build, puis lancer le profil `preview-apk`. Installer le binaire obtenu sur un Android physique et exécuter la recette. Le profil `production-apk` ne doit pas être utilisé avant les portes de sécurité, la recette mobile et la restauration du plan de reprise.

## Limites restantes

Les notifications, le mode hors connexion et l'affichage des preuves d'intervention après upload restent à réaliser. La recette sur appareils Android/iOS réels est à effectuer avec le [protocole de recette](../../docs/mobile/recette-appareils.md), sur un environnement de test et avec des comptes fictifs. Le bucket Supabase distant, la rétention des médias et la planification Cron doivent être configurés indépendamment du client Mobile.