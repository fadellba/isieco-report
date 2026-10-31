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
| CIT-01 | Signalement sans photo | Créer un signalement sans média | Le dépôt reste possible sans permission caméra ou galerie. |
| CIT-02 | Galerie | Ajouter une, puis trois photos au signalement | Les images sont sélectionnées et normalisées ; l'interface ne permet pas de dépasser trois photos. |
| CIT-03 | Limite galerie | Tenter de sélectionner plus de trois photos | La limite de trois est respectée sans bloquer les autres champs du formulaire. |
| CIT-04 | Caméra | Refuser puis accorder la permission caméra ; prendre une photo | Le refus est géré sans crash ; après accord, une photo peut être prise et jointe. |
| CIT-05 | Upload | Déposer un signalement avec photos et ouvrir son détail | L'upload aboutit ; les photos autorisées sont visibles via URL signée obtenue à la demande. |
| CIT-06 | Reprise upload | Interrompre le réseau pendant l'upload puis rétablir le réseau | L'échec est signalé clairement ; l'utilisateur peut reprendre l'envoi sans dupliquer le signalement. |
| CIT-07 | Confidentialité | Ouvrir le même signalement avec un autre compte | Un compte non propriétaire ne peut ni consulter les métadonnées privées ni obtenir une URL signée. |
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
- comportement après fermeture forcée puis redémarrage de l'application.

## Critères d'acceptation

La recette est acceptée seulement si :

1. tous les cas de la matrice sont exécutés sur Android et iOS ;
2. aucun défaut bloquant ou critique n'est ouvert ;
3. les refus de permissions ne bloquent pas les parcours alternatifs prévus ;
4. les contrôles d'autorisation sont appliqués par l'API, y compris sur les accès inter-comptes ;
5. les photos sont stockées dans le bucket privé et consultées uniquement via des URLs signées à courte durée ;
6. les preuves et journaux de recette ne contiennent aucune donnée personnelle réelle.

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
