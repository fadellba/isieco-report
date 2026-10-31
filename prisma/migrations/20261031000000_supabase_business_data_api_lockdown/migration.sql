-- The business database is accessed only through the trusted NestJS API.
-- Supabase Data API roles must not receive direct access to these tables.
-- RLS is enabled as defense in depth; the API's trusted PostgreSQL role owns
-- the tables and retains the access required by Prisma.

DO $migration$
DECLARE
  business_tables TEXT[] := ARRAY[
    'utilisateur',
    'role',
    'utilisateur_role',
    'preferences_visibilite_citoyen',
    'badge',
    'badge_utilisateur',
    'historique_points',
    'notification',
    'type_dechet',
    'equipe',
    'appartenance_equipe',
    'competence_equipe',
    'region',
    'departement',
    'commune',
    'delegation_decision_equipe',
    'disponibilite_equipe',
    'historique_disponibilite_equipe',
    'signalement',
    'photo_signalement',
    'contenu_signalement',
    'demande_complement',
    'reponse_complement',
    'qualification_signalement',
    'idempotence_signalement',
    'dossier_traitement',
    'rattachement_signalement',
    'contenu_dossier',
    'provenance_contenu_dossier',
    'affectation',
    'intervention',
    'photo_intervention',
    'verification_resolution',
    'historique_localisation_dossier',
    'historique_priorite_dossier',
    'evenement_metier',
    'publication_flux',
    'photo_publication'
  ];
  api_roles TEXT[] := ARRAY['anon', 'authenticated', 'service_role'];
  table_name TEXT;
  grantee TEXT;
BEGIN
  FOREACH table_name IN ARRAY business_tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      table_name
    );

    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC',
      table_name
    );

    FOREACH grantee IN ARRAY api_roles LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
        EXECUTE format(
          'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
          table_name,
          grantee
        );
      END IF;
    END LOOP;
  END LOOP;

  -- Remove Supabase's default API grants for objects created later by the
  -- migration owner. Future exposure must be an explicit reviewed decision.
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC',
    current_user
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC',
    current_user
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
    current_user
  );

  FOREACH grantee IN ARRAY api_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
        current_user,
        grantee
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
        current_user,
        grantee
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I',
        current_user,
        grantee
      );
    END IF;
  END LOOP;
END
$migration$;
