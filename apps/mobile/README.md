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

## Limites restantes

Le dépôt de photos depuis Mobile n'est pas encore intégré. Il nécessite l'ajout d'`expo-image-picker` dans une version compatible Expo SDK 57 et la mise à jour vérifiée de `pnpm-lock.yaml`. La géolocalisation native via `expo-location`, les notifications et le mode hors connexion restent à réaliser. Les coordonnées du signalement peuvent actuellement être saisies manuellement ; le MVP exige une connexion réseau pour les opérations métier.