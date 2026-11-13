-- Give business audit events a stable tie-breaker for rows written in one transaction.
-- Existing equal-timestamp rows receive stable sequence values during migration;
-- their original causal order cannot be reconstructed from transaction-stable timestamps alone.
ALTER TABLE audit.evenement_metier
  ADD COLUMN event_sequence BIGINT GENERATED ALWAYS AS IDENTITY
    (SEQUENCE NAME audit.evenement_metier_event_sequence_seq);

ALTER TABLE audit.evenement_metier
  ADD CONSTRAINT evenement_metier_event_sequence_key UNIQUE (event_sequence);

-- Use statement-time wall clock values for new events. event_sequence remains the
-- authoritative tie-breaker when two events still share a timestamp.
ALTER TABLE audit.evenement_metier
  ALTER COLUMN occurred_at SET DEFAULT clock_timestamp();

DROP INDEX audit.evenement_metier_case_timeline_idx;
CREATE INDEX evenement_metier_case_timeline_idx
  ON audit.evenement_metier (dossier_id, occurred_at DESC, event_sequence DESC);

COMMENT ON COLUMN audit.evenement_metier.event_sequence IS
  'Monotonic insertion order used to break ties between business events with identical server timestamps.';

-- The API uses the trusted PostgreSQL owner connection. The Supabase Data API
-- roles must not be able to consume or manipulate the audit sequence directly.
REVOKE ALL PRIVILEGES ON SEQUENCE audit.evenement_metier_event_sequence_seq FROM PUBLIC;

DO $lockdown$
DECLARE
  grantee TEXT;
BEGIN
  FOREACH grantee IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON SEQUENCE audit.evenement_metier_event_sequence_seq FROM %I',
        grantee
      );
    END IF;
  END LOOP;
END
$lockdown$;
