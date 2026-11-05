#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
: "\${LEGACY_DATABASE_URL:?LEGACY_DATABASE_URL must point to a disposable, empty PostgreSQL database}"

PSQL=(psql "$LEGACY_DATABASE_URL" --no-psqlrc --set ON_ERROR_STOP=1 --quiet)

echo "Preparing PostgreSQL roles and Prisma migration metadata for the legacy replay."
"\${PSQL[@]}" <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$roles$;

CREATE TABLE public."_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
SQL

migrations=(
  20261030020000_accounts_and_roles
  20261030230000_mld_v213_domain_models
  20261030231500_mld_v213_integrity_constraints
  20261030233000_geographic_audit_targets
  20261031000000_supabase_business_data_api_lockdown
  20261101000000_supabase_prisma_migration_history_lockdown
)

for migration in "\${migrations[@]}"; do
  sql_file="$ROOT_DIR/prisma/migrations/$migration/migration.sql"
  if [[ ! -s "$sql_file" ]]; then
    echo "Missing legacy migration: $sql_file" >&2
    exit 1
  fi
  echo "Replaying $migration"
  "\${PSQL[@]}" --file "$sql_file"
done

echo "Seeding representative legacy business data."
"\${PSQL[@]}" --file "$ROOT_DIR/scripts/fixtures/simplified-domain-legacy-seed.sql"

echo "Applying the simplified-domain migration to populated legacy data."
"\${PSQL[@]}" --file "$ROOT_DIR/prisma/migrations/20261105000000_simplified_domain_model/migration.sql"

echo "Checking preservation and transformation invariants."
"\${PSQL[@]}" --file "$ROOT_DIR/scripts/fixtures/simplified-domain-migration-assertions.sql"

echo "Legacy-to-simplified migration rehearsal passed."
