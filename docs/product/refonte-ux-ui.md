# Refonte UX/UI ISIECO — cadrage produit v1

## Périmètre global confirmé : tous les écrans, du premier au dernier

La refonte ne se limite pas au tableau de bord, à quelques files métier ou aux écrans principaux. Elle concerne **l'intégralité des écrans existants sur Web et Mobile**, depuis le splash et l'onboarding jusqu'au profil, aux détails, aux formulaires et aux états de fin de parcours.

Le périmètre inclut notamment la connexion, la création de compte citoyen, le choix d'espace, les erreurs d'authentification, les écrans d'accès refusé, les téléchargements, chaque espace par rôle, toutes les listes et tous les détails métier. Les écrans moins fréquents ou accessibles uniquement avec une habilitation spécifique sont inclus au même titre que les écrans d'accueil.

L'inventaire de référence, route par route, est maintenu dans [l'inventaire exhaustif des écrans](./inventaire-ecrans-refonte-ux-ui.md). Il constitue le registre de couverture et d'acceptation : aucun écran ne sera considéré comme terminé sur la seule base d'un build ou de la présence de composants partagés.

L'exécution se fait par couches : socle UI commun, entrée/authentification, parcours citoyen, parcours agent, puis tous les modules Web. Chaque écran doit ensuite être vérifié pour ses états de chargement, vide, erreur, validation, permissions, responsive et accessibilité lorsque cela s'applique. Les règles de rôles, d'auteur, d'appartenance, de transition et de sécurité restent celles de l'API.

## Intention

ISIECO doit être immédiatement identifiable comme une plateforme de signalement, de qualification, d'affectation et de suivi des dépôts sauvages et des opérations de propreté urbaine. La refonte ne consiste pas à ajouter du vert aux écrans existants : elle doit installer une identité reconnaissable et rendre les parcours métier évidents.

Le système visuel doit exprimer quatre idées : territoire, environnement, action publique et intervention de terrain. La direction proposée associe un vert profond végétal, un turquoise urbain, une teinte végétale claire et un fond minéral chaud. Les motifs cartographiques et topographiques restent des accents, pas des décorations omniprésentes.

## Constat de départ

Le code contient déjà :
- une configuration de splash natif Expo dans apps/mobile/app.json ;
- un parcours d'onboarding de trois écrans dans apps/mobile/app/onboarding.tsx ;
- une marque mobile réutilisée par BrandMark ;
- une palette de base proche entre Web et Mobile.

Ces éléments sont trop sommaires pour constituer une expérience de marque aboutie. La refonte doit améliorer ce qui existe, plutôt que créer des parcours parallèles. Le splash natif doit rester bref et servir à identifier l'application pendant le chargement. L'écran de préparation React Native doit ensuite fournir un état d'attente lisible.

## Principes de marque proposés

### Positionnement

ISIECO — plateforme de gestion des dépôts sauvages et des opérations de propreté urbaine.

Signature fonctionnelle : « Du signalement à la résolution, chaque étape est suivie. »

### Palette initiale

| Rôle | Couleur | Usage |
|---|---|---|
| Vert profond | #174C3D | Marque, navigation active, actions principales |
| Vert nuit | #103B31 | États de lancement, surfaces de marque |
| Turquoise | #2F7773 | Information, géolocalisation, éléments secondaires |
| Vert jeune | #D7E6A5 | Accent, progression, surbrillance limitée |
| Vert brume | #E8F0E7 | Surfaces et fonds secondaires |
| Sable | #EDE0CC | Accent territorial et illustrations |
| Fond minéral | #F6F7F2 | Fond global |
| Encre | #192820 | Texte principal |
| Succès | #23764F | Validation et opération terminée |
| Avertissement | #A8671A | Attention et attente |
| Erreur | #B64E43 | Erreur et blocage |
| Information | #28748A | Information neutre |

Les couleurs de statut ont une signification stable sur les deux plateformes. Une couleur ne doit jamais être le seul moyen de communiquer un état : toujours ajouter un libellé ou une icône.

### Typographie et iconographie

La priorité est une hiérarchie typographique nette : titres courts, chiffres lisibles, libellés compacts, textes secondaires confortables. Utiliser une seule famille sans-serif cohérente avec des graisses bien différenciées tant qu'aucun fichier typographique local n'est validé.

Les icônes doivent partager une même grille, un même poids de trait et un vocabulaire métier. Éviter les glyphes Unicode utilisés comme icônes de navigation. Les visuels métier doivent montrer le territoire, les dépôts, la localisation, les équipes et les étapes opérationnelles. Les photographies éventuelles doivent rester authentiques, localisées et utiles à la compréhension.

## Parcours métier de référence

### Citoyen

1. Splash natif ISIECO, court et sans interaction.
2. Onboarding uniquement lors de la première découverte de la version de l'expérience.
3. Connexion ou création d'un compte citoyen.
4. Accueil citoyen : action principale « Signaler un dépôt », puis accès aux signalements et à leur suivi.
5. Création du signalement : décrire le dépôt, renseigner le lieu, ajouter une photo facultative et choisir les catégories si elles sont proposées.
6. Vérification des informations avant envoi, avec indication claire des données manquantes.
7. Confirmation de réception avec référence et prochaine étape attendue.
8. Détail du signalement : statut actuel, chronologie, pièces jointes et demandes de complément éventuelles.
9. Réponse à une demande de complément, puis suivi jusqu'à la clôture.

La photo est facultative dans le parcours actuel. La localisation GPS est demandée uniquement après une action explicite ; une saisie manuelle doit rester possible. Ne jamais présenter un signalement comme traité simplement parce qu'il a été envoyé.

### Agent de terrain

1. Splash natif, puis onboarding d'introduction commun.
2. Connexion avec les identifiants du compte agent. La création de compte publique est réservée au citoyen.
3. Sélection de l'espace si le compte dispose de plusieurs rôles.
4. Accueil agent : missions à traiter, interventions en cours et dernières actions utiles.
5. Liste des affectations, avec séparation claire entre à accepter, acceptées, en cours et terminées.
6. Détail d'une mission : dépôt/dossier, localisation, priorité, consignes, équipe et historique utile.
7. Acceptation ou refus motivé de l'affectation.
8. Démarrage de l'intervention après acceptation.
9. Saisie du compte rendu, du résultat et des preuves demandées. Un motif est requis pour un résultat partiel ou impossible.
10. Transmission à la vérification indépendante.
11. Décision de vérification : clôture ou demande de reprise. Une reprise ne doit pas être présentée comme une nouvelle mission initiale.

La carte doit compléter la liste et le détail de mission, pas devenir le seul moyen de retrouver une tâche.

### Back-office et supervision

1. Authentification et résolution des habilitations.
2. Tableau de supervision adapté au rôle : volumes, alertes, files d'attente et carte.
3. Qualification d'un signalement : vérifier les informations, demander un complément ou confirmer la pertinence.
4. Constitution et suivi du dossier opérationnel.
5. Affectation à une équipe active, avec visibilité sur la charge et la cohérence du territoire.
6. Suivi de l'intervention et de son compte rendu.
7. Vérification indépendante de la qualité et de la complétude.
8. Clôture ou demande de reprise motivée.
9. Historique métier auditable.

Le Web doit privilégier la supervision, la comparaison et le traitement de files de travail. Le Mobile doit privilégier l'action courte, le contexte de mission et la saisie terrain.

## Règles d'expérience

- Un écran = un objectif principal clairement formulé.
- Une action primaire visible ; les actions secondaires ne doivent pas la concurrencer.
- Chaque étape indique son statut, son responsable et la prochaine action attendue.
- Les actions irréversibles ou sensibles sont confirmées.
- Les formulaires affichent les erreurs au niveau du champ et un résumé compréhensible.
- Les états chargement, vide, erreur, succès, indisponibilité réseau et absence de permission sont conçus explicitement.
- Les messages de succès décrivent le résultat réel de l'opération, pas une promesse de traitement.
- Conserver le contexte lors d'un retour arrière ou d'une erreur de réseau.
- Les statuts métier ne sont pas réinventés côté interface : ils doivent refléter l'API.
- La carte possède une légende, des filtres, un état vide et une alternative sous forme de liste.
- Le contraste, la taille des zones tactiles, la navigation clavier Web et les annonces d'accessibilité sont vérifiés.

## Splash screen et onboarding mobile

Le splash natif Expo existe déjà. Il doit être traité comme une signature de lancement courte : marque, contraste élevé, fond cohérent et absence de texte métier dépendant du temps d'affichage. Le composant de préparation après démarrage doit utiliser la même identité.

L'onboarding est une introduction, pas une formation exhaustive :
- Écran 1 : pourquoi ISIECO existe et quels acteurs elle relie.
- Écran 2 : le parcours citoyen, dont la photo facultative et le suivi.
- Écran 3 : le parcours agent, de l'affectation à l'intervention puis à la vérification indépendante.
- Un indicateur de progression, un bouton Continuer, une action Passer et une sortie claire vers la connexion.
- Le texte précise que le compte citoyen peut être créé depuis l'application, tandis que l'agent utilise les identifiants fournis par son organisation.
- Versionner la clé de fin d'onboarding afin de pouvoir présenter une nouvelle introduction lorsque le parcours évolue.

## Périmètre de la première tranche

Cette première tranche installe le cadrage de refonte, harmonise les premiers tokens Web/Mobile, donne une identité plus explicite à la marque Web et refond le lancement/onboarding mobile. Elle ne prétend pas terminer toute la refonte des pages citoyennes, des missions agent, de la cartographie et du back-office.

## Tranches suivantes et critères de validation

1. Design system : composants de formulaire, boutons, cartes, badges, alertes, états vides, dialogues, navigation, tableaux et conventions d'espacement.
2. Citoyen : accueil, création progressive, confirmation et chronologie métier.
3. Agent : liste des missions, détail, exécution et compte rendu, avec réduction des formulaires monolithiques.
4. Web : centre opérationnel, files de travail, cartographie et pages de traitement.
5. Qualité : tests responsive, accessibilité, performances, tests de parcours automatisés et recette sur appareils Android/iOS réels.

La refonte sera considérée comme cohérente lorsque les mêmes statuts et mots métier sont utilisés partout, que chaque rôle voit ses prochaines actions sans ambiguïté, que les erreurs proposent une récupération et que les interfaces Web et Mobile partagent la même identité sans forcer les mêmes interactions.


## État de la première livraison UX/UI

La branche `feat/isieco-ux-ui-foundation` porte une première livraison progressive.

### Éléments implémentés

- Tokens de marque harmonisés entre la feuille CSS Web et la configuration NativeWind Mobile.
- Composants Web et Mobile pour les badges de statut et retours succès/erreur/avertissement/information.
- Navigation Mobile avec icônes de ligne cohérentes au lieu des glyphes Unicode.
- Introduction mobile versionnée, avec visuels dédiés au territoire, au parcours citoyen et au cycle de mission.
- Écran de préparation après lancement et couleurs de splash natif alignés à la marque.
- Formulaire citoyen rendu plus explicite sur les informations utiles, le caractère facultatif de la photo et l'ordre des repères affichés.
- Détail du signalement : prochaine étape expliquée à partir du statut métier et action de reprise disponible si le chargement échoue.
- Liste des missions agent transformée en file de travail filtrable (à accepter, à démarrer, en cours, à vérifier, reprises et validées), avec compteurs et priorisation par prochaine action.
- Fiche de mission dédiée `/(agent)/missions/[id]` avec contexte du dépôt, localisation, équipe, réponse à l'affectation, démarrage de l'intervention, ajout des preuves et compte rendu.
- Navigation imbriquée liste → détail, avec conservation du contexte d'équipe et retour à la file.
- Files Web de qualification, affectation et vérification : états sémantiques, messages cohérents et libellés de filtres compréhensibles.
- Liste Web des dossiers : statuts et priorités présentés avec une signification visuelle stable.
- Carte opérationnelle Web : regroupement des marqueurs proches, zoom progressif sur les groupes et sélection d’un élément individuel lorsque plusieurs dossiers partagent le même emplacement.
- Connexion Web repensée avec identité produit, champs accessibles, visibilité contrôlée du mot de passe et retours d'erreur explicites.
- Cadre d'authentification mobile partagé entre connexion, création de compte, choix d'espace et accès indisponible.
- Connexion et création de compte citoyen Mobile harmonisées, avec validation de saisie, visibilité du mot de passe et messages de confirmation.
- États de vérification de session Web/Mobile alignés sur le système visuel.
- Écrans Web et Mobile d'URL inconnue explicites au lieu d'une redirection silencieuse.
- Page publique de téléchargement mobile et page d'accès refusé Web repensées.
- Profil mobile commun citoyen/agent structuré autour de l'identité, des habilitations, du changement d'espace et de la déconnexion.
- Liste et détail Mobile des signalements migrés vers les tokens communs pour poursuivre la cohérence du parcours citoyen.
- Centre de navigation Web : contexte du module dans l'en-tête et déconnexion disponible également sur les petits écrans.
- Pages Web de comptes, qualification, dossiers, affectation, interventions, référentiels et vérification migrées vers les tokens de marque partagés ; champs et tableaux harmonisés.
- File de qualification Web repensée comme espace de travail : synthèse de file, recherche sur la page, statuts lisibles et accès direct à l’examen.
- Détail qualification Web : contexte, localisation, photos et historique regroupés à gauche ; choix de décision et champs progressifs dans un panneau dédié.
- Liste des dossiers Web : création clarifiée avec aperçu du signalement source, recherche sur la page, filtre d’état et cartes de suivi.
- Détail dossier Web : contenus, signalements associés, localisation et priorité hiérarchisés ; paramètres avancés repliés tant qu’ils ne sont pas nécessaires.
- Affectations Web : création guidée contenu → équipe éligible → enregistrement, aperçu du contenu sélectionné, synthèse des décisions, recherche locale sur la page et réaffectation plus lisible.
- Interventions Web : synthèse de l’équipe sélectionnée, compteurs par prochaine action, recherche locale des missions et statuts sémantiques ; les formulaires de preuve et de compte rendu restent réservés à l’auteur de l’intervention.
- Inventaire complet des routes Web/Mobile, avec écrans de repli et composants transverses, maintenu dans `docs/product/inventaire-ecrans-refonte-ux-ui.md`.
- Onglet Carte mobile agent : affectations réelles regroupées par équipe, filtrage par état, accès au détail et ouverture de l’itinéraire ; les missions sans coordonnées sont isolées au lieu de recevoir une position fictive.

### Points explicitement non terminés

- Le fichier graphique natif `apps/mobile/assets/splash.png` n'a pas encore été redessiné. Seuls sa configuration et les couleurs d'environnement ont été harmonisés. Le visuel final doit être conçu pour les ratios Android/iOS puis testé sur appareils réels.
- Le logo mobile embarqué et les déclinaisons d'icônes d'application doivent encore être validés comme un ensemble de marque complet.
- La refonte écran par écran des modules Web de comptes et référentiels reste à poursuivre malgré l'harmonisation initiale des tokens, formulaires et tableaux. Les écrans de qualification, dossiers, affectations et interventions disposent maintenant d'une première reprise structurelle, à compléter par la recette et les itérations visuelles.
- La fiche de mission est maintenant séparée de la file de travail. Une prochaine itération pourra encore approfondir le découpage visuel interne entre exécution, preuves et compte rendu, sans modifier le cycle métier.
- La carte native interactive mobile n’est pas encore intégrée : l’onglet Carte fournit pour l’instant une vue géolocalisée exploitable avec ouverture d’itinéraire, et indique explicitement cette limite.
- La carte Web utilise maintenant un regroupement visuel des marqueurs proches ; les règles avancées de densité à l’échelle territoriale et la représentation des secteurs restent à concevoir.
- Les états hors connexion et les brouillons locaux restent hors de cette livraison.
- La recette visuelle et l'accessibilité doivent encore être vérifiées sur navigateur, formats mobiles courants et appareils Android/iOS réels. Les vérifications de type et de build ne remplacent pas cette recette.

Cette livraison établit une direction de conception et améliore quelques parcours critiques. Elle ne remplace pas une recette UX complète écran par écran.
