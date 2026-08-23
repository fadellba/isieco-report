# Instruction du test de dogfooding

## Texte exact à coller dans une session opencode vierge

```
Je possède un backend Laravel (C:\Users\FADEL\Herd\isieco-report).

Je veux développer un frontend Angular 22.

Utilise le SDK (AI_Frontend_SDK).

Conduis la mission jusqu'à la livraison finale.

Ne saute aucune étape.
```

## Règles d'observation

- Ne rien ajouter à l'instruction : le test valide la capacité du SDK à se piloter seul à partir d'une demande naïve.
- Démarrer dans `C:\Users\FADEL\Herd\isieco-report` (le SDK est `AI_Frontend_SDK/`, le backend est à la racine).
- Résultat attendu : l'IA lit `AI_Frontend_SDK/MASTER.md`, initialise le journal de mission, exécute 00 → 01 → **s'arrête à 02 Design** (maquettes Figma incomplètes — règle d'arrêt MASTER) et propose le déblocage.
- Consigner le déroulé dans `AI_Frontend_SDK/OUTPUT/mission-dogfood-001.md`.
