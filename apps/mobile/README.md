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

L'authentification Supabase et le chargement du profil métier via l'API sont intégrés. L'accueil dirige un compte `CITOYEN` vers son espace signalements.

## Parcours citoyen — Phase 18

La branche `feat/phase-18-mobile-citizen-reports` ajoute :

- `/(citizen)/reports` : liste paginée et suivi des seuls signalements du compte connecté ;
- `/(citizen)/reports/new` : dépôt d'un signalement avec description obligatoire, date de constat facultative, description du lieu et coordonnées saisies manuellement facultatives ;
- `/(citizen)/reports/[id]` : détail propriétaire, catégories qualifiées, demandes de complément et réponses.

La soumission réutilise `POST /api/v1/reports` et l'en-tête `Idempotency-Key`. La clé est conservée pour une nouvelle tentative avec un contenu inchangé et renouvelée lorsque le formulaire change. Les demandes et réponses réutilisent les endpoints Reports existants.

La liste et le détail sont filtrés par propriétaire côté API. Aucune route de référentiel réservée au rôle `GESTIONNAIRE_REFERENTIEL` n'est utilisée par le citoyen. La géolocalisation n'est pas demandée au système : la saisie de coordonnées reste manuelle et facultative dans cette première tranche.

## Limites restantes

La sélection depuis l'appareil photo / galerie et l'upload mobile des photos de signalement ne sont pas encore intégrés ; `expo-image-picker` doit être ajouté avec une version compatible SDK 57 et un lockfile généré/validé. La géolocalisation native, les parcours Mobile agent, les interventions, les notifications et le mode hors connexion restent à réaliser. Le MVP documenté exige une connexion réseau pour les opérations métier.