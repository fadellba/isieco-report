# Inventaire exhaustif des écrans ISIECO

## Engagement de périmètre

La refonte UX/UI couvre l'application entière, du premier écran de lancement à la dernière action du parcours, sur Web et Mobile. Aucun écran existant ne doit être écarté parce qu'il est secondaire, rarement utilisé ou réservé à un rôle spécifique.

L'inventaire ci-dessous sert de registre de couverture. Une ligne n'est considérée comme terminée qu'après refonte visuelle, vérification des états et validation des interactions sans régression métier. Les nouveaux parcours ajoutés pendant cette tranche sont répertoriés ci-dessous ; leur activation en production dépend encore des redirections autorisées dans Supabase.

## Web — authentification et accès public

| Route | Écran | Couverture attendue |
|---|---|---|
| `/connexion` | Connexion | Identité, formulaire, erreurs, chargement, responsive, navigation clavier |
| `/mot-de-passe-oublie` | Demande de réinitialisation | Message non révélateur de l’existence du compte, état d’envoi, lien e-mail | 
| `/reinitialiser-mot-de-passe` | Définition du nouveau mot de passe | Validation du lien, expiration, confirmation, fermeture de session |
| `/telecharger` | Téléchargement mobile | Version disponible/indisponible, vérification de l'APK, retour |
| `/acces-refuse` | Accès refusé | Explication de l'habilitation, retour cohérent |
| `*` | Route Web inconnue | Page 404 explicite, retour à l'accueil, lien vérifié |

## Web — espace authentifié

| Route | Écran | Couverture attendue |
|---|---|---|
| `/` | Tableau de bord | Résumé des habilitations, centre opérationnel conditionnel, accès aux modules autorisés |
| `/administration/comptes` | Comptes et habilitations | Annuaire paginé, recherche locale, filtres, attribution et révocation confirmée des rôles |
| `/qualification` | File de qualification | Synthèse, recherche locale, filtres, pagination, vide/chargement/erreur |
| `/qualification/:idSignalement` | Détail qualification | Contexte, médias, historique, décision et champs progressifs |
| `/dossiers` | Liste des dossiers | Création guidée depuis un signalement, recherche locale, filtres et suivi |
| `/dossiers/:idDossier` | Détail dossier | Contenus, signalements associés, localisation, priorité et réglages avancés |
| `/affectations` | Affectations | Étapes contenu → équipe éligible, aperçu, recherche locale, réaffectation |
| `/interventions` | Interventions | Synthèse d’équipe, prochaines actions, recherche locale et compte rendu réservé à l’auteur |
| `/verification` | Vérification indépendante | File filtrable, examen des preuves privées, décision conforme ou reprise motivée |
| `/referentiels` | Référentiels | Catalogue des déchets, équipes, membres, compétences et historiques de clôture |
| `/acces-refuse` | Accès refusé | Explication des habilitations, retour cohérent dans l’espace applicatif |

## Mobile — démarrage et authentification

| Route | Écran | Couverture attendue |
|---|---|---|
| `/` | Routage initial | Chargement, erreur de session, orientation selon rôles |
| `/onboarding` | Introduction | Progression, illustration, passage, sortie |
| `/sign-in` | Connexion | Champs accessibles, visibilité des erreurs, chargement |
| `/forgot-password` | Demande de réinitialisation | Message neutre, clavier, retour e-mail et navigation |
| `/reset-password` | Définition du nouveau mot de passe | Deep link, échange de code/tokens, expiration et validation |
| `/sign-up` | Création de compte citoyen | Validation, confirmation e-mail, erreurs |
| `/choose-space` | Choix d'espace | Présentation des rôles et navigation |
| `/no-mobile-access` | Accès mobile indisponible | Explication, renouvellement des accès, déconnexion |
| `+not-found` | Route Mobile inconnue | Écran 404 explicite, retour à l'accueil |

## Mobile — citoyen

| Route | Écran | Couverture attendue |
|---|---|---|
| `/(citizen)/home` | Accueil citoyen | Refonte de la hiérarchie visuelle : action principale, progression des signalements personnels, actions requises, aperçu de proximité après consentement et états de synchronisation clairement séparés |
| `/(citizen)/reports` | Liste et suivi | Liste paginée, statuts, filtres, vide, actualisation ; l'onglet inférieur **Suivi** doit ouvrir cette liste et jamais le formulaire |
| `/(citizen)/reports/new` | Création de signalement | Photo initiale obligatoire ; capture caméra et sélection multiple depuis la galerie, jusqu'à trois photos au total, prévisualisation/suppression, localisation consentie, champs facultatifs, upload multipart fiable et reprise des erreurs |
| `/(citizen)/reports/[id]` | Détail signalement | Chronologie, pièces jointes, complément, récupération d'erreur |
| `/(citizen)/profile` | Profil citoyen | Consultation et modification du nom, prénom et téléphone ; e-mail et habilitations en lecture seule ; validation, confirmation de sauvegarde et déconnexion |


### Retours et exigences de correction — espace citoyen (24 novembre 2026)

| Élément | État observé | Exigence de sortie |
|---|---|---|
| Bottom navigation | Le composant d'onglets cible la route `reports`, mais un renvoi vers `reports/new` a été signalé au clic sur Suivi. La cause n'est pas établie. | La sélection **Suivi** ouvre l'index `reports` depuis chaque écran citoyen ; le bouton central **Signaler** est le seul raccourci vers `reports/new`. Ajouter un test de navigation. |
| FormData | L'erreur `UnsupportedFormData` est rapportée à la soumission. | Valider le transport multipart sur Android et iOS avec le descripteur de fichier natif, sans Content-Type manuel, et conserver un feedback exploitable en cas d'échec. |
| Photos multiples | Le code du formulaire stocke une seule photo et appelle le sélecteur avec une limite de 1. | Permettre la capture répétée ou la sélection multiple, avec aperçu, suppression individuelle et limite totale de trois photos. Gérer un échec d'upload partiel sans perdre les photos déjà envoyées. |
| Accueil | L'utilisateur demande une nouvelle présentation ; la disposition actuelle ne lui convient pas. | Reconcevoir l'ordre et la densité des sections autour de l'action principale, des signalements personnels et des actions requises. La carte de proximité reste secondaire et déclenchée après consentement. |
| Profil | L'écran affiche les champs en lecture seule. | Ajouter l'édition du nom, du prénom et du téléphone en consommant `PATCH /api/v1/accounts/me`. L'e-mail et les rôles demeurent non éditables dans l'espace citoyen. |

La photo initiale est obligatoire depuis la migration `20261118190000_require_report_photo`. Le besoin multi-photos concerne donc un dépôt comportant une photo initiale et jusqu'à deux photos complémentaires, dans la limite de trois au total.

## Mobile — agent terrain

| Route | Écran | Couverture attendue |
|---|---|---|
| `/(agent)/home` | Accueil agent | Priorités, synthèse, accès missions |
| `/(agent)/missions` | File des missions | Équipe, filtres, compteurs, prochaine action |
| `/(agent)/missions/[id]` | Fiche mission | Affectation, intervention, preuves, compte rendu, vérification |
| `/(agent)/map` | Carte interactive | Marqueurs sur coordonnées réelles, sélection, détails, filtres, itinéraires et missions non localisées |
| `/(agent)/profile` | Profil agent | Identité, habilitations, équipe, déconnexion |

## État d'avancement des premières reprises structurelles

| Route | Première reprise UI | Validation restante |
|---|---|---|
| `/` | Tableau de bord par rôle et centre opérationnel, accès limités aux habilitations | Recette visuelle, responsive et contrôles d’accès par profil |
| `/administration/comptes` | Annuaire, recherche sur la page, filtres, rôles déjà attribués exclus et révocation confirmée | Tester les profils, API d’autorisation, états inactifs et navigation clavier |
| `/qualification` | File de travail avec synthèse, recherche locale, statuts et actions explicites | Recette responsive, clavier et tests de parcours |
| `/qualification/:idSignalement` | Contexte, pièces jointes, historique et décision progressive séparés | Vérifier les états métier réels et les formulaires sur navigateur |
| `/dossiers` | Création guidée avec aperçu source, recherche locale, filtres et cartes | Vérifier les cas vides, pagination et responsive |
| `/dossiers/:idDossier` | Contenus, rattachements, localisation et priorité hiérarchisés ; réglages avancés repliés | Tester les modifications, confirmations, erreurs et état clôturé |
| `/affectations` | Création guidée, aperçu du contenu, équipes éligibles, recherche locale et réaffectation | Recette des refus, des erreurs API, de la pagination et du responsive |
| `/interventions` | Synthèse d’équipe, compteurs de prochaine action, recherche locale et statuts sémantiques | Tester chaque transition et les restrictions de dépôt de preuve/compte rendu |
| `/verification` | File avec recherche locale, filtre par résultat, accès aux preuves privées et décisions séparées | Tester liens signés expirés, reprise, clôture et séparation des tâches |
| `/referentiels` | Catalogue et équipes restructurés, membres/compétences, historiques et confirmations | Tester création, désactivation, clôture, erreurs API et accessibilité clavier |

Ces reprises sont des premières passes de conception et de structure, pas une validation finale. La route est considérée couverte seulement après recette de tous ses états et de ses actions.

## Parcours transverses et composants communs

Tous les écrans sont évalués avec les états pertinents : première ouverture, chargement, vide, succès, erreur récupérable, indisponibilité réseau, absence de permission, accès refusé et action en cours. Les formulaires incluent aide, validation, erreurs au niveau du champ et prévention des doubles soumissions lorsque l'action le nécessite.

Composants à normaliser et réutiliser :
- identité et structures de page, navigation, fil d'Ariane et en-têtes ;
- boutons primaires/secondaires/destructifs, champs, sélecteurs et contrôles de formulaire ;
- cartes, tableaux, lignes de file, filtres, recherche et pagination ;
- badges de statut, priorités, alertes, notifications et confirmations ;
- états de chargement, squelette, vide, erreur, absence d'accès et reprise ;
- chronologies, pièces jointes, aperçu média, localisation et carte ;
- dialogues, feuilles mobiles, menus et actions contextuelles.

## Ordre d'exécution

1. **Socle global** : tokens, typographie, espacements, composants, navigation, responsive et accessibilité.
2. **Entrée produit** : splash, onboarding, connexion, création de compte, choix d'espace et écrans d'accès/erreur.
3. **Citoyen** : accueil, signalement, liste, détail, profil.
4. **Agent** : accueil, file, fiche mission, carte, profil.
5. **Web métier** : tableau de bord puis qualification, dossiers, affectation, interventions, vérification, référentiels et comptes.
6. **Contrôle de bout en bout** : navigation entre tous les écrans, états, tailles d'écran, accessibilité, tests automatisés et recette Android/iOS réels.

## Critères d'acceptation globaux

- Toutes les routes recensées sont couvertes ou explicitement marquées comme non applicables.
- Aucun écran ne conserve une ancienne présentation par simple oubli.
- Les composants communs sont utilisés de façon cohérente plutôt que recopiés avec des variantes arbitraires.
- Les libellés, statuts, rôles et transitions restent alignés sur les contrats API.
- Les autorisations et règles serveur ne sont jamais affaiblies pour faciliter l'interface.
- Chaque écran est vérifié sur les formats adaptés à sa plateforme.
- Les tests de build et de type complètent la recette visuelle ; ils ne la remplacent pas.


## Écrans ou fonctionnalités absents à ne pas confondre avec une refonte

- **Réinitialisation du mot de passe** : les routes Web et Mobile existent désormais. La recette réelle dépend encore de l’ajout des URL de retour Web et du schéma `isiecoreport://**` dans les redirections autorisées de Supabase Auth, puis de tests avec un compte de test.
- **`apps/web/src/pages/AdminHomePage.tsx`** : composant historique présent dans le code mais non référencé par le routeur actuel. Il ne constitue pas une route active ; son sort sera décidé pendant le nettoyage final pour éviter de conserver deux parcours d'accueil concurrents.
- **Recette visuelle réelle** : la validation TypeScript et les builds ne remplacent pas la vérification des routes dans un navigateur et sur appareils Android/iOS.
