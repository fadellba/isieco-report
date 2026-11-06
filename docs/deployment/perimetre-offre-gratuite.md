# Périmètre gratuit et reports liés aux coûts

État vérifié le **6 novembre 2026**. La règle de ce dépôt est de poursuivre les validations réalisables sans abonnement payant. Aucun plan ne doit être changé, aucune option payante activée et aucun dépassement de quota ne doit être engagé sans décision budgétaire explicite.

Cette page distingue les fonctions payantes des tâches qui restent réalisables avec les offres gratuites. Une tâche n'est pas considérée comme bloquée par un coût si une voie manuelle gratuite permet d'obtenir la preuve attendue.

## Décisions de périmètre

| Domaine | Capacité | Périmètre actuel |
|---|---|---|
| Supabase Auth | Protection HaveIBeenPwned contre les mots de passe compromis | **Différée** : disponible sur Pro et supérieur. L'organisation liée à ISI-Eco est sur l'offre Free. Ne pas passer à Pro sans approbation. Issue [#55](https://github.com/fadellba/isieco-report/issues/55). |
| Supabase Database | Sauvegardes quotidiennes gérées | **Différées** : disponibles sur Pro, Team et Enterprise. Sur Free, effectuer un export logique manuel avec `supabase db dump` et le conserver hors site. |
| Supabase Database | Point-in-Time Recovery (PITR) | **Différé** : option payante pour les projets Pro/Team/Enterprise, avec contraintes de capacité de calcul. La voie actuelle est l'export logique manuel et la restauration testée dans un environnement isolé. |
| Supabase Storage | Export/restauration des binaires du bucket privé | **Dans le périmètre gratuit** : exporter séparément les objets avec Supabase CLI (`storage ls` / `storage cp`) ou un client S3 compatible. Un dump PostgreSQL ne contient pas les binaires. |
| EAS Build | Build Android APK de test interne | **Dans le périmètre gratuit** : EAS Free inclut jusqu'à 15 builds Android et 15 builds iOS par mois, avec file basse priorité. Aucun abonnement EAS payant n'est requis tant que le quota est suffisant. |
| EAS Build | Build iOS interne ad hoc installable sur un iPhone physique | **Différée si elle exige l'adhésion Apple** : la distribution ad hoc nécessite un compte Apple Developer payant et des UDID enregistrés. Pour les parcours compatibles, utiliser Expo Go comme smoke test gratuit ; cela ne remplace pas une build native ad hoc. |
| Stores mobiles | Publication sur Google Play / App Store | **Hors périmètre** : les adhésions développeur des stores sont distinctes d'EAS et sont payantes. Aucune publication n'est autorisée dans ce chantier. |

Sources officielles consultées le 6 novembre 2026 :

- [Supabase Free plan backups](https://supabase.com/kb/faqs/platform/free-plan-backups) : pas de sauvegarde automatique sur Free ; les exports manuels par Supabase CLI restent possibles.
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups) : sauvegardes quotidiennes sur Pro/Team/Enterprise ; PITR en option sur offres payantes ; les objets Storage ne sont pas inclus dans le backup PostgreSQL.
- [Supabase Password security](https://supabase.com/docs/guides/auth/password-security) : protection HaveIBeenPwned sur Pro et supérieur.
- [Supabase Download Objects](https://supabase.com/docs/guides/storage/management/download-objects) : export d'objets via CLI, Dashboard ou outil S3 compatible.
- [EAS plans](https://docs.expo.dev/billing/plans/) et [EAS pricing](https://expo.dev/pricing) : quota de builds gratuit mensuel et file basse priorité.
- [EAS Internal Distribution](https://docs.expo.dev/build/internal-distribution/) : APK Android interne ; la distribution iOS ad hoc nécessite une adhésion Apple Developer payante.
- [EAS First Build](https://docs.expo.dev/build/setup/) : EAS Build est accessible avec un compte Expo Free ; les adhésions App Store/Google Play ne sont nécessaires que pour les distributions dans les stores.

## Travaux maintenus dans le périmètre sans paiement

### Stockage privé — issue #52

La validation de Storage ne requiert pas Supabase Pro. Le bucket staging est privé, plafonné à 10 MiB et limité à JPEG/PNG/WebP. Le contrôle SQL/Storage du 6 novembre confirme qu'une ligne photo possède son objet ; aucun objet manquant, orphelin ou expiré n'a été observé.

Restent à exécuter après validation de la politique métier de conservation :

1. définir `MEDIA_RETENTION_DAYS` avec une durée approuvée par le responsable métier ;
2. utiliser uniquement des comptes et médias synthétiques ;
3. tester upload citoyen et preuve d'intervention, contrôle d'accès et URL signée de 60 secondes ;
4. vérifier l'expiration, la purge ciblée, les compteurs, la reprise après échec et l'audit.

La décision sur la durée de conservation est un prérequis métier, pas un coût d'abonnement. Ne pas fixer une valeur arbitraire pour débloquer le test.

### Application mobile — issue #53

Les tests, le typecheck et `expo export --platform android` passent en CI, mais l'export JS ne constitue pas un APK signé.

Les prochaines étapes gratuites sont de lier le projet Expo existant (ou d'en créer un selon le choix du propriétaire), d'ajouter `EXPO_TOKEN` au secret de l'environnement CI, puis de lancer `preview-apk` dans le quota EAS Free. Associer le SHA-256 du binaire au commit exact et exécuter la recette Android avec des données fictives.

Pour iOS, un smoke test via Expo Go peut couvrir les fonctions compatibles. La distribution de build native interne ad hoc est différée tant qu'aucune adhésion Apple Developer payante n'est approuvée.

### Reprise — issue #54

La reprise PostgreSQL reste dans le périmètre gratuit via l'export logique manuel documenté dans [staging-database.md](staging-database.md). La restauration doit être faite dans une base PostgreSQL isolée, jamais sur le projet source.

Les objets du bucket privé doivent être sauvegardés séparément via Supabase CLI ou un client S3 compatible. Vérifier les chemins, SHA-256, relations entre lignes photo et objets restaurés, confidentialité du bucket et génération de nouvelles URLs signées. Les dumps PostgreSQL seuls ne constituent pas une sauvegarde complète des médias.

La sauvegarde quotidienne gérée et PITR ne sont pas des conditions nécessaires à la répétition manuelle gratuite. Elles seront réévaluées seulement après une décision budgétaire.

## Fonctions explicitement différées

- **Issue #55** : protection HaveIBeenPwned de Supabase Auth, après éventuelle approbation de Supabase Pro ou supérieur. Les règles générales de longueur/complexité des mots de passe ne remplacent pas cette vérification de compromission.
- **Sauvegarde gérée/PITR** : à réexaminer si le besoin opérationnel exige un RPO/RTO plus strict que la procédure manuelle gratuite.
- **Distribution iOS ad hoc et publication sur les stores** : à réexaminer après approbation des adhésions développeur correspondantes.
- **EAS payant** : à réexaminer uniquement lorsque le quota mensuel gratuit est consommé et que des builds supplémentaires sont réellement nécessaires.

## Garde-fous financiers et sécurité

- Ne pas upgrader Supabase, Expo/EAS, Apple Developer ou Google Play sans approbation budgétaire explicite.
- Ne pas déclencher de fonctionnalités payantes ou de surcoûts d'usage pour éviter d'attendre le renouvellement d'un quota EAS.
- Ne jamais rendre le bucket Storage public pour simplifier les sauvegardes.
- Ne jamais confondre un dump PostgreSQL avec un backup de médias Storage.
- Ne pas utiliser un secret Supabase privilégié dans Web, Mobile, logs ou artefacts CI.
- Garder les déploiements de production désactivés jusqu'aux validations techniques et à l'approbation explicite de mise en production.
