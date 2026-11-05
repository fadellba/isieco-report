-- Assertions after the simplified-domain migration has been applied.
DO $assertions$
DECLARE
  v_count BIGINT;
  v_text TEXT;
BEGIN
  SELECT id_dossier::text INTO v_text
  FROM public.signalement
  WHERE id_signalement = '00000000-0000-4000-8000-000000000011';
  IF v_text IS DISTINCT FROM '00000000-0000-4000-8000-000000000022' THEN
    RAISE EXCEPTION 'The active signalement attachment was not migrated to id_dossier: %', v_text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.signalement
    WHERE id_signalement = '00000000-0000-4000-8000-000000000011'
      AND cle_idempotence = 'fixture-report-key'
      AND empreinte_requete = 'sha256:fixture-report-payload'
  ) THEN
    RAISE EXCEPTION 'Signalement idempotency data was not preserved.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contenu_signalement
    WHERE id_signalement = '00000000-0000-4000-8000-000000000011'
      AND id_type_dechet = '00000000-0000-4000-8000-000000000031'
      AND quantite_estimee = 12.500
      AND volume_estime = 4.200
      AND remarque = 'Qualification la plus recente'
      AND etat_qualification = 'CONFIRME'
      AND qualifie_par = '00000000-0000-4000-8000-000000000002'
      AND date_qualification = '2026-11-04'
  ) THEN
    RAISE EXCEPTION 'The latest qualification was not merged into ContenuSignalement.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contenu_signalement
    WHERE id_signalement = '00000000-0000-4000-8000-000000000012'
      AND id_type_dechet = '00000000-0000-4000-8000-000000000031'
      AND quantite_estimee = 1.250
      AND volume_estime = 0.500
      AND remarque = 'Qualification sans contenu initial'
      AND etat_qualification = 'CONFIRME'
  ) THEN
    RAISE EXCEPTION 'A qualification without a declared content row was not inserted.';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.contenu_signalement
  WHERE id_signalement = '00000000-0000-4000-8000-000000000011';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected one merged report content, found %.', v_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contenu_dossier c
    JOIN public.affectation a ON a.id_contenu_dossier = c.id_contenu_dossier
    WHERE c.id_dossier = '00000000-0000-4000-8000-000000000022'
      AND c.id_type_dechet = '00000000-0000-4000-8000-000000000031'
      AND a.id_affectation = '00000000-0000-4000-8000-000000000091'
  ) THEN
    RAISE EXCEPTION 'ContenuDossier identifier or Affectation relation was not preserved.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.demande_complement
    WHERE id_demande = '00000000-0000-4000-8000-000000000131'
      AND reponse = 'La quantité est estimée à 12,5 kg.'
      AND repondu_par = '00000000-0000-4000-8000-000000000001'
      AND date_reponse = '2026-11-03'
  ) THEN
    RAISE EXCEPTION 'Supplement response was not merged into DemandeComplement.';
  END IF;

  SELECT count(*) INTO v_count FROM public.verification
  WHERE id_intervention IS NOT NULL;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Expected two verifications linked to interventions, found %.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.verification
  WHERE id_intervention IS NULL;
  IF v_count <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.verification
    WHERE id_verification = '00000000-0000-4000-8000-000000000123'
      AND id_intervention IS NULL
  ) THEN
    RAISE EXCEPTION 'The legacy verification without a matching intervention was not kept nullable.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.verification
    WHERE id_verification = '00000000-0000-4000-8000-000000000121'
      AND id_intervention = '00000000-0000-4000-8000-000000000101'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.verification
    WHERE id_verification = '00000000-0000-4000-8000-000000000122'
      AND id_intervention = '00000000-0000-4000-8000-000000000102'
  ) THEN
    RAISE EXCEPTION 'Verification-to-Intervention chronological mapping is incorrect.';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.historique_statut_signalement
  WHERE id_signalement = '00000000-0000-4000-8000-000000000011';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Expected two status history records and no photo event, found %.', v_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.historique_statut_signalement
    WHERE id_signalement = '00000000-0000-4000-8000-000000000011'
      AND ancien_statut IS NULL
      AND nouveau_statut = 'SOUMIS'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.historique_statut_signalement
    WHERE id_signalement = '00000000-0000-4000-8000-000000000011'
      AND ancien_statut = 'SOUMIS'
      AND nouveau_statut = 'EN_COURS'
  ) THEN
    RAISE EXCEPTION 'Signalement status transition mapping is incomplete.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.historique_statut_signalement
    WHERE motif = 'Ajout photo sans changement de statut'
  ) THEN
    RAISE EXCEPTION 'A photo event was incorrectly migrated as a status transition.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.type_dechet
    WHERE id_type_dechet = '00000000-0000-4000-8000-000000000031' AND actif = TRUE
  ) OR NOT EXISTS (
    SELECT 1 FROM public.type_dechet
    WHERE id_type_dechet = '00000000-0000-4000-8000-000000000032' AND actif = FALSE
  ) THEN
    RAISE EXCEPTION 'TypeDechet validity was not reduced to the expected actif flag.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.competence_equipe
    WHERE id_competence_equipe = '00000000-0000-4000-8000-000000000051'
      AND actif = TRUE AND date_attribution = '2026-01-01'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.competence_equipe
    WHERE id_competence_equipe = '00000000-0000-4000-8000-000000000052'
      AND actif = FALSE AND date_attribution = '2020-01-01'
  ) THEN
    RAISE EXCEPTION 'CompetenceEquipe validity was not reduced correctly.';
  END IF;

  IF to_regclass('public.idempotence_signalement') IS NOT NULL
     OR to_regclass('public.rattachement_signalement') IS NOT NULL
     OR to_regclass('public.evenement_metier') IS NOT NULL
     OR to_regclass('public.qualification_signalement') IS NOT NULL
     OR to_regclass('public.reponse_complement') IS NOT NULL
     OR to_regclass('public.verification_resolution') IS NOT NULL THEN
    RAISE EXCEPTION 'A legacy table remains after the simplified migration.';
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name <> '_prisma_migrations';
  IF v_count <> 18 THEN
    RAISE EXCEPTION 'Expected 18 business tables after migration, found %.', v_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public._prisma_migrations'::regclass AND relrowsecurity = TRUE
  ) THEN
    RAISE EXCEPTION 'Prisma migration history RLS was unexpectedly disabled.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on every business table.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND (
        has_table_privilege('anon', c.oid, 'SELECT')
        OR has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE')
        OR has_table_privilege('anon', c.oid, 'DELETE')
        OR has_table_privilege('authenticated', c.oid, 'SELECT')
        OR has_table_privilege('authenticated', c.oid, 'INSERT')
        OR has_table_privilege('authenticated', c.oid, 'UPDATE')
        OR has_table_privilege('authenticated', c.oid, 'DELETE')
        OR has_table_privilege('service_role', c.oid, 'SELECT')
        OR has_table_privilege('service_role', c.oid, 'INSERT')
        OR has_table_privilege('service_role', c.oid, 'UPDATE')
        OR has_table_privilege('service_role', c.oid, 'DELETE')
      )
  ) THEN
    RAISE EXCEPTION 'A Supabase Data API role has direct table privileges in public.';
  END IF;

  SELECT count(*) INTO v_count FROM public.photo_signalement;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected one preserved report photo, found %.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.photo_intervention;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected one preserved intervention photo, found %.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.appartenance_equipe;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected one preserved team membership, found %.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.affectation;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Expected two preserved assignments, found %.', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.intervention;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Expected two preserved interventions, found %.', v_count;
  END IF;
END
$assertions$;

SELECT 'Migration assertions passed' AS result;
