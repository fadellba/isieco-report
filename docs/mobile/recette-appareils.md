# Recette mobile sur appareils réels

## Objectif

Vérifier le comportement de l'application ISI-Eco Report sur des appareils physiques Android et iOS avant toute distribution de release. La CI compile l'application, mais ne remplace pas les tests des permissions natives, de la caméra, de la galerie, du réseau mobile ou des liens privés.

Cette recette doit être exécutée sur un environnement de test/staging, avec des comptes et des données fictifs. Ne pas utiliser de données personnelles réelles. Ne pas lancer cette recette sur la production.

## Préparation

- Installer une build issue du commit candidat exact ; noter son SHA et son numéro de version.
- Vérifier que `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` ciblent l'environnement de test.
- Confirmer que l'API de test pointe vers un bucket Supabase Storage privé et que `MEDIA_RETENTION_DAYS` est défini selon une politique approuvée.
- Préparer un compte Citoyen, un compte Agent terrain membre actif d'une équipe de test, et un compte distinct non autorisé.
- Préparer un signalement de test, une affectation ouverte et une intervention que l'agent de test peut démarrer.
- Activer la connectivité réseau, puis prévoir un second passage avec réseau interrompu ou instable.
- Sur chaque appareil, noter le modèle, la version du système, la version de l'application et le commit testé.

Ne pas activer le déploiement de production pour exécuter cette recette.

## Matrice minimale

Exécuter tous les cas sur au moins un appareil Android physique et un appareil iOS physique. Les émulateurs/simulateurs peuvent compléter la recette, mais ne remplacent pas cette matrice.

| ID | Parcours | Vérification | Résultat attendu |
|---|---|---|---|
| MOB-01 | Installation | Installer, démarrer et ouvrir une session | L'application démarre sans crash et le profil métier correspondant au compte est chargé. |
| MOB-02 | Rôles | Ouvrir l'application avec un compte Citoyen, puis un compte Agent | Chaque compte ne voit que son espace et les actions autorisées. |
| CIT-01 | Photo initiale obligatoire | Envoyer le formulaire sans photo, puis avec une photo valide | Sans photo, le formulaire/API refuse le dépôt ; avec une photo JPEG/PNG/WebP valide, le signalement est créé. Cette règle correspond à la migration `20261118190000_require_report_photo`. |
| CIT-02 | Capture de plusieurs photos | Capturer successivement plusieurs images pour un même signalement | Jusqu'à trois photos peuvent être ajoutées, prévisualisées et retirées individuellement avant l'envoi ; vérifier le comportement de la caméra après chaque capture. |
| CIT-03 | Sélection multiple depuis la galerie | Sélectionner plusieurs images en un seul passage | Toutes les images sélectionnées dans la limite autorisée apparaissent dans la prévisualisation et sont transmises ; le comportement actuel limité à `pickMobilePhotos(1)` doit être corrigé. |
| CIT-04 | Limite globale de photos | Combiner caméra et galerie puis dépasser trois images | La limite de trois photos par signalement est respectée sur l'ensemble des sources, sans contourner le quota par sélection successive. |
| CIT-05 | Permissions caméra/galerie | Refuser puis accorder les permissions ; reprendre le parcours | Le refus est géré sans crash et avec une explication ; après accord, la capture et la sélection fonctionnent. Le signalement ne peut toutefois pas être soumis sans sa photo initiale. |
| CIT-06 | Multipart et soumission | Envoyer le signalement avec une photo puis avec plusieurs photos ; vérifier la requête et la réponse | Aucune erreur `UnsupportedFormData` ; le runtime construit un multipart valide, l'API reçoit les fichiers et l'écran confirme le résultat. Le Content-Type et sa frontière sont générés par le runtime, pas codés en dur. |
| CIT-07 | Échec partiel / reprise d'envoi | Interrompre le réseau pendant la soumission ou l'ajout d'une photo supplémentaire | L'utilisateur voit quelles photos sont envoyées/échouées ; une reprise ne duplique ni le signalement ni les médias déjà persistés et ne perd pas les métadonnées. |
| CIT-08 | Confidentialité média | Ouvrir le même signalement avec un autre compte | Un compte non propriétaire ne peut ni consulter les métadonnées privées ni obtenir une URL signée. |
| CIT-09 | Bottom navigation — Suivi | Depuis Accueil, Formulaire, Détail et Profil, appuyer sur l'onglet Suivi | La navigation ouvre toujours `/(citizen)/reports` (liste) ; seul le bouton Signaler ouvre `/(citizen)/reports/new`. Vérifier l'onglet actif et le retour arrière. |
| CIT-10 | Accueil citoyen | Ouvrir l'accueil avec zéro, un et plusieurs signalements, avec/sans carte de proximité et synchronisation en attente | La hiérarchie reste claire : action principale, suivi de l'utilisateur et informations secondaires ; aucun compteur ne présente un échantillon de cinq éléments comme total global. |
| CIT-11 | Modification du profil | Modifier nom, prénom et téléphone, sauvegarder, quitter puis rouvrir le profil | Les valeurs sont validées, persistées via `PATCH /accounts/me` et rechargées. L'e-mail et les rôles restent en lecture seule. |
| AGT-01 | Mission | Ouvrir une mission affectée à l'équipe du compte Agent | L'Agent voit les affectations et interventions autorisées uniquement. |
| AGT-02 | Preuve photo | Démarrer une intervention, joindre une photo avec un contexte valide | La preuve est ajoutée à l'intervention par l'API ; le contexte est accepté dans la plage métier. |
| AGT-03 | Autorisation | Essayer d'ajouter une preuve avec un compte non auteur ou non membre | L'API refuse l'opération ; aucune photo n'est rendue accessible à ce compte. |
| AGT-04 | État métier | Tenter l'ajout de preuve après soumission du compte rendu | L'API refuse une modification qui n'est plus autorisée. |
| GEO-01 | Permission localisation | Déclencher la localisation par action explicite et accorder la permission | Une position ponctuelle est récupérée et affichée avec sa précision estimée. |
| GEO-02 | Refus localisation | Refuser la permission puis refaire un signalement | Le formulaire reste utilisable et la saisie manuelle des coordonnées reste possible. |
| GEO-03 | Portée localisation | Examiner les permissions système et le comportement au repos | Aucune permission de localisation en arrière-plan n'est demandée ; aucun relevé n'est déclenché sans action de l'utilisateur. |
| SEC-01 | URL signée | Consulter une photo, attendre plus de 60 secondes, puis réouvrir l'écran du signalement | L'ancien lien n'est plus utilisable ; à la réouverture, le client récupère un nouveau lien signé au lieu de réutiliser le lien expiré. |
| SEC-02 | Types et tailles | Envoyer une image permise et tenter un fichier invalide ou trop volumineux | L'API accepte les images valides, refuse le contenu non-image ou au-delà de 10 MiB et ne révèle aucun chemin Storage. |

## Contrôles complémentaires

Vérifier également les situations suivantes sur les deux plateformes :

- permission de galerie refusée, permission limitée lorsque le système la propose, puis changement du choix dans les réglages ;
- annulation du sélecteur, annulation de la caméra et retour arrière pendant une action ;
- passage Wi-Fi vers données mobiles pendant le dépôt ;
- perte de session ou expiration du jeton pendant une consultation ;
- absence de fuite de clé privilégiée, de chemin Storage, d'URL signée dans les logs et de données personnelles dans les messages d'erreur ;
- comportement après fermeture forcée puis redémarrage de l'application ;
- navigation Suivi depuis chaque route citoyenne et absence de redirection involontaire vers le formulaire ;
- persistance du profil après modification et nouvelle authentification ;
- envoi multipart sur Android et iOS, sans journaliser les contenus de fichiers ou URLs signées.

## Critères d'acceptation

La recette est acceptée seulement si :

1. tous les cas de la matrice sont exécutés sur Android et iOS ;
2. aucun défaut bloquant ou critique n'est ouvert ;
3. les refus de permissions ne bloquent pas les parcours alternatifs prévus ;
4. les contrôles d'autorisation sont appliqués par l'API, y compris sur les accès inter-comptes ;
5. les photos sont stockées dans le bucket privé et consultées uniquement via des URLs signées à courte durée ;
6. les preuves et journaux de recette ne contiennent aucune donnée personnelle réelle ;
7. les cas de navigation, d'envoi multipart, de sélection multi-photos et de mise à jour du profil sont exécutés et associés à un SHA précis.

Un cas non exécuté doit être marqué **Non testé**, et non **Réussi**. Toute anomalie doit être liée à une issue GitHub avec les étapes de reproduction, le système, le modèle d'appareil, le SHA testé et des éléments de preuve expurgés.

## Fiche de résultat

Copier cette fiche pour chaque appareil :

| Champ | Valeur |
|---|---|
| Date et heure UTC | À renseigner |
| Plateforme / version OS | À renseigner |
| Modèle d'appareil | À renseigner |
| Version app / commit SHA | À renseigner |
| Environnement API | Test / staging |
| Réseau | Wi-Fi / mobile / instable |
| Cas exécutés | IDs MOB / CIT / AGT / GEO / SEC |
| Résultat global | Réussi / Échoué / Partiel |
| Issues GitHub | Numéros ou « aucune » |
| Testeur | À renseigner |

Ne pas publier de captures montrant des identités, coordonnées réelles, jetons, URL signées actives ou informations de compte.
