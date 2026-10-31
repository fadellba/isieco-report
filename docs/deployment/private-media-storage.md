# Stockage privé des médias

La phase Média utilise deux buckets privés Supabase Storage : `report-private` et `intervention-private`.

## Configuration

Les valeurs par défaut sont :
- `SUPABASE_REPORTS_BUCKET=report-private`
- `SUPABASE_INTERVENTIONS_BUCKET=intervention-private`
- `MEDIA_RETENTION_DAYS=365`

Les deux buckets sont limités à JPEG, PNG et WebP et à 10 Mo par fichier. Le serveur contrôle aussi la signature binaire, pas seulement le nom ou le type MIME fourni par le client. Le nom d’objet est généré côté API sous la forme `<resource-uuid>/<photo-uuid>.<extension>`.

## Politique d’accès

Appliquer `supabase/setup/private-storage.sql` au projet Supabase cible avec un rôle administrateur de base de données avant d’activer ces routes. Le script crée ou met à jour les buckets en mode privé et installe les politiques RLS sur `storage.objects`.

Les uploads, suppressions compensatoires et créations d’URL signées passent par le SDK Supabase avec le JWT de l’utilisateur courant et la clé publique anon/publishable. Aucun secret `service_role` n’est utilisé ni exposé. Les règles contrôlent propriétaire du signalement, auteur de l’intervention, appartenance d’équipe active et habilitation du vérificateur. L’API refait les mêmes contrôles métier.

Les URL signées ont une durée de vie de 120 secondes. La réponse API ne retourne jamais la clé de stockage brute. Les objets ne sont pas publiés automatiquement : `etat_publication=NON_PUBLIEE`, aucune référence publique et aucun floutage déclaré. Une publication ultérieure devra passer par un processus d’approbation distinct.

## Rétention et limites

La rétention initiale par défaut est de 365 jours, configurable entre 30 et 3650 jours. Le champ `date_expiration` est stocké en base ; une politique de purge planifiée doit supprimer les objets expirés puis appliquer `media_purge_at`. Ce job de purge n’est pas automatisé dans cette phase.

Maximum : 5 photos par signalement et 10 par intervention. Contexte de photo d’intervention : `AVANT`, `PENDANT`, `APRES`. Les uploads de signalement sont autorisés tant que le signalement est `SOUMIS`, `EN_ATTENTE_COMPLEMENT` ou `COMPLEMENT_REPONDU`. Les preuves d’intervention ne peuvent être ajoutées qu’avant soumission du compte rendu.

## Application au projet

Les valeurs de bucket configurables dans l’environnement doivent rester identiques aux identifiants utilisés dans le SQL RLS. Si les noms de buckets sont modifiés, il faut modifier et réappliquer le SQL en conséquence. Le script n’a pas été appliqué à un projet Supabase dans le cadre de ce changement : l’application et les politiques doivent être déployées dans le projet d’environnement après revue.

## Contrôles recommandés après application

1. Tester avec deux comptes : propriétaire du signalement et autre citoyen.
2. Tester un membre d’équipe actif et un utilisateur hors équipe sur une preuve d’intervention.
3. Tester un vérificateur sur une intervention soumise et un rôle sans habilitation.
4. Tenter un accès direct aux objets d’un bucket par URL publique : aucun objet ne doit être lisible sans URL signée.
5. Vérifier qu’une URL signée cesse de fonctionner après 120 secondes et que les objets expirés ne sont plus servis par l’API.
