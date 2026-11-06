# Comptes E2E staging

Le workflow [Staging E2E Test Users](../../.github/workflows/staging-e2e-users.yml) provisionne huit identités Supabase Auth isolées, puis leurs profils métier et leurs rôles dans PostgreSQL staging.

## Préparer l'environnement GitHub `staging`

Conserver le secret existant `STAGING_PRISMA_URL` et configurer les trois secrets suivants dans **Settings → Environments → staging** :

| Secret | Contenu |
|---|---|
| `STAGING_SUPABASE_SECRET_KEY` | Clé Supabase secrète `sb_secret_...` ou ancienne clé JWT `service_role` du projet staging. Jamais une clé publishable/anon. |
| `STAGING_E2E_PASSWORD_SEED` | Secret aléatoire d'au moins 32 octets, utilisé pour dériver un mot de passe distinct par rôle. |\n| `STAGING_SUPABASE_CA_CERT` | Contenu PEM complet du certificat CA PostgreSQL téléchargé depuis **Supabase Dashboard → Database → Settings → SSL Configuration** pour le projet staging. |

Ne pas placer ces valeurs dans le dépôt, dans un fichier `.env` commité ou dans un client Web/Mobile. L'URL Supabase est volontairement fixée au projet staging dans le workflow et revalidée par le script. La connexion PostgreSQL est également vérifiée : projet attendu, Session Pooler, port 5432 et TLS avec validation stricte du certificat CA (`rejectUnauthorized: true`). Le script retire les paramètres SSL de l'URL avant de passer explicitement le CA au pilote `pg`, afin que l'URL ne remplace pas sa configuration TLS.

## Exécuter le provisioning

1. Ouvrir **GitHub → Actions → Staging E2E Test Users**.
2. Lancer le workflow depuis la branche `main`.
3. Choisir `CREATE` pour `seed_staging_test_users`.
4. Vérifier le résumé du job : huit comptes Auth, huit profils métier et huit rôles actifs distincts.

Le choix par défaut est `NO`. Le job ne s'exécute pas depuis une autre branche.

## Identités provisionnées

Les adresses utilisent le domaine réservé `.test` et ne correspondent pas à des boîtes e-mail réelles. Auth confirme directement ces comptes ; aucun e-mail d'invitation n'est envoyé.

| Compte | Rôle actif |
|---|---|
| `e2e.citoyen@staging.isieco.test` | `CITOYEN` |
| `e2e.agent-qualification@staging.isieco.test` | `AGENT_QUALIFICATION` |
| `e2e.responsable-traitement@staging.isieco.test` | `RESPONSABLE_TRAITEMENT` |
| `e2e.responsable-affectation@staging.isieco.test` | `RESPONSABLE_AFFECTATION` |
| `e2e.agent-terrain@staging.isieco.test` | `AGENT_TERRAIN` |
| `e2e.verificateur-cloture@staging.isieco.test` | `VERIFICATEUR_CLOTURE` |
| `e2e.gestionnaire-referentiel@staging.isieco.test` | `GESTIONNAIRE_REFERENTIEL` |
| `e2e.administrateur-comptes@staging.isieco.test` | `ADMINISTRATEUR_COMPTES` |

Chaque mot de passe est dérivé dans le job par HMAC-SHA256 à partir du secret `STAGING_E2E_PASSWORD_SEED` et du code rôle. Le mot de passe ne s'affiche jamais dans les logs. Un futur runner E2E peut recalculer le mot de passe du rôle à partir du même secret sans le stocker dans le dépôt.

## Sécurité et idempotence

- Les utilisateurs sont créés via `supabase.auth.admin.createUser()`, jamais par insertion SQL dans `auth.users`.
- La clé Auth Admin est utilisée uniquement dans le runner GitHub hébergé, jamais dans le Web ou le Mobile.
- Le script refuse toute URL qui ne cible pas le projet Supabase staging attendu.
- Le script refuse de modifier une adresse qui existe déjà sans le marqueur `app_metadata.isieco_seed`.
- La création Auth précède la transaction PostgreSQL. Si l'écriture des profils échoue, les identités Auth restent présentes et un nouveau lancement peut reprendre proprement.
- Les profils et les rôles sont synchronisés dans une transaction. Chaque compte E2E conserve exactement un rôle actif ; les anciens rôles actifs d'un compte portant le marqueur E2E sont historisés avec `date_fin`.
- Aucun compte existant hors de cette liste d'adresses n'est supprimé ou modifié.

Ce workflow ne constitue pas à lui seul une recette E2E. Il prépare les identités isolées nécessaires aux tests positifs et négatifs des huit rôles.
