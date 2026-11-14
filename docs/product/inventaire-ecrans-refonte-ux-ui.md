# Inventaire exhaustif des écrans ISIECO

## Engagement de périmètre

La refonte UX/UI couvre l'application entière, du premier écran de lancement à la dernière action du parcours, sur Web et Mobile. Aucun écran existant ne doit être écarté parce qu'il est secondaire, rarement utilisé ou réservé à un rôle spécifique.

L'inventaire ci-dessous sert de registre de couverture. Une ligne n'est considérée comme terminée qu'après refonte visuelle, vérification des états et validation des interactions sans régression métier. Les écrans qui n'existent pas encore (ex. récupération de mot de passe) sont identifiés comme fonctionnalité à cadrer, et non présentés comme déjà disponibles.

## Web — authentification et accès public

| Route | Écran | Couverture attendue |
|---|---|---|
| `/connexion` | Connexion | Identité, formulaire, erreurs, chargement, responsive, navigation clavier |
| `/telecharger` | Téléchargement mobile | Version disponible/indisponible, vérification de l'APK, retour |
| `/acces-refuse` | Accès refusé | Explication de l'habilitation, retour cohérent |
| `*` | Route Web inconnue | Page 404 explicite, retour à l'accueil, lien vérifié |

## Web — espace authentifié

| Route | Écran | Couverture attendue |
|---|---|---|
| `/` | Tableau de bord | Résumé des habilitations, raccourcis par rôle, centre opérationnel |
| `/administration/comptes` | Comptes | Liste, recherche, détail/édition, confirmations et états |
| `/qualification` | File de qualification | Filtres, priorités, pagination, vide/chargement/erreur |
| `/qualification/:idSignalement` | Détail qualification | Contexte, médias, décision, complément, validation |
| `/dossiers` | Liste des dossiers | Recherche, filtres, priorités, états et accès au détail |
| `/dossiers/:idDossier` | Détail dossier | Informations, historique, affectation, progression opérationnelle |
| `/affectations` | Affectations | Équipes, charge, choix, confirmation et erreurs |
| `/verification` | Vérification indépendante | File, examen des preuves, validation ou reprise motivée |
| `/interventions` | Interventions | Missions, statuts, résultats et consultation des comptes rendus |
| `/referentiels` | Référentiels | Équipes, types de déchets, formulaires et confirmations |

## Mobile — démarrage et authentification

| Route | Écran | Couverture attendue |
|---|---|---|
| `/` | Routage initial | Chargement, erreur de session, orientation selon rôles |
| `/onboarding` | Introduction | Progression, illustration, passage, sortie |
| `/sign-in` | Connexion | Champs accessibles, visibilité des erreurs, chargement |
| `/sign-up` | Création de compte citoyen | Validation, confirmation e-mail, erreurs |
| `/choose-space` | Choix d'espace | Présentation des rôles et navigation |
| `/no-mobile-access` | Accès mobile indisponible | Explication, renouvellement des accès, déconnexion |
| `+not-found` | Route Mobile inconnue | Écran 404 explicite, retour à l'accueil |

## Mobile — citoyen

| Route | Écran | Couverture attendue |
|---|---|---|
| `/(citizen)/home` | Accueil citoyen | Action principale, état des dossiers, raccourcis |
| `/(citizen)/reports` | Liste et suivi | Statuts, pagination, vide, actualisation |
| `/(citizen)/reports/new` | Création de signalement | Formulaire, localisation manuelle/GPS, photo facultative, validation |
| `/(citizen)/reports/[id]` | Détail signalement | Chronologie, pièces jointes, complément, récupération d'erreur |
| `/(citizen)/profile` | Profil citoyen | Identité, informations du compte, déconnexion |

## Mobile — agent terrain

| Route | Écran | Couverture attendue |
|---|---|---|
| `/(agent)/home` | Accueil agent | Priorités, synthèse, accès missions |
| `/(agent)/missions` | File des missions | Équipe, filtres, compteurs, prochaine action |
| `/(agent)/missions/[id]` | Fiche mission | Affectation, intervention, preuves, compte rendu, vérification |
| `/(agent)/map` | Vue géolocalisée | Filtres, coordonnées réelles, itinéraires, missions non localisées |
| `/(agent)/profile` | Profil agent | Identité, habilitations, équipe, déconnexion |

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

- **Réinitialisation du mot de passe** : aucune route Web ou Mobile dédiée n'existe dans le routeur actuel. Ce parcours (demande d'e-mail, lien profond, définition d'un nouveau mot de passe et états expirés) doit être cadré avec la configuration des redirections Supabase avant d'être ajouté. Il ne doit pas être maquillé en lien non fonctionnel.
- **`apps/web/src/pages/AdminHomePage.tsx`** : composant historique présent dans le code mais non référencé par le routeur actuel. Il ne constitue pas une route active ; son sort sera décidé pendant le nettoyage final pour éviter de conserver deux parcours d'accueil concurrents.
- **Recette visuelle réelle** : la validation TypeScript et les builds ne remplacent pas la vérification des routes dans un navigateur et sur appareils Android/iOS.
