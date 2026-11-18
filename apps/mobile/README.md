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

L'application présente un splash natif Expo assorti à l'identité ISIECO, puis une introduction de première ouverture qui explique les parcours citoyen et agent. L'authentification Supabase et le chargement du profil métier via l'API sont intégrés. Après connexion, les espaces correspondent aux rôles `CITOYEN` et `AGENT_TERRAIN` ; un compte disposant des deux rôles choisit son espace.

## Parcours citoyen — Phase 18 intégrée

- `/(citizen)/reports` : liste paginée et suivi des seuls signalements du compte connecté ;
- `/(citizen)/reports/new` : signalement avec photo obligatoire, localisation GPS déclenchée à la demande ou saisie manuelle, description et catégories facultatives ;
- `/(citizen)/reports/[id]` : détail propriétaire, chronologie des statuts et jalons opérationnels, photos privées, catégories qualifiées et demandes de complément.

La soumission utilise `POST /api/v1/reports/with-photo` et l'en-tête `Idempotency-Key`. Le signalement et sa première photo privée obligatoire sont créés ensemble ; la clé est conservée lors d'une nouvelle tentative avec les mêmes métadonnées et la même photo, et renouvelée lorsque le formulaire change. La chronologie provient de `GET /api/v1/reports/:id/history`. Les demandes et réponses réutilisent les endpoints Reports existants. Aucun endpoint de référentiel réservé au gestionnaire n'est appelé par le citoyen.

## Parcours Agent terrain — Phase 19 intégrée

La PR #24 a intégré `/(agent)/missions` :

- découverte des équipes actives auxquelles appartient le compte connecté via `GET /api/v1/interventions/my-teams` ;
- consultation des affectations et interventions de l'équipe sélectionnée dans une file filtrable par prochaine action ;
- ouverture d'une fiche dédiée `/(agent)/missions/[id]` pour examiner le contexte, accepter/refuser, démarrer l'intervention, ajouter une preuve et transmettre le compte rendu ;
- acceptation ou refus motivé d'une affectation ;
- démarrage d'une intervention acceptée ;
- saisie du compte rendu et du résultat terrain ;
- motif obligatoire si le résultat est `PARTIELLE` ou `IMPOSSIBLE` ;
- démarrage d'une reprise uniquement après une décision de vérification `REPRISE`.

L'onglet `/(agent)/map` affiche une carte interactive des affectations des équipes actives avec filtres d'équipe et d'état, marqueurs sur les seules coordonnées réelles, sélection d'une mission, accès à sa fiche et ouverture d'un itinéraire. Les affectations sans coordonnées restent dans une liste séparée et ne reçoivent aucune position fictive.

Le formulaire de compte rendu n'est affiché que pour l'agent auteur de l'intervention. L'API recontrôle l'appartenance, l'auteur et les états métier à chaque opération.

Le parcours est intégré dans `main`. Les endpoints réutilisés revérifient côté API le compte actif, l'appartenance, l'auteur et les états métier.

## Médias et géolocalisation native — Phase 21 intégrée (PR #26)

La PR #26 a intégré :

- sélection de photos depuis la galerie et capture caméra pour les signalements citoyens et les interventions Agent terrain ;
- conversion en JPEG, limitation du bord long à 1600 px et envoi multipart vers les endpoints API privés déjà existants ;
- aperçu des photos du signalement avec URL signée de courte durée, obtenue uniquement à la demande ;
- limite de trois photos par signalement dans l'interface citoyenne, appliquée aussi côté API sous verrou SQL du signalement pour résister aux dépôts concurrents ;
- localisation ponctuelle au premier plan, uniquement après activation du bouton « Détecter ma position GPS », avec précision estimée ; la saisie manuelle reste disponible ;
- plugins Expo et permissions Android/iOS limités aux usages nécessaires.

L'API reste l'autorité : elle vérifie le propriétaire du signalement ou l'auteur de l'intervention, les appartenances, les états métier, le type réel de l'image et la taille maximale de 10 MiB. Les ajouts de preuves sont auditables, sans conserver de chemin Storage dans l'événement. Aucun chemin Storage ni clé privilégiée n'est exposé au Mobile. Les permissions peuvent être refusées sans bloquer le dépôt manuel d'un signalement. La CI complète est verte, et le staging vérifie désormais le parcours API complet jusqu'à la clôture. La recette native sur appareils réels reste à effectuer.

## Build et distribution native

`eas.json` contient les profils `preview-apk` et `production-apk`. Le profil `preview-apk` embarque les paramètres **publics** de staging (URL API, URL Supabase et clé publishable Supabase) ; aucune clé privilégiée n'est incluse. La CI standard valide les tests, le typecheck et l'export JavaScript Android, mais cet export n'est **pas** un APK installable.

Le workflow GitHub Actions `.github/workflows/eas-android-preview.yml` est limité à la PR #101 et à la branche `feat/isieco-ux-ui-foundation`. Il lance le profil interne `preview-apk` après une mise à jour de la PR qui touche l'application Mobile ou ses dépendances. Il ne publie rien sur Google Play. Le workflow ne reçoit le jeton Expo que sur les étapes EAS ; sans le secret, il signale que le build natif a été ignoré.

Pour activer le build, ajouter un secret GitHub Actions nommé `EXPO_TOKEN` dans [les secrets du dépôt](https://github.com/fadellba/isieco-report/settings/secrets/actions). Ne jamais mettre ce jeton dans le dépôt, dans `eas.json` ou dans une conversation. Une fois le secret disponible, relancer le workflow Android preview depuis l'onglet Actions.

EAS Free comprend actuellement jusqu'à **15 builds Android et 15 builds iOS par mois**, en file basse priorité. Le profil Android `preview-apk` peut donc être utilisé sans abonnement payant si le quota gratuit est disponible. Voir [Tarifs EAS](https://expo.dev/pricing).

Après le build, télécharger l'APK depuis la page de build Expo, calculer son SHA-256, l'associer au SHA Git testé et l'installer sur un appareil Android physique. Ne pas utiliser le profil `production-apk` pour cette recette.

Pour iOS, une distribution interne ad hoc sur iPhone exige un compte Apple Developer payant et l'enregistrement des appareils. Cette variante est différée dans le périmètre sans frais. Un smoke test sur iPhone via Expo Go peut couvrir les fonctionnalités compatibles, mais ne remplace pas une validation native ad hoc. La publication sur Google Play ou l'App Store est hors périmètre et nécessite les adhésions développeur correspondantes. Voir [distribution interne EAS](https://docs.expo.dev/build/internal-distribution/).

Les conditions et les tâches différées en raison d'un coût sont centralisées dans [Périmètre gratuit et reports liés aux coûts](../../docs/deployment/perimetre-offre-gratuite.md).

## Limites restantes

Les notifications, le mode hors connexion et l'affichage des preuves d'intervention après upload restent à réaliser. La recette sur appareils Android/iOS réels est à effectuer avec le [protocole de recette](../../docs/mobile/recette-appareils.md), sur un environnement de test et avec des comptes fictifs. Le bucket Supabase distant, la rétention des médias et la planification Cron doivent être configurés indépendamment du client Mobile.

### Configuration des services natifs

La cartographie mobile utilise les liens OpenStreetMap : aucune clé API, aucun compte fournisseur et aucune configuration EAS ne sont nécessaires. L'ouverture de la carte se fait dans le navigateur de l'appareil. Respecter l'attribution OpenStreetMap et les conditions d'utilisation du service public.

Pour tester la récupération de compte, autoriser dans Supabase Auth les URLs de redirection Web de l'application vers `/reinitialiser-mot-de-passe` ainsi que le schéma mobile `isiecoreport://**`. Vérifier le parcours sur des comptes de test, y compris un lien expiré.
