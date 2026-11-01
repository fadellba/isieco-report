-- Prisma Migrate creates this metadata table before applying the first
-- committed migration. Keep it outside the Supabase Data API just like the
-- business tables: only the trusted PostgreSQL migration/runtime owner needs it.
--
-- The table is absent when Prisma replays migrations into a shadow database
-- for migrate diff, so guard the hardening statements for that execution path.

DO $migration$
DECLARE
  api_roles TEXT[] := ARRAY['anon', 'authenticated', 'service_role'];
  grantee TEXT;
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM PUBLIC';

    FOREACH grantee IN ARRAY api_roles LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
        EXECUTE format(
          'REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM %I',
          grantee
        );
      END IF;
    END LOOP;
  END IF;
END
$migration$;
