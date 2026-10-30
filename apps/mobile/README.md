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

La page d'accueil et l'écran de connexion sont des placeholders. L'authentification Supabase, les parcours citoyens/agents, l'accès appareil photo, la géolocalisation, la synchronisation et le mode hors connexion restent à implémenter.
