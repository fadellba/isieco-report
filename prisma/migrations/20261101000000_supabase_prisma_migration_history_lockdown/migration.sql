-- Prisma Migrate creates this metadata table before applying the first
-- committed migration. Keep it outside the Supabase Data API just like the
-- business tables: only the trusted PostgreSQL migration/runtime owner needs it.

ALTER TABLE public."_prisma_migrations"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public."_prisma_migrations"
  FROM PUBLIC;

DO $migration$
DECLARE
  api_roles TEXT[] := ARRAY['anon', 'authenticated', 'service_role'];
  grantee TEXT;
BEGIN
  FOREACH grantee IN ARRAY api_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM %I',
        grantee
      );
    END IF;
  END LOOP;
END
$migration$;
